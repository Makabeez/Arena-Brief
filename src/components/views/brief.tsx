import { Countdown } from "@/components/countdown";
import { ReadinessRing } from "@/components/readiness";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GATES,
  JUDGING,
  LINKS,
  PRIZES,
  PRIZE_TOTAL,
  RULES,
  TIMELINE,
} from "@/lib/arena";
import {
  closedGateCount,
  gateStatus,
  isEligible,
  useArenaStore,
  type ViewId,
} from "@/lib/store";
import { cn } from "@/lib/utils";

const GATE_VIEW: Record<string, ViewId> = {
  agent: "ops",
  xpost: "dispatch",
  xp: "ops",
  trades: "trades",
};

export function BriefView() {
  const setView = useArenaStore((s) => s.setView);
  const data = useArenaStore();
  const status = gateStatus(data);
  const closed = closedGateCount(data);
  const eligible = isEligible(data);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-6">
        <p className="font-mono text-xs uppercase tracking-widest text-subtle">
          Steve Agent Arena · 2 Sep – 1 Oct 2026
        </p>
        <h1 className="font-display text-4xl leading-tight tracking-tight text-fg sm:text-5xl">
          {eligible ? "Four gates closed. You are eligible." : "The window is closing."}
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-muted">
          A field desk for the Superteam bounty. Track the four minimums, log qualifying
          trades, draft the required X post, and pack the Superteam submission. Positive PnL is
          not required — strategy is.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <a href={LINKS.steve} target="_blank" rel="noreferrer">
              Open Steve
            </a>
          </Button>
          <Button variant="secondary" asChild>
            <a href={LINKS.missions} target="_blank" rel="noreferrer">
              Arena missions
            </a>
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-6 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-subtle">Closes</p>
            <p className="mt-1 text-sm text-muted">1 Oct 2026, 21:59 UTC</p>
          </div>
          <ReadinessRing value={closed} total={4} label="gates" />
        </div>
        <Countdown />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl tracking-tight">Four gates</h2>
          <Badge variant={eligible ? "ok" : "default"}>
            {eligible ? "Eligible" : `${closed} of 4`}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {GATES.map((gate) => {
            const done = status[gate.id];
            return (
              <button
                key={gate.id}
                type="button"
                onClick={() => setView(GATE_VIEW[gate.id] ?? "ops")}
                className={cn(
                  "flex min-h-36 flex-col items-start rounded-lg bg-surface p-4 text-left shadow-[var(--shadow-border)] transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-border-hover)]",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-mono text-xs tabular-nums text-subtle">{gate.num}</span>
                  <Badge variant={done ? "ok" : "default"}>{done ? "Closed" : "Open"}</Badge>
                </div>
                <p className="mt-3 font-medium text-fg">{gate.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{gate.detail}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl tracking-tight">How winners are chosen</h2>
        <p className="text-sm leading-relaxed text-muted">
          Everyone who closes the four gates is judged. Pure XP farming will not outweigh
          quality. Total prize pool {PRIZE_TOTAL} USDC on Solana.
        </p>
        <div className="overflow-hidden rounded-lg bg-surface shadow-[var(--shadow-border)]">
          <div className="flex h-3 w-full gap-px bg-bg">
            {JUDGING.map((j) => (
              <div
                key={j.id}
                className={
                  j.id === "strategy"
                    ? "h-full bg-accent"
                    : j.id === "creative"
                      ? "h-full bg-accent/70"
                      : j.id === "arena"
                        ? "h-full bg-accent/45"
                        : "h-full bg-accent/25"
                }
                style={{ flexGrow: j.weight }}
              />
            ))}
          </div>
          <ul className="grid gap-0 sm:grid-cols-2">
            {JUDGING.map((j) => (
              <li key={j.id} className="border-t border-line p-4">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-fg">{j.label}</span>
                  <span className="font-mono text-xs tabular-nums text-subtle">{j.weight}%</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{j.hint}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl tracking-tight">Purse</h2>
        <div className="grid grid-cols-3 gap-3">
          {PRIZES.map((p) => (
            <div
              key={p.place}
              className="rounded-lg bg-surface px-3 py-4 text-center shadow-[var(--shadow-border)]"
            >
              <p className="font-mono text-xs tabular-nums text-subtle">{p.place}</p>
              <p className="mt-2 font-display text-3xl tracking-tight tabular-nums">{p.amount}</p>
              <p className="mt-1 text-xs text-muted">USDC · {p.title}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl tracking-tight">Timeline</h2>
        <ol className="relative flex flex-col gap-0 border-l border-line pl-5">
          {TIMELINE.map((t) => (
            <li key={t.when} className="relative py-3">
              <span className="absolute top-5 -left-[23px] size-2 rounded-full bg-accent" />
              <p className="font-mono text-xs uppercase tracking-widest text-subtle">{t.when}</p>
              <p className="mt-1 text-sm text-fg">{t.label}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl tracking-tight">Standing orders</h2>
        <ul className="flex flex-col gap-2">
          {RULES.map((rule) => (
            <li key={rule} className="flex gap-3 text-sm leading-relaxed text-muted">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-subtle" />
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
