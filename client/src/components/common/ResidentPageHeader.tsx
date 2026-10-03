import type { ReactNode } from "react";
import { residentPageStyles } from "./residentPageStyles";
import { cn } from "@/lib/utils";

export default function ResidentPageHeader({ title, description, titleBadge, actions, actionsClassName }: {
  title: string;
  description: string;
  titleBadge?: ReactNode;
  actions?: ReactNode;
  actionsClassName?: string;
}) {
  return (
    <header className={residentPageStyles.header}>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className={residentPageStyles.title}>{title}</h1>
          {titleBadge}
        </div>
        <p className={residentPageStyles.description}>{description}</p>
      </div>
      {actions && <div className={cn("flex max-w-full shrink-0 flex-wrap items-center gap-2", actionsClassName)}>{actions}</div>}
    </header>
  );
}
