import {
  ATA_RENT_SOL,
  MINTS,
  PHOENIX_COLLATERAL_OPS,
  PHOENIX_OPS,
  PHOENIX_ORDER_OPS,
  PHOENIX_PROXY,
  PHOENIX_PROXY_FEE,
  PROGRAMS,
  STABLE_MINTS,
} from "./programs.ts";

/** The subset of a `getTransaction(jsonParsed)` result the classifier reads. */
export type RawTx = {
  blockTime: number | null;
  slot: number;
  meta: {
    err: unknown;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances?: TokenBalance[] | null;
    postTokenBalances?: TokenBalance[] | null;
    logMessages?: string[] | null;
    innerInstructions?: { instructions: Ix[] }[] | null;
  } | null;
  transaction: {
    signatures: string[];
    message: { accountKeys: { pubkey: string; signer: boolean }[]; instructions?: Ix[] };
  };
};

/** A `jsonParsed` instruction; unparsed programs carry base58 `data`. */
type Ix = { programId?: string; data?: string };

type TokenBalance = {
  accountIndex?: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { uiAmountString?: string; uiAmount?: number | null };
};

export type Venue = "jupiter" | "magicblock" | "phoenix" | "adrena";

export type Kind =
  /** Counts toward the five-trade gate when `qualifies` is true. */
  | "swap"
  | "perp"
  /** Visible on-chain and worth showing, never a qualifying trade. */
  | "collateral"
  | "private-transfer"
  | "other";

export type TokenDelta = { mint: string; amount: number };

export type ClassifiedTx = {
  signature: string;
  slot: number;
  blockTime: number | null;
  venue: Venue | null;
  kind: Kind;
  /** Signed deltas for the wallet: SOL excludes the network fee. */
  solDelta: number;
  tokenDeltas: TokenDelta[];
  /** USD size, or null when no stable or SOL leg can price it. */
  sizeUsd: number | null;
  sizeSource: "stable-leg" | "sol-leg" | "none";
  /** Mints that left / entered the wallet (SOL shown as the wSOL mint). */
  sold: string | null;
  bought: string | null;
  qualifies: boolean;
  reason: string;
  /** Set later by `flagRoundTrips`. */
  roundTripOf?: string;
  /** Classifier version that produced this row; older cached rows are re-read. */
  v: number;
};

/**
 * Bump whenever a rule changes so cached classifications are recomputed.
 * v2: Phoenix Perps classified from instruction bytes (setup and cancels no
 * longer count as orders).
 */
export const CLASSIFIER_VERSION = 2;

export type ClassifyOptions = {
  /** SOL/USD used to price swaps with no stable leg. */
  solUsd: number | null;
  swapMinUsd: number;
};

const EPS = 1e-9;

function num(b: TokenBalance): number {
  const s = b.uiTokenAmount.uiAmountString;
  if (s !== undefined) return Number.parseFloat(s);
  return b.uiTokenAmount.uiAmount ?? 0;
}

/** Every program invoked at any depth, read from the runtime's own log lines. */
export function invokedPrograms(tx: RawTx): Set<string> {
  const out = new Set<string>();
  for (const line of tx.meta?.logMessages ?? []) {
    const m = /^Program (\w{32,44}) invoke \[\d+\]$/.exec(line);
    if (m) out.add(m[1]);
  }
  return out;
}

function instructionNames(tx: RawTx): string[] {
  return (tx.meta?.logMessages ?? [])
    .map((l) => /^Program log: Instruction: (\w+)/.exec(l)?.[1])
    .filter((x): x is string => Boolean(x));
}

