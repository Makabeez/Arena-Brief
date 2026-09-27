import { env } from "@/lib/env.server";
import { MINTS } from "./programs.ts";
import type { RawTx } from "./classify.ts";

/**
 * RPC endpoint: SOLANA_RPC_URL wins, then a Helius key, then the public
 * mainnet endpoint (works, but rate-limits hard — set a key in production).
 */
export function rpcUrl(): { url: string; label: "custom" | "helius" | "public" } {
  const custom = env("SOLANA_RPC_URL");
  if (custom) return { url: custom, label: "custom" };
  const helius = env("HELIUS_API_KEY");
  if (helius) return { url: `https://mainnet.helius-rpc.com/?api-key=${helius}`, label: "helius" };
  return { url: "https://api.mainnet-beta.solana.com", label: "public" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call<T>(method: string, params: unknown[], attempt = 0): Promise<T> {
  const { url } = rpcUrl();
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429 && attempt < 4) {
    await sleep(500 * 2 ** attempt);
    return call<T>(method, params, attempt + 1);
  }
  if (!res.ok) throw new Error(`RPC ${method} HTTP ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: { message: string } };
  if (body.error) {
    if (/rate|limit|429/i.test(body.error.message) && attempt < 4) {
      await sleep(500 * 2 ** attempt);
      return call<T>(method, params, attempt + 1);
    }
    throw new Error(`RPC ${method}: ${body.error.message}`);
  }
  return body.result as T;
}

export type SigInfo = { signature: string; slot: number; blockTime: number | null; err: unknown };

/** Newest-first signatures for `wallet`, stopping once older than `sinceSec`. */
export async function signaturesSince(
  wallet: string,
  sinceSec: number,
  max = 400,
): Promise<SigInfo[]> {
  const out: SigInfo[] = [];
  let before: string | undefined;
  while (out.length < max) {
    const page = await call<SigInfo[]>("getSignaturesForAddress", [
      wallet,
      { limit: Math.min(100, max - out.length), ...(before ? { before } : {}) },
    ]);
    if (!page.length) break;
    for (const s of page) {
      if (s.blockTime !== null && s.blockTime < sinceSec) return out;
      out.push(s);
    }
    before = page[page.length - 1].signature;
    if (page.length < 100) break;
  }
  return out;
}

export async function getTx(signature: string): Promise<RawTx | null> {
  return call<RawTx | null>("getTransaction", [
    signature,
    { encoding: "jsonParsed", maxSupportedTransactionVersion: 0, commitment: "finalized" },
  ]);
}

/** Run `fn` over `items` with bounded concurrency, preserving order. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Current SOL/USD from Jupiter's price API. Used only for swaps with no USDC or
 * USDT leg, and the UI says so: it is the price at lookup time, not trade time.
 */
export async function solUsdNow(): Promise<number | null> {
  try {
    const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${MINTS.wsol}`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Record<string, { usdPrice?: number }>;
    const p = body[MINTS.wsol]?.usdPrice;
    return typeof p === "number" && p > 0 ? p : null;
  } catch {
    return null;
  }
}
