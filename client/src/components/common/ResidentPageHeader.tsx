import type { ReactNode } from "react";
import { residentPageStyles } from "./residentPageStyles";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type ResidentPageHeaderProps = {
  title: ReactNode;
  description: ReactNode;
  titleBadge?: ReactNode;
  actions?: ReactNode;
  actionsClassName?: string;
  className?: string;
  backButton?: ReactNode;
};

export function ResidentPageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cn(residentPageStyles.title, className)}>{children}</h1>;
}

export default function ResidentPageHeader({ title, description, titleBadge, actions, actionsClassName, className, backButton }: ResidentPageHeaderProps) {
  return (
    <header className={cn(residentPageStyles.header, className)}>
      <div className={cn("min-w-0 max-w-full", backButton && "flex items-center gap-3")}>
        {backButton}
        <div className={residentPageStyles.heading}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ResidentPageTitle>{title}</ResidentPageTitle>
          {titleBadge}
        </div>
        <p className={residentPageStyles.description}>{description}</p>
        </div>
      </div>
      {actions && <div className={cn(residentPageStyles.actions, actionsClassName)}>{actions}</div>}
    </header>
  );
}

/** Uses the same responsive typography and action layout as the loaded header. */
export function ResidentPageHeaderSkeleton({ title, description, titleClassName = "w-44", descriptionClassName = "w-80", titleBadge, actions, actionsClassName, className, backButton }: {
  title?: ReactNode;
  description?: ReactNode;
  titleClassName?: string;
  descriptionClassName?: string;
  titleBadge?: ReactNode;
  actions?: ReactNode;
  actionsClassName?: string;
  className?: string;
  backButton?: ReactNode;
}) {
  return (
    <header aria-hidden={backButton ? undefined : true} className={cn(residentPageStyles.header, className)}>
      <div className={cn("min-w-0 max-w-full", backButton && "flex items-center gap-3")}>
        {backButton}
        <div aria-hidden="true" className={residentPageStyles.heading}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Skeleton className={cn(residentPageStyles.title, "max-w-full", title ? "gw-skeleton-text w-fit" : ["h-[1.25em]", titleClassName])}>
            {title && <span className="invisible">{title}</span>}
          </Skeleton>
          {titleBadge}
        </div>
        <Skeleton className={cn(residentPageStyles.description, description ? "gw-skeleton-text w-fit" : ["h-[1.625em] max-w-full", descriptionClassName])}>
          {description && <span className="invisible">{description}</span>}
        </Skeleton>
        </div>
      </div>
      {actions && <div aria-hidden="true" className={cn(residentPageStyles.actions, actionsClassName)}>{actions}</div>}
    </header>
  );
}
