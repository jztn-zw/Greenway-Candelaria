import { cn } from "@/lib/utils";

export const FilterTabCount = ({ count }: { count: number }) => (
  <span className={cn(
    "inline-flex shrink-0 items-center justify-center rounded-full bg-primary-foreground text-ui-overline font-semibold leading-none text-primary tabular-nums",
    count > 9 ? "h-5 min-w-5 px-1.5" : "size-5",
  )}>{count}</span>
);
