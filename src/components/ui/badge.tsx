import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-xs tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-raised text-muted shadow-[var(--shadow-border)]",
        ok: "bg-ok/15 text-ok",
        warn: "bg-warn/15 text-warn",
        bad: "bg-bad/15 text-bad",
        solid: "bg-accent text-accent-fg",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
