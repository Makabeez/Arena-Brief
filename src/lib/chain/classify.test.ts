import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  b58ToHex,
  classifyTx,
  flagRoundTrips,
  isSolanaAddress,
  summarize,
  type ClassifiedTx,
  type RawTx,
} from "./classify.ts";
import { MINTS } from "./programs.ts";

// Real mainnet transactions captured 27 Sep 2026, trimmed to the fields read.
function fixture(name: string): { tx: RawTx; signer: string } {
  const tx = JSON.parse(
    readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), "utf8"),
  ) as RawTx;
  return { tx, signer: tx.transaction.message.accountKeys[0].pubkey };
}

const OPTS = { solUsd: 121.73, swapMinUsd: 20 };

describe("classifyTx on real mainnet transactions", () => {
  it("sizes a Jupiter USDC→token swap from the stable leg", () => {
    const { tx, signer } = fixture("jupiter-usdc-to-token");
    const c = classifyTx(tx, signer, OPTS);
    assert.equal(c.venue, "jupiter");
    assert.equal(c.kind, "swap");
    assert.equal(c.sizeSource, "stable-leg");
    assert.equal(c.sizeUsd, 99.7);
    assert.equal(c.sold, MINTS.usdc);
    assert.equal(c.qualifies, true);
  });

  it("folds wSOL into SOL and sizes a wSOL→USDC swap from the USDC received", () => {
    const { tx, signer } = fixture("jupiter-wsol-to-usdc");
    const c = classifyTx(tx, signer, OPTS);
    assert.equal(c.kind, "swap");
    assert.equal(c.sold, MINTS.wsol);
    assert.equal(c.bought, MINTS.usdc);
    assert.equal(c.sizeUsd, 157.92);
    assert.equal(c.qualifies, true);
  });

  it("prices a SOL→token swap off the SOL leg net of new-account rent", () => {
    const { tx, signer } = fixture("jupiter-sol-to-token");
    const c = classifyTx(tx, signer, OPTS);
    assert.equal(c.sizeSource, "sol-leg");
    assert.ok(c.sizeUsd !== null && c.sizeUsd > 7 && c.sizeUsd < 9, `got ${c.sizeUsd}`);
    assert.equal(c.qualifies, false, "≈8 USD is under the 20 USDC floor");
  });

  it("refuses to guess when a SOL leg has no price", () => {
    const { tx, signer } = fixture("jupiter-sol-to-token");
    const c = classifyTx(tx, signer, { ...OPTS, solUsd: null });
    assert.equal(c.sizeUsd, null);
    assert.equal(c.qualifies, false);
    assert.match(c.reason, /unpriced/);
  });

  it("counts a Phoenix Perps market order at any size", () => {
    const { tx, signer } = fixture("phoenix-market-order");
    const c = classifyTx(tx, signer, OPTS);
    assert.equal(c.venue, "phoenix");
    assert.equal(c.kind, "perp");
    assert.equal(c.qualifies, true);
    assert.match(c.reason, /PlaceMarketOrder/);
  });

  it("does not count Phoenix account setup (RegisterTrader)", () => {
    const { tx, signer } = fixture("phoenix-register-trader");
    const c = classifyTx(tx, signer, OPTS);
    assert.equal(c.venue, "phoenix");
    assert.equal(c.qualifies, false);
    assert.match(c.reason, /RegisterTrader/);
  });

  it("does not count a Phoenix cancel", () => {
    const { tx, signer } = fixture("phoenix-cancel-all");
    const c = classifyTx(tx, signer, OPTS);
    assert.equal(c.qualifies, false);
    assert.match(c.reason, /CancelAll/);
  });

  it("decodes base58 instruction headers", () => {
    assert.equal(b58ToHex("1"), "00");
    assert.equal(b58ToHex("2"), "01");
    assert.equal(b58ToHex("5Q"), "ff");
    assert.equal(b58ToHex("5R"), "0100");
  });

  it("treats a MagicBlock private transfer as a mission, not a trade", () => {
    const { tx, signer } = fixture("magicblock-private-transfer");
    const c = classifyTx(tx, signer, OPTS);
    assert.equal(c.venue, "magicblock");
    assert.equal(c.kind, "private-transfer");
    assert.equal(c.qualifies, false);
  });

  it("does not count Adrena staking as a perp trade", () => {
    const { tx, signer } = fixture("adrena-staking");
    const c = classifyTx(tx, signer, OPTS);
    assert.equal(c.venue, "adrena");
    assert.equal(c.kind, "other");
    assert.equal(c.qualifies, false);
  });

  it("rejects a transaction the wallet did not sign", () => {
    const { tx } = fixture("jupiter-usdc-to-token");
    const c = classifyTx(tx, "11111111111111111111111111111111", OPTS);
    assert.equal(c.qualifies, false);
    assert.match(c.reason, /did not sign/);
  });
});

function swap(sig: string, t: number, sold: string, bought: string, size: number): ClassifiedTx {
  return {
    signature: sig,
    slot: t,
    blockTime: t,
    venue: "jupiter",
    kind: "swap",
    solDelta: 0,
    tokenDeltas: [],
    sizeUsd: size,
    sizeSource: "stable-leg",
    sold,
    bought,
    qualifies: true,
    reason: "Jupiter swap",
    v: 2,
  };
}

describe("flagRoundTrips", () => {
  it("flags the return leg of a fast same-size A→B→A loop", () => {
    const out = flagRoundTrips([
      swap("a1", 1000, MINTS.usdc, MINTS.wsol, 25),
      swap("a2", 1200, MINTS.wsol, MINTS.usdc, 24.9),
    ]);
    assert.equal(out[0].qualifies, true);
    assert.equal(out[1].qualifies, false);
    assert.equal(out[1].roundTripOf, "a1");
  });

  it("leaves a reversal outside the window, or at a different size, alone", () => {
    const out = flagRoundTrips([
      swap("b1", 1000, MINTS.usdc, MINTS.wsol, 25),
      swap("b2", 5000, MINTS.wsol, MINTS.usdc, 25),
      swap("b3", 5100, MINTS.usdc, MINTS.wsol, 60),
    ]);
    assert.ok(out.every((t) => t.qualifies));
  });
});

describe("summarize", () => {
  it("counts qualifying trades, notional and loops", () => {
    const txs = flagRoundTrips([
      swap("c1", 86400 * 10, MINTS.usdc, MINTS.wsol, 30),
      swap("c2", 86400 * 10 + 60, MINTS.wsol, MINTS.usdc, 30),
      swap("c3", 86400 * 11, MINTS.usdc, MINTS.usdt, 40),
    ]);
    const r = summarize("w", txs);
    assert.equal(r.qualifying, 2);
    assert.equal(r.flaggedLoops, 1);
    assert.equal(r.notionalUsd, 70);
    assert.equal(r.largestUsd, 40);
    assert.equal(r.activeDays, 2);
  });
});

describe("isSolanaAddress", () => {
  it("accepts base58 and rejects junk", () => {
    assert.equal(isSolanaAddress(MINTS.usdc), true);
    assert.equal(isSolanaAddress("0xabc"), false);
    assert.equal(isSolanaAddress("O0Il".repeat(10)), false);
  });
});
