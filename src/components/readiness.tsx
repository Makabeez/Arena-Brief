import { cn } from "@/lib/utils";

export function ReadinessRing({
  value,
  total,
  label,
  className,
}: {
  value: number;
  total: number;
  label: string;
  className?: string;
}) {
  const size = 120;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : Math.min(1, value / total);
  const offset = c * (1 - pct);

  return (
    <div className={cn("relative size-28", className)}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-line-strong"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          className="text-accent"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          style={{
            transition: "stroke-dashoffset 400ms var(--ease-smooth-out)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl leading-none tracking-tight text-fg tabular-nums">
          {value}/{total}
        </span>
        <span className="mt-1 font-mono text-xs uppercase tracking-widest text-subtle">{label}</span>
      </div>
    </div>
  );
}
