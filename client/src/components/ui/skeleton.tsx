import { cn } from "@/lib/utils";
import "./skeleton.css";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // Live component styles can supply geometry, but every placeholder keeps the shared color.
  return <div className={cn("animate-pulse rounded-md motion-reduce:animate-none", className, "bg-skeleton")} {...props} />;
}

export { Skeleton };
