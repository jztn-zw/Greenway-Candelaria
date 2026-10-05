import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // Live component styles can supply geometry, but every placeholder keeps the shared color.
  return <div className={cn("animate-pulse rounded-md", className, "bg-muted")} {...props} />;
}

export { Skeleton };
