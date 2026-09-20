import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("text-fg", className)}
      aria-hidden="true"
      fill="none"
    >
      <rect x="3.5" y="3.5" width="25" height="25" rx="3" stroke="currentColor" strokeWidth="1.2" />
      <rect x="8.5" y="8.5" width="15" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M16 11.5v9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
    </svg>
  );
}
