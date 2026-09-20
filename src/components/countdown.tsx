import { useEffect, useState } from "react";
import { remainingMs, splitDuration } from "@/lib/store";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
}

export function Countdown({ compact = false }: { compact?: boolean }) {
  const now = useNow();
  const parts = splitDuration(remainingMs(now));

  if (parts.closed) {
    return (
      <p className={cn("font-mono text-bad", compact ? "text-xs" : "text-lg")}>Window closed</p>
    );
  }

  if (compact) {
    return (
      <p className="font-mono text-xs tabular-nums text-fg">
        {parts.days}d {pad(parts.hours)}:{pad(parts.minutes)}:{pad(parts.seconds)}
      </p>
    );
  }

  const cells = [
    { v: parts.days, l: "days" },
    { v: parts.hours, l: "hours" },
    { v: parts.minutes, l: "min" },
    { v: parts.seconds, l: "sec" },
  ];

  return (
    <div className="flex items-end gap-4 sm:gap-6">
      {cells.map((c, i) => (
        <div key={c.l} className="flex items-end gap-4 sm:gap-6">
          {i > 0 ? (
            <span className="mb-7 hidden font-display text-3xl text-subtle sm:mb-8 sm:block sm:text-4xl">
              :
            </span>
          ) : null}
          <div className="flex min-w-14 flex-col sm:min-w-16">
            <span className="font-display text-5xl leading-none tracking-tight text-fg tabular-nums sm:text-6xl">
              {c.l === "days" ? c.v : pad(c.v)}
            </span>
            <span className="mt-2 font-mono text-xs uppercase tracking-widest text-subtle">
              {c.l}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
