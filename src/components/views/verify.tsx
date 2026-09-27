import { useEffect, useState } from "react";
import { ArrowUpRight, Copy, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_TRADES, PUBLIC_URL, SWAP_MIN_USDC } from "@/lib/arena";
import { isSolanaAddress, type ClassifiedTx } from "@/lib/chain/classify";
import { MINTS } from "@/lib/chain/programs";
import { walletFromUrl } from "@/lib/chain/share";
import { listVerified, verifyWallet, type LeaderRow, type VerifyResult } from "@/lib/chain/verify";
import { useArenaStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const SYMBOL: Record<string, string> = {
  [MINTS.usdc]: "USDC",
  [MINTS.usdt]: "USDT",
  [MINTS.wsol]: "SOL",
};
const sym = (mint: string | null) => (mint ? (SYMBOL[mint] ?? `${mint.slice(0, 4)}…`) : "—");
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
const usd = (n: number | null) =>
  n === null ? "—" : `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const VENUE_LABEL: Record<string, string> = {
  jupiter: "Jupiter",
  magicblock: "MagicBlock",
  phoenix: "Phoenix Perps",
  adrena: "Adrena",
};

export function VerifyView() {
  const agentWallet = useArenaStore((s) => s.agentWallet);
  const setVerified = useArenaStore((s) => s.setVerified);
  const [wallet, setWallet] = useState(() => walletFromUrl() || agentWallet);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");
  const [board, setBoard] = useState<LeaderRow[]>([]);
  const [showAll, setShowAll] = useState(false);

  const isMine = Boolean(result && agentWallet && result.report.wallet === agentWallet);

  async function run(target = wallet) {
    const w = target.trim();
    if (!isSolanaAddress(w)) {
      setError("Paste a Solana wallet address — your Steve agent's wallet, not your X handle.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await verifyWallet({ data: { wallet: w } });
      setResult(r);
      setShowAll(false);
      if (agentWallet === w) setVerified(w, r.report.qualifying, r.checkedAt);
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("wallet", w);
        window.history.replaceState(null, "", url);
      }
      listVerified().then(setBoard, () => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    listVerified().then(setBoard, () => undefined);
    if (wallet && isSolanaAddress(wallet)) void run(wallet);
    // Run once for a share link or a saved agent wallet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function claim() {
    if (!result) return;
    setVerified(result.report.wallet, result.report.qualifying, result.checkedAt);
    toast.success("Saved as your agent wallet — the trades gate now reads from chain");
  }

  function share() {
    if (!result) return;
    const link = `${PUBLIC_URL}/?wallet=${result.report.wallet}`;
    void navigator.clipboard?.writeText(link);
    toast.success("Share link copied");
  }

  const r = result?.report;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-subtle">04 · Verify</p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Check it on chain</h1>
        <p className="max-w-xl text-base leading-relaxed text-muted">
          Paste any Steve agent wallet. The desk reads Solana mainnet since the window opened,
          classifies every Jupiter, MagicBlock, Phoenix Perps and Adrena transaction, and counts
          what qualifies — no sign-in, no self-reporting.
        </p>
      </header>

      <form
        className="flex flex-col gap-3 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <Label htmlFor="wallet">Agent wallet</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="wallet"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="Solana address"
            spellCheck={false}
            autoComplete="off"
            className="font-mono"
          />
          <Button type="submit" disabled={busy} className="sm:w-40">
            {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            {busy ? "Reading chain" : "Verify"}
          </Button>
        </div>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
        {busy ? (
          <p className="font-mono text-xs text-subtle">
            First lookup of a wallet fetches every transaction since 2 Sep. Later lookups are
            served from the cache.
          </p>
        ) : null}
      </form>

      {r && result ? (
        <>
          <section className="flex flex-col gap-5 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-subtle">
                  <span className="normal-case tracking-normal text-muted">{short(r.wallet)}</span>
                  {" · qualifying trades"}
                </p>
                <p className="mt-1 font-display text-5xl tracking-tight tabular-nums">
                  {r.qualifying}
                  <span className="text-subtle">/{MIN_TRADES}</span>
                </p>
              </div>
              <Badge variant={result.gateMet ? "ok" : "warn"}>
                {result.gateMet ? "Trades gate met" : `${MIN_TRADES - r.qualifying} to go`}
              </Badge>
            </div>

            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Notional" value={usd(r.notionalUsd)} />
              <Stat label="Largest" value={usd(r.largestUsd)} />
              <Stat label="Active days" value={String(r.activeDays)} />
              <Stat
                label="Loops flagged"
                value={String(r.flaggedLoops)}
                tone={r.flaggedLoops ? "warn" : undefined}
              />
            </dl>

            <p className="text-sm text-muted">
              Venues seen:{" "}
              {r.venues.length ? r.venues.map((v) => VENUE_LABEL[v] ?? v).join(", ") : "none yet"}
              {r.privateTransfers
                ? ` · ${r.privateTransfers} MagicBlock private transfer${r.privateTransfers > 1 ? "s" : ""}`
                : ""}
            </p>

            <div className="flex flex-wrap gap-3">
              {isMine ? (
                <Badge variant="ok">Your agent wallet</Badge>
              ) : (
                <Button variant="secondary" size="sm" onClick={claim}>
                  This is my agent
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={share}>
                <Copy />
                Copy share link
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void run(r.wallet)} disabled={busy}>
                <RefreshCw />
                Refresh
              </Button>
            </div>

            {result.pending ? (
              <p className="rounded-md bg-warn/10 px-3 py-2 text-sm text-warn">
                {result.pending} older transactions not read yet — press Refresh to continue.
              </p>
            ) : null}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-display text-2xl tracking-tight">Arena transactions</h2>
            {result.txs.length === 0 ? (
              <div className="rounded-xl bg-surface px-5 py-10 text-center shadow-[var(--shadow-border)]">
                <p className="font-display text-2xl tracking-tight">Nothing on Arena venues yet</p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
                  Swaps of at least {SWAP_MIN_USDC} USDC through Jupiter or MagicBlock, or any
                  Phoenix Perps order, will show here once finalized.
                </p>
              </div>
            ) : (
              <>
                <ul className="flex flex-col gap-2">
                  {(showAll ? result.txs : result.txs.slice(0, 25)).map((t) => (
                    <TxRow key={t.signature} tx={t} />
                  ))}
                </ul>
                {result.txs.length > 25 ? (
                  <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Show fewer" : `Show all ${result.txs.length}`}
                  </Button>
                ) : null}
              </>
            )}
          </section>

          <Method result={result} />
        </>
      ) : null}

      {board.length ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl tracking-tight">Recently verified</h2>
          <ul className="flex flex-col divide-y divide-line rounded-xl bg-surface shadow-[var(--shadow-border)]">
            {board.map((row) => (
              <li key={row.wallet}>
                <button
                  type="button"
                  onClick={() => {
                    setWallet(row.wallet);
                    void run(row.wallet);
                  }}
                  className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-raised/60"
                >
                  <span className="font-mono text-sm">{short(row.wallet)}</span>
                  <span className="truncate text-xs text-muted">
                    {row.venues.map((v) => VENUE_LABEL[v] ?? v).join(" · ")}
                  </span>
                  <span className="font-mono text-sm tabular-nums">
                    {row.qualifying}/{MIN_TRADES}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded-lg bg-inset p-3">
      <dt className="font-mono text-xs uppercase tracking-widest text-subtle">{label}</dt>
      <dd className={cn("mt-1 font-mono text-lg tabular-nums", tone === "warn" && "text-warn")}>
        {value}
      </dd>
    </div>
  );
}

function TxRow({ tx }: { tx: ClassifiedTx }) {
  const when = tx.blockTime
    ? new Date(tx.blockTime * 1000).toISOString().slice(5, 16).replace("T", " ")
    : "—";
  const pair =
    tx.kind === "swap" ? `${sym(tx.sold)} → ${sym(tx.bought)}` : (VENUE_LABEL[tx.venue ?? ""] ?? "");
  return (
    <li className="flex flex-col gap-2 rounded-lg bg-surface p-3 shadow-[var(--shadow-border)] sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-3 sm:w-56 sm:shrink-0">
        <Badge variant={tx.qualifies ? "ok" : tx.roundTripOf ? "bad" : "default"}>
          {tx.qualifies ? "Counts" : tx.roundTripOf ? "Loop" : "Info"}
        </Badge>
        <span className="font-mono text-xs tabular-nums text-subtle">{when} UTC</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg">
          {pair}
          {tx.sizeUsd !== null ? (
            <span className="ml-2 font-mono tabular-nums text-muted">
              {usd(tx.sizeUsd)}
              {tx.sizeSource === "sol-leg" ? "*" : ""}
            </span>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted">{tx.reason}</p>
      </div>
      <a
        href={`https://solscan.io/tx/${tx.signature}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 font-mono text-xs text-muted hover:text-fg"
      >
        {short(tx.signature)}
        <ArrowUpRight className="size-3" />
      </a>
    </li>
  );
}

