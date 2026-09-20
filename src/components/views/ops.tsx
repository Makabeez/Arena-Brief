import { useRef } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LINKS, MISSIONS, XP_TARGET } from "@/lib/arena";
import { useArenaStore, type ArenaSnapshot } from "@/lib/store";
import { cn } from "@/lib/utils";

export function OpsView() {
  const handle = useArenaStore((s) => s.handle);
  const displayName = useArenaStore((s) => s.displayName);
  const agentCreated = useArenaStore((s) => s.agentCreated);
  const xConnected = useArenaStore((s) => s.xConnected);
  const xp = useArenaStore((s) => s.xp);
  const missions = useArenaStore((s) => s.missions);
  const setHandle = useArenaStore((s) => s.setHandle);
  const setDisplayName = useArenaStore((s) => s.setDisplayName);
  const setAgentCreated = useArenaStore((s) => s.setAgentCreated);
  const setXConnected = useArenaStore((s) => s.setXConnected);
  const setXp = useArenaStore((s) => s.setXp);
  const setMission = useArenaStore((s) => s.setMission);
  const importData = useArenaStore((s) => s.importData);
  const reset = useArenaStore((s) => s.reset);
  const fileRef = useRef<HTMLInputElement>(null);

  const xpPct = Math.min(100, Math.round((xp / XP_TARGET) * 100));
  const remaining = Math.max(0, XP_TARGET - xp);
  const unclaimed = MISSIONS.reduce((sum, m) => {
    if (m.xp === 0) return sum;
    return sum + (missions[m.id].done ? 0 : m.xp);
  }, 0);

  function exportDesk() {
    const state = useArenaStore.getState();
    const payload = {
      handle: state.handle,
      displayName: state.displayName,
      agentCreated: state.agentCreated,
      xConnected: state.xConnected,
      xPostUrl: state.xPostUrl,
      xp: state.xp,
      trades: state.trades,
      missions: state.missions,
      strategy: state.strategy,
      scores: state.scores,
      xDraft: state.xDraft,
      submissionNotes: state.submissionNotes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arena-brief-${state.handle || "desk"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Desk exported");
  }

  function onImport(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<ArenaSnapshot>;
        importData(parsed);
        toast.success("Desk imported");
      } catch {
        toast.error("Could not read that file");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-subtle">02 · Ops</p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Agent and XP</h1>
        <p className="max-w-xl text-base leading-relaxed text-muted">
          Identity for the submission pack, current Arena XP, and the bonus missions that climb
          the board without replacing the four gates.
        </p>
      </header>

      <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <h2 className="font-display text-2xl tracking-tight">Identity</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="handle">Steve handle</Label>
            <Input
              id="handle"
              placeholder="@your-agent"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="display">Display name</Label>
            <Input
              id="display"
              placeholder="As shown in the Arena"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <ToggleRow
            checked={agentCreated}
            onChange={setAgentCreated}
            title="Agent created"
            detail="Onboarding finished. Handle, display name, and avatar set."
          />
          <ToggleRow
            checked={xConnected}
            onChange={setXConnected}
            title="X account connected"
            detail="Steve is linked to X. The public post is logged in Dispatch."
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl tracking-tight">Arena XP</h2>
          <Badge variant={xp >= XP_TARGET ? "ok" : "default"}>
            {xp >= XP_TARGET ? "Floor met" : `${remaining} to floor`}
          </Badge>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="xp">Current XP</Label>
          <Input
            id="xp"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={Number.isFinite(xp) ? xp : 0}
            onChange={(e) => setXp(Number(e.target.value))}
            className="font-mono tabular-nums"
          />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-inset">
          <div
            className="h-full bg-accent transition-[width] duration-500 ease-[var(--ease-smooth-out)]"
            style={{ width: `${xpPct}%` }}
          />
        </div>
        <p className="font-mono text-xs tabular-nums text-muted">
          {xp.toLocaleString()} / {XP_TARGET.toLocaleString()}
          {unclaimed > 0 ? ` · ${unclaimed} XP still claimable from listed bonuses` : ""}
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl tracking-tight">Bonus missions</h2>
          <Button variant="outline" size="sm" asChild>
            <a href={LINKS.missions} target="_blank" rel="noreferrer">
              Claim in Arena
            </a>
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          Bonus XP helps you climb but does not replace the four gates. Each listed ecosystem
          bonus can only be earned once.
        </p>
        <ul className="flex flex-col gap-3">
          {MISSIONS.map((m) => {
            const state = missions[m.id];
            return (
              <li
                key={m.id}
                className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setMission(m.id, { done: !state.done })}
                    className="flex min-h-11 flex-1 items-start gap-3 text-left"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-xs shadow-[var(--shadow-border)]",
                        state.done ? "bg-ok text-ok-fg" : "bg-inset",
                      )}
                      aria-hidden
                    >
                      {state.done ? (
                        <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
                          <path
                            d="M3.5 8.5 6.5 11.5 12.5 4.5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                        </svg>
                      ) : null}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-fg">{m.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted">
                        {m.detail}
                      </span>
                    </span>
                  </button>
                  <Badge variant={state.done ? "ok" : "default"}>
                    {m.xp > 0 ? `+${m.xp}` : "varies"}
                  </Badge>
                </div>
                {state.done ? (
                  <Input
                    placeholder="Proof — tx, mint, or mission note"
                    value={state.proof}
                    onChange={(e) => setMission(m.id, { proof: e.target.value })}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)]">
        <h2 className="font-display text-2xl tracking-tight">Desk file</h2>
        <p className="text-sm leading-relaxed text-muted">
          Everything lives in this browser. Export a JSON snapshot if you want a copy.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportDesk}>
            Export
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm("Clear this desk?")) {
                reset();
                toast.success("Desk cleared");
              }
            }}
          >
            Clear
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              onImport(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </section>
    </div>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
  detail,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex min-h-14 items-start gap-3 rounded-md bg-inset px-3 py-3 text-left"
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-xs shadow-[var(--shadow-border)]",
          checked ? "bg-ok text-ok-fg" : "bg-raised",
        )}
        aria-hidden
      >
        {checked ? (
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
            <path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        ) : null}
      </span>
      <span>
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="mt-1 block text-sm text-muted">{detail}</span>
      </span>
    </button>
  );
}
