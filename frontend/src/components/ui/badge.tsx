import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "border-transparent bg-primary text-primary-foreground",
      secondary: "border-transparent bg-muted text-muted-foreground",
      destructive: "border-transparent bg-destructive text-destructive-foreground",
      feed: "border-transparent bg-feed/15 text-feed",
      diaper: "border-transparent bg-diaper/15 text-diaper",
      sleep: "border-transparent bg-sleep/15 text-sleep",
      pumping: "border-transparent bg-pumping/15 text-pumping"
    }
  },
  defaultVariants: { variant: "default" }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