function Method({ result }: { result: VerifyResult }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl bg-inset p-5 text-sm leading-relaxed text-muted shadow-[var(--shadow-border)]">
      <h2 className="font-display text-xl tracking-tight text-fg">How this is counted</h2>
      <ul className="flex list-disc flex-col gap-1.5 pl-5">
        <li>
          Only transactions the wallet signed, since 2 Sep. Venue comes from the programs the
          runtime logged as invoked, at any depth.
        </li>
        <li>
          Swap size is the USDC or USDT leg when there is one. Swaps with only a SOL leg are
          priced at the current SOL price
          {result.solUsd ? ` (${usd(result.solUsd)} at this lookup)` : ""}, marked *, so a swap
          near {SWAP_MIN_USDC} USDC can read either side of the line.
        </li>
        <li>
          Phoenix Perps is read from the instruction bytes, using the codes in Ellipsis Labs&apos;
          published SDK: a market or limit order counts at any size; account setup, deposits,
          withdrawals, cancels and stop placements do not.
        </li>
        <li>
          A reversal of the same pair at a similar size within 10 minutes is flagged as a
          possible loop and not counted — the rules exclude artificial loops.
        </li>
        <li>
          Adrena is counted when a position instruction runs, but the protocol is winding down:
          its last on-chain activity is staking, not trading.
        </li>
        <li>
          This is an independent check. The Arena&apos;s own telemetry is the final word on
          eligibility.
        </li>
      </ul>
      <p className="font-mono text-xs text-subtle">
        RPC: {result.rpc} · checked {result.checkedAt.slice(0, 16).replace("T", " ")} UTC
        {result.cached ? " · from cache" : ""}
      </p>
    </section>
  );
}
