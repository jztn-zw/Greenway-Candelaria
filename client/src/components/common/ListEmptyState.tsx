import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ListEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  children?: ReactNode;
  variant?: "card" | "inline";
  className?: string;
}

export default function ListEmptyState({ icon: Icon, title, description, children, variant = "card", className }: ListEmptyStateProps) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center justify-center px-4 py-8 text-center sm:px-6 sm:py-10",
      variant === "card" && "min-h-60 rounded-2xl border border-border/80 bg-card shadow-2xs", className)}>
      <div className="mb-4 flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <div className="w-full max-w-md space-y-2 break-words">
        <h3 className="gw-heading text-base text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children && <div className="mt-5 flex max-w-full flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
