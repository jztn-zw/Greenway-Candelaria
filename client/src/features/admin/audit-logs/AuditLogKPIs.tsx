import React from "react";
import { Activity, Trash2, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { AuditLogEntry } from "./types";
import { AuditLogKPIsData } from "@/services/auditService";
import { cn } from "@/lib/utils";

interface AuditLogKPIsProps {
  logs: AuditLogEntry[];
  kpiData?: AuditLogKPIsData;
}

const AuditLogKPIs: React.FC<AuditLogKPIsProps> = ({ logs, kpiData }) => {
  const totalActions = kpiData?.totalActions ?? logs.length;
  const deletions =
    kpiData?.deletions ??
    logs.filter((l) => l.actionType.includes("DELETE") || l.actionType.includes("DEACTIVATE")).length;
  const failedLogins =
    kpiData?.failedLogins ??
    logs.filter((l) => l.actionType.includes("FAILED_LOGIN") || l.actionType.includes("Failed")).length;
  const modifications = logs.filter(
    (l) => l.severity === "change" || l.actionType.includes("UPDATE") || l.actionType.includes("ASSIGN"),
  ).length;

  const kpis = [
    {
      label: "Total Audited Events",
      value: totalActions,
      icon: Activity,
      accent: "bg-primary/10 text-primary border-primary/20",
      description: "Tamper-proof audit records",
    },
    {
      label: "Critical & Deletions",
      value: deletions,
      icon: Trash2,
      accent: "bg-destructive/10 text-destructive border-destructive/20",
      description: "Deletions & deactivations",
    },
    {
      label: "System Modifications",
      value: modifications,
      icon: SlidersHorizontal,
      accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      description: "State & record changes",
    },
    {
      label: "Security & Auth Alerts",
      value: failedLogins,
      icon: ShieldAlert,
      accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      description: failedLogins === 0 ? "Zero auth anomalies" : "Failed login attempts",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
                {kpi.label}
              </span>
              <div
                className={cn(
                  "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
                  kpi.accent
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums">
              {kpi.value.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {kpi.description}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AuditLogKPIs;
