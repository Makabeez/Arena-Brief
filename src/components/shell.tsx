import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { Mark } from "@/components/mark";
import { Countdown } from "@/components/countdown";
import { closedGateCount, useArenaStore, type ViewId } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV: { id: ViewId; num: string; label: string }[] = [
  { id: "brief", num: "01", label: "Brief" },
  { id: "ops", num: "02", label: "Ops" },
  { id: "trades", num: "03", label: "Trades" },
  { id: "dispatch", num: "04", label: "Dispatch" },
];

export function Shell({ children }: { children: ReactNode }) {
  const view = useArenaStore((s) => s.view);
  const setView = useArenaStore((s) => s.setView);
  const gates = useArenaStore((s) => closedGateCount(s));

  return (
    <div className="min-h-dvh bg-bg text-fg lg:p-3">
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col lg:min-h-[calc(100dvh-24px)] lg:flex-row lg:overflow-hidden lg:rounded-2xl lg:shadow-[var(--shadow-border)]">
        <aside className="flex flex-col border-b border-line bg-surface lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 px-4 py-4 lg:flex-col lg:items-start lg:px-5 lg:py-6">
            <div className="flex items-center gap-3">
              <Mark className="size-8" />
              <div>
                <p className="font-display text-xl leading-none tracking-tight">Arena Brief</p>
                <p className="mt-1 font-mono text-xs uppercase tracking-widest text-subtle">
                  Field desk
                </p>
              </div>
            </div>
            <div className="lg:hidden">
              <Countdown compact />
            </div>
          </div>

          <nav
            className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-3 lg:pb-0"
            aria-label="Desk sections"
          >
            {NAV.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 text-left transition-colors duration-150",
                    active ? "bg-raised text-fg" : "text-muted hover:bg-raised/60 hover:text-fg",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="font-mono text-xs tabular-nums text-subtle">{item.num}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="hidden border-t border-line px-5 py-4 lg:block">
            <p className="font-mono text-xs uppercase tracking-widest text-subtle">Window</p>
            <div className="mt-2">
              <Countdown compact />
            </div>
            <p className="mt-3 font-mono text-xs tabular-nums text-muted">{gates}/4 gates closed</p>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1 bg-bg">
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-8 sm:py-10">{children}</div>
        </main>
      </div>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          className: "font-sans",
          style: {
            background: "var(--color-raised)",
            color: "var(--color-fg)",
            border: "1px solid var(--color-line-strong)",
          },
        }}
      />
    </div>
  );
}