/** Net token movements for `wallet`, keyed by mint. wSOL is folded into SOL. */
export function walletDeltas(tx: RawTx, wallet: string): { sol: number; tokens: TokenDelta[] } {
  const meta = tx.meta;
  if (!meta) return { sol: 0, tokens: [] };
  const keys = tx.transaction.message.accountKeys;
  const idx = keys.findIndex((k) => k.pubkey === wallet);

  let sol = 0;
  if (idx >= 0 && meta.preBalances[idx] !== undefined && meta.postBalances[idx] !== undefined) {
    sol = (meta.postBalances[idx] - meta.preBalances[idx]) / 1e9;
    if (idx === 0) sol += meta.fee / 1e9; // the fee is not part of the trade
  }

  const byMint = new Map<string, number>();
  const add = (list: TokenBalance[] | null | undefined, sign: 1 | -1) => {
    for (const b of list ?? []) {
      if (b.owner !== wallet) continue;
      byMint.set(b.mint, (byMint.get(b.mint) ?? 0) + sign * num(b));
    }
  };
  add(meta.postTokenBalances, 1);
  add(meta.preTokenBalances, -1);

  const wsol = byMint.get(MINTS.wsol) ?? 0;
  byMint.delete(MINTS.wsol);
  sol += wsol;

  const tokens = [...byMint.entries()]
    .filter(([, amt]) => Math.abs(amt) > EPS)
    .map(([mint, amount]) => ({ mint, amount }));
  return { sol, tokens };
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Base58 → hex. Only instruction headers are needed, so a BigInt is fine. */
export function b58ToHex(s: string): string {
  let n = 0n;
  for (const c of s) {
    const v = B58.indexOf(c);
    if (v < 0) return "";
    n = n * 58n + BigInt(v);
  }
  let hex = n === 0n ? "" : n.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  const lead = s.length - s.replace(/^1+/, "").length;
  return "00".repeat(lead) + hex;
}

function phoenixOpName(hex: string): string {
  const head = hex.slice(0, 16);
  if (head === PHOENIX_PROXY) return phoenixOpName(hex.slice(16));
  if (head === PHOENIX_PROXY_FEE) return phoenixOpName(hex.slice(34));
  return PHOENIX_OPS[head] ?? `unknown:${head}`;
}

/** Names of every Phoenix Perps instruction in the tx, top-level and CPI. */
export function phoenixOps(tx: RawTx): string[] {
  const all: Ix[] = [
    ...(tx.transaction.message.instructions ?? []),
    ...(tx.meta?.innerInstructions ?? []).flatMap((g) => g.instructions),
  ];
  return all
    .filter((ix) => ix.programId === PROGRAMS.phoenixPerps && ix.data)
    .map((ix) => phoenixOpName(b58ToHex(ix.data as string)));
}

function isSigner(tx: RawTx, wallet: string): boolean {
  return tx.transaction.message.accountKeys.some((k) => k.pubkey === wallet && k.signer);
}

export function classifyTx(tx: RawTx, wallet: string, opts: ClassifyOptions): ClassifiedTx {
  const signature = tx.transaction.signatures[0] ?? "";
  const base = {
    signature,
    slot: tx.slot,
    blockTime: tx.blockTime,
    solDelta: 0,
    tokenDeltas: [] as TokenDelta[],
    sizeUsd: null as number | null,
    sizeSource: "none" as ClassifiedTx["sizeSource"],
    sold: null as string | null,
    bought: null as string | null,
    v: CLASSIFIER_VERSION,
  };

  if (tx.meta?.err) {
    return { ...base, venue: null, kind: "other", qualifies: false, reason: "Transaction failed" };
  }
  if (!isSigner(tx, wallet)) {
    return {
      ...base,
      venue: null,
      kind: "other",
      qualifies: false,
      reason: "Wallet did not sign — not executed by this agent",
    };
  }

  const progs = invokedPrograms(tx);
  const { sol, tokens } = walletDeltas(tx, wallet);
  const d = { ...base, solDelta: sol, tokenDeltas: tokens };

  const hasJup = progs.has(PROGRAMS.jupiter) || progs.has(PROGRAMS.jupiterOrderEngine);
  const hasMagic = progs.has(PROGRAMS.magicblockSpl);

  if (hasJup) {
    const size = swapSize(sol, tokens, opts.solUsd);
    const legs = swapLegs(sol, tokens);
    const venue: Venue = hasMagic ? "magicblock" : "jupiter";
    const label = hasMagic ? "MagicBlock private swap" : "Jupiter swap";
    if (!legs.sold || !legs.bought) {
      return {
        ...d,
        ...size,
        ...legs,
        venue,
        kind: "other",
        qualifies: false,
        reason: `${label} route with no two-sided balance change for this wallet`,
      };
    }
    if (size.sizeUsd === null) {
      return {
        ...d,
        ...size,
        ...legs,
        venue,
        kind: "swap",
        qualifies: false,
        reason: `${label} with no USDC, USDT or SOL leg — size unpriced`,
      };
    }
    const ok = size.sizeUsd >= opts.swapMinUsd - EPS;
    return {
      ...d,
      ...size,
      ...legs,
      venue,
      kind: "swap",
      qualifies: ok,
      reason: ok
        ? `${label} ≥ ${opts.swapMinUsd} USDC`
        : `${label} under ${opts.swapMinUsd} USDC`,
    };
  }

  if (hasMagic) {
    return {
      ...d,
      venue: "magicblock",
      kind: "private-transfer",
      qualifies: false,
      reason: "MagicBlock private SPL transfer — mission, not a trade",
    };
  }

  if (progs.has(PROGRAMS.phoenixPerps)) {
    // Phoenix logs no instruction name for most calls and keeps collateral in
    // program accounts, so decode the instruction bytes. Only an order counts:
    // account setup, deposits, cancels and stop placements do not.
    const ops = phoenixOps(tx);
    const order = ops.find((o) => PHOENIX_ORDER_OPS.has(o));
    if (order) {
      return {
        ...d,
        venue: "phoenix",
        kind: "perp",
        qualifies: true,
        reason: `Phoenix Perps ${order} — perps qualify at any size`,
      };
    }
    const collateral = ops.find((o) => PHOENIX_COLLATERAL_OPS.has(o));
    if (collateral) {
      return {
        ...d,
        venue: "phoenix",
        kind: "collateral",
        qualifies: false,
        reason: `Phoenix Perps ${collateral} — collateral, not a trade`,
      };
    }
    return {
      ...d,
      venue: "phoenix",
      kind: "other",
      qualifies: false,
      reason: ops.length
        ? `Phoenix Perps ${ops[0]} — not an order`
        : "Phoenix Perps call with no decodable instruction — not counted",
    };
  }

  if (progs.has(PROGRAMS.adrena)) {
    const names = instructionNames(tx);
    const isPosition = names.some((n) => /Position/i.test(n));
    return {
      ...d,
      venue: "adrena",
      kind: isPosition ? "perp" : "other",
      qualifies: isPosition,
      reason: isPosition
        ? `Adrena ${names.find((n) => /Position/i.test(n))}`
        : `Adrena ${names[0] ?? "call"} — not a position change`,
    };
  }

  return { ...d, venue: null, kind: "other", qualifies: false, reason: "Not an Arena venue" };
}

function swapLegs(sol: number, tokens: TokenDelta[]): { sold: string | null; bought: string | null } {
  const legs: TokenDelta[] = [...tokens];
  // Ignore SOL dust (fees, ATA rent) when a token leg exists on both sides.
  if (Math.abs(sol) > ATA_RENT_SOL * 2) legs.push({ mint: MINTS.wsol, amount: sol });
  const out = legs.filter((l) => l.amount < 0).sort((a, b) => a.amount - b.amount)[0];
  const inn = legs.filter((l) => l.amount > 0).sort((a, b) => b.amount - a.amount)[0];
  return { sold: out?.mint ?? null, bought: inn?.mint ?? null };
}

function swapSize(
  sol: number,
  tokens: TokenDelta[],
  solUsd: number | null,
): { sizeUsd: number | null; sizeSource: ClassifiedTx["sizeSource"] } {
  const stable = tokens.filter((t) => STABLE_MINTS.has(t.mint));
  if (stable.length) {
    const v = Math.max(...stable.map((t) => Math.abs(t.amount)));
    return { sizeUsd: round2(v), sizeSource: "stable-leg" };
  }
  if (solUsd && Math.abs(sol) > ATA_RENT_SOL * 2) {
    // Buying with SOL may also fund a new token account; that rent is not size.
    const traded = sol < 0 ? Math.max(0, Math.abs(sol) - ATA_RENT_SOL) : sol;
    return { sizeUsd: round2(traded * solUsd), sizeSource: "sol-leg" };
  }
  return { sizeUsd: null, sizeSource: "none" };
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * Flag A→B then B→A swaps inside `windowSec` where the second leg returns
 * most of the first. The rules exclude "artificial transaction loops"; this
 * surfaces the pattern so a trader sees it before a judge does. Flagged
 * trades stop counting toward the gate.
 */
export function flagRoundTrips(txs: ClassifiedTx[], windowSec = 600): ClassifiedTx[] {
  const swaps = txs
    .filter((t) => t.kind === "swap" && t.sold && t.bought && t.blockTime)
    .sort((a, b) => (a.blockTime ?? 0) - (b.blockTime ?? 0));
  const flagged = new Map<string, string>();
  for (let i = 0; i < swaps.length; i += 1) {
    const a = swaps[i];
    if (flagged.has(a.signature)) continue;
    for (let j = i + 1; j < swaps.length; j += 1) {
      const b = swaps[j];
      if ((b.blockTime ?? 0) - (a.blockTime ?? 0) > windowSec) break;
      if (flagged.has(b.signature)) continue;
      if (b.sold === a.bought && b.bought === a.sold) {
        const sa = a.sizeUsd ?? 0;
        const sb = b.sizeUsd ?? 0;
        if (sa > 0 && sb > 0 && Math.abs(sa - sb) / Math.max(sa, sb) < 0.1) {
          flagged.set(b.signature, a.signature);
          break;
        }
      }
    }
  }
  return txs.map((t) => {
    const of = flagged.get(t.signature);
    if (!of) return t;
    return {
      ...t,
      qualifies: false,
      roundTripOf: of,
      reason: `Round trip within ${Math.round(windowSec / 60)} min of ${of.slice(0, 8)}… — may count as a loop`,
    };
  });
}

export type WalletReport = {
  wallet: string;
  scanned: number;
  qualifying: number;
  swaps: number;
  perps: number;
  privateTransfers: number;
  flaggedLoops: number;
  notionalUsd: number;
  largestUsd: number;
  venues: Venue[];
  activeDays: number;
  firstAt: number | null;
  lastAt: number | null;
};

export function summarize(wallet: string, txs: ClassifiedTx[]): WalletReport {
  const q = txs.filter((t) => t.qualifies);
  const days = new Set(
    txs
      .filter((t) => t.kind === "swap" || t.kind === "perp")
      .map((t) => (t.blockTime ? new Date(t.blockTime * 1000).toISOString().slice(0, 10) : ""))
      .filter(Boolean),
  );
  const sized = q.map((t) => t.sizeUsd ?? 0);
  const times = q.map((t) => t.blockTime ?? 0).filter(Boolean);
  const venues = [...new Set(txs.map((t) => t.venue).filter((v): v is Venue => v !== null))];
  return {
    wallet,
    scanned: txs.length,
    qualifying: q.length,
    swaps: txs.filter((t) => t.kind === "swap").length,
    perps: txs.filter((t) => t.kind === "perp").length,
    privateTransfers: txs.filter((t) => t.kind === "private-transfer").length,
    flaggedLoops: txs.filter((t) => t.roundTripOf).length,
    notionalUsd: round2(sized.reduce((a, b) => a + b, 0)),
    largestUsd: sized.length ? Math.max(...sized) : 0,
    venues,
    activeDays: days.size,
    firstAt: times.length ? Math.min(...times) : null,
    lastAt: times.length ? Math.max(...times) : null,
  };
}

/** Base58, 32–44 chars — enough to reject junk before hitting RPC. */
export function isSolanaAddress(s: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.trim());
}
