import type { ReactNode } from "react";
import { residentPageStyles } from "./residentPageStyles";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type ResidentPageHeaderProps = {
  title: ReactNode;
  description: string;
  titleBadge?: ReactNode;
  actions?: ReactNode;
  actionsClassName?: string;
  className?: string;
};

export function ResidentPageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cn(residentPageStyles.title, className)}>{children}</h1>;
}

export default function ResidentPageHeader({ title, description, titleBadge, actions, actionsClassName, className }: ResidentPageHeaderProps) {
  return (
    <header className={cn(residentPageStyles.header, className)}>
      <div className={residentPageStyles.heading}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ResidentPageTitle>{title}</ResidentPageTitle>
          {titleBadge}
        </div>
        <p className={residentPageStyles.description}>{description}</p>
      </div>
      {actions && <div className={cn(residentPageStyles.actions, actionsClassName)}>{actions}</div>}
    </header>
  );
}

/** Uses the same responsive typography and action layout as the loaded header. */
export function ResidentPageHeaderSkeleton({ titleClassName = "w-44", descriptionClassName = "w-80", titleBadge, actions, actionsClassName, className }: {
  titleClassName?: string;
  descriptionClassName?: string;
  titleBadge?: ReactNode;
  actions?: ReactNode;
  actionsClassName?: string;
  className?: string;
}) {
  return (
    <header aria-hidden="true" className={cn(residentPageStyles.header, className)}>
      <div className={residentPageStyles.heading}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Skeleton className={cn(residentPageStyles.title, "h-[1.25em] max-w-full", titleClassName)} />
          {titleBadge}
        </div>
        <Skeleton className={cn(residentPageStyles.description, "h-[1.625em] max-w-full", descriptionClassName)} />
      </div>
      {actions && <div className={cn(residentPageStyles.actions, actionsClassName)}>{actions}</div>}
    </header>
  );
}
