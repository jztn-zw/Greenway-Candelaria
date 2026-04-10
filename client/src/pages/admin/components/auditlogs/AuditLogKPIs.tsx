import { Activity, Trash2, ShieldAlert } from "lucide-react";
import { AuditLogEntry } from "./types";

interface AuditLogKPIsProps {
  logs: AuditLogEntry[];
}

const AuditLogKPIs = ({ logs }: AuditLogKPIsProps) => {
  const totalActions = logs.length;
  const deletions = logs.filter((l) => l.actionType === "Deleted" || l.actionType === "Deactivated").length;
  const failedLogins = logs.filter((l) => l.actionType === "Failed Login").length;

  const kpis = [
    {
      label: "Total Actions",
      value: totalActions,
      icon: Activity,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Deletions & Deactivations",
      value: deletions,
      icon: Trash2,
      accent: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Failed Login Attempts",
      value: failedLogins,
      icon: ShieldAlert,
      accent: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
              <p className="text-2xl font-bold font-display text-foreground mt-2 tabular-nums">
                {kpi.value.toLocaleString()}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${kpi.accent}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AuditLogKPIs;
