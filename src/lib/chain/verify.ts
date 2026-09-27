import { createServerFn } from "@tanstack/react-start";
import { MIN_TRADES, OPEN_AT, SWAP_MIN_USDC } from "@/lib/arena";
import {
  CLASSIFIER_VERSION,
  classifyTx,
  flagRoundTrips,
  isSolanaAddress,
  summarize,
  type ClassifiedTx,
  type WalletReport,
} from "./classify.ts";

export type VerifyResult = {
  report: WalletReport;
  gateMet: boolean;
  /** Arena-venue transactions only, newest first. */
  txs: ClassifiedTx[];
  /** Signatures in the window not yet fetched — run the lookup again. */
  pending: number;
  rpc: "custom" | "helius" | "public";
  solUsd: number | null;
  cached: boolean;
  checkedAt: string;
};

export type LeaderRow = {
  wallet: string;
  qualifying: number;
  notionalUsd: number;
  venues: string[];
  refreshedAt: string;
};

/**
 * Transactions fetched per request, so a cold wallet never outruns the
 * function time limit. Measured: 60 on the public RPC took ~100 s (it
 * rate-limits to ~2 concurrent); a keyed RPC clears 80 in a few seconds.
 */
const FETCH_CAP = { public: 20, helius: 80, custom: 80 } as const;

export const verifyWallet = createServerFn({ method: "POST" })
  .inputValidator((input: { wallet: string }) => {
    const wallet = String(input?.wallet ?? "").trim();
    if (!isSolanaAddress(wallet)) throw new Error("That is not a Solana address");
    return { wallet };
  })
  .handler(async ({ data }): Promise<VerifyResult> => {
    const { wallet } = data;
    const rpc = await import("./rpc.server.ts");
    const { getSql } = await import("@/lib/db");
    const sinceSec = Math.floor(OPEN_AT.getTime() / 1000);

    const sigs = (await rpc.signaturesSince(wallet, sinceSec)).filter((s) => !s.err);

    // The cache is an optimisation: a database outage degrades to live RPC.
    const known = new Map<string, ClassifiedTx>();
    let sql: Awaited<ReturnType<typeof getSql>> | null = null;
    try {
      sql = await getSql();
      const rows = await sql<{ signature: string; classified: ClassifiedTx }>`
        select signature, classified from arena_tx where wallet = ${wallet}`;
      for (const r of rows) {
        // Rows from an older classifier are ignored and fetched again.
        if (r.classified?.v === CLASSIFIER_VERSION) known.set(r.signature, r.classified);
      }
    } catch (err) {
      console.error("[verify] cache read failed:", err);
      sql = null;
    }

    const missing = sigs.filter((s) => !known.has(s.signature));
    const { label } = rpc.rpcUrl();
    const batch = missing.slice(0, FETCH_CAP[label]);
    const solUsd = batch.length ? await rpc.solUsdNow() : null;

    const fresh = await rpc.mapLimit(batch, label === "public" ? 2 : 8, async (s) => {
      try {
        const tx = await rpc.getTx(s.signature);
        return tx ? classifyTx(tx, wallet, { solUsd, swapMinUsd: SWAP_MIN_USDC }) : null;
      } catch (err) {
        console.error("[verify] getTransaction failed:", s.signature, err);
        return null;
      }
    });

    const fetched = fresh.filter((c): c is ClassifiedTx => c !== null);
    for (const c of fetched) known.set(c.signature, c);

    if (sql && fetched.length) {
      try {
        for (const c of fetched) {
          await sql`
            insert into arena_tx (signature, wallet, slot, block_time, classified)
            values (${c.signature}, ${wallet}, ${c.slot},
                    ${c.blockTime ? new Date(c.blockTime * 1000).toISOString() : null},
                    ${JSON.stringify(c)}::jsonb)
            on conflict (signature) do update
              set classified = excluded.classified, fetched_at = now()`;
        }
      } catch (err) {
        console.error("[verify] cache write failed:", err);
      }
    }

    const inWindow = sigs
      .map((s) => known.get(s.signature))
      .filter((c): c is ClassifiedTx => Boolean(c));
    const flagged = flagRoundTrips(inWindow);
    const report = summarize(wallet, flagged);

    if (sql) {
      try {
        await sql`
          insert into arena_wallet (wallet, report) values (${wallet}, ${JSON.stringify(report)}::jsonb)
          on conflict (wallet) do update
            set report = excluded.report, refreshed_at = now(),
                lookups = arena_wallet.lookups + 1`;
      } catch (err) {
        console.error("[verify] report write failed:", err);
      }
    }

    return {
      report,
      gateMet: report.qualifying >= MIN_TRADES,
      txs: flagged
        .filter((t) => t.venue !== null)
        .sort((a, b) => (b.blockTime ?? 0) - (a.blockTime ?? 0)),
      pending: Math.max(0, missing.length - batch.length),
      rpc: label,
      solUsd,
      cached: batch.length === 0,
      checkedAt: new Date().toISOString(),
    };
  });

export const listVerified = createServerFn({ method: "GET" }).handler(
  async (): Promise<LeaderRow[]> => {
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const rows = await sql<{ wallet: string; report: WalletReport; refreshed_at: string }>`
        select wallet, report, refreshed_at from arena_wallet
        order by (report->>'qualifying')::int desc, (report->>'notionalUsd')::numeric desc
        limit 25`;
      return rows.map((r) => ({
        wallet: r.wallet,
        qualifying: r.report.qualifying,
        notionalUsd: r.report.notionalUsd,
        venues: r.report.venues,
        refreshedAt: new Date(r.refreshed_at).toISOString(),
      }));
    } catch (err) {
      console.error("[verify] leaderboard read failed:", err);
      return [];
    }
  },
);
