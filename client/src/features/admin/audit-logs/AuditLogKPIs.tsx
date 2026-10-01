import React from "react";
import { AuditLogKPIsData } from "@/services/auditService";
import { cn } from "@/lib/utils";

interface AuditLogKPIsProps {
  kpiData: AuditLogKPIsData;
}

const AuditLogKPIs: React.FC<AuditLogKPIsProps> = ({ kpiData }) => {
  const { totalActions, deletions, failedLogins, modifications } = kpiData;

  const kpis = [
    {
      label: "Total Audited Events",
      value: totalActions,
      description: "Recorded audit events",
      tag: "bg-muted/70 text-muted-foreground border-border/80",
    },
    {
      label: "Destructive Actions",
      value: deletions,
      description: deletions > 0 ? `${deletions} destructive actions` : "Zero deletions",
      tag: "bg-destructive/10 text-destructive border-destructive/20",
    },
    {
      label: "System Modifications",
      value: modifications,
      description: "State & record updates",
      tag: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      label: "Security & Auth Alerts",
      value: failedLogins,
      description: failedLogins === 0 ? "Zero auth anomalies" : `${failedLogins} failed attempts`,
      tag: failedLogins > 0 ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-muted/70 text-muted-foreground border-border/80",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
      {kpis.map((kpi, idx) => (
        <div
          key={kpi.label}
          className={cn(
            "p-4 sm:p-5 flex flex-col justify-between space-y-2.5 transition-colors hover:bg-muted/15",
            // Mobile (2 columns): right border on even index (0, 2)
            idx % 2 === 0 ? "border-r border-border/70" : "",
            // Desktop (4 columns): right border on 0, 1, 2, none on 3
            idx < 3 ? "lg:border-r lg:border-border/70" : "lg:border-r-0",
            // Mobile (2 columns): bottom border on top row (0, 1)
            idx < 2 ? "border-b lg:border-b-0 border-border/70" : ""
          )}
        >
          <div className="flex items-center min-h-[22px]">
            <span
              className={cn(
                "text-ui-overline font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                kpi.tag
              )}
            >
              {kpi.label}
            </span>
          </div>

          <div className="gw-stat-value text-2xl sm:text-3xl text-foreground tracking-tight tabular-nums">
            {kpi.value.toLocaleString()}
          </div>

          <div className="text-ui-caption text-muted-foreground font-medium truncate">
            {kpi.description}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AuditLogKPIs;
