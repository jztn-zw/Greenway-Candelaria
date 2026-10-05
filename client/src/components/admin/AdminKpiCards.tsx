import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import "./adminKpiCards.css";
import KpiValue from "@/components/common/KpiValue";

export type AdminKpiTone = "neutral" | "success" | "warning" | "info" | "danger";

const iconTones: Record<AdminKpiTone, string> = {
  neutral: "border-border/80 bg-muted/70 text-muted-foreground",
  success: "border-success/20 bg-success/10 text-success-foreground",
  warning: "border-warning/20 bg-warning/10 text-warning-foreground",
  info: "border-info/20 bg-info/10 text-info-foreground",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
};

export const AdminKpiGrid = ({ children }: { children: ReactNode }) => (
  <div className="admin-kpi min-w-0 w-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
    <div className="admin-kpi-grid">{children}</div>
  </div>
);

export const AdminKpiCard = ({ label, value, description, icon: Icon, tone = "neutral" }: {
  label: string;
  value: ReactNode;
  description: ReactNode;
  icon: LucideIcon;
  tone?: AdminKpiTone;
}) => (
  <article className="admin-kpi-card min-w-0 bg-card">
    <div className="admin-kpi-header flex min-w-0 items-center gap-2">
      <span className={cn("admin-kpi-icon flex shrink-0 items-center justify-center rounded-lg border", iconTones[tone])}>
        <Icon aria-hidden="true" className="admin-kpi-symbol" />
      </span>
      <h2 className="admin-kpi-label min-w-0 font-medium text-muted-foreground">{label}</h2>
    </div>
    <p className="admin-kpi-value gw-stat-value min-w-0 text-foreground"><KpiValue value={value} /></p>
    <div className="admin-kpi-description min-w-0 text-muted-foreground">{description}</div>
  </article>
);

export const AdminKpiSkeleton = ({ count = 4 }: { count?: number }) => (
  <AdminKpiGrid>
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="admin-kpi-card min-w-0 bg-card" aria-hidden="true">
        <div className="admin-kpi-header flex min-w-0 items-center gap-2">
          <Skeleton className="admin-kpi-icon shrink-0 rounded-lg" />
          <Skeleton className="h-4 w-24 min-w-0 max-w-full" />
        </div>
        <div className="admin-kpi-value min-w-0"><Skeleton className="h-8 w-16 max-w-full sm:h-9" /></div>
        <div className="admin-kpi-description min-w-0">
          <Skeleton className="h-5 w-36 max-w-full" />
          <Skeleton className="admin-kpi-skeleton-line h-5 w-24 max-w-full" />
        </div>
      </div>
    ))}
  </AdminKpiGrid>
);
