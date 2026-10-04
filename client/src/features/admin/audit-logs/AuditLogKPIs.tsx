import { ClipboardList, Trash2, Pencil, ShieldAlert } from "lucide-react";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/AdminKpiCards";
import React from "react";
import { AuditLogKPIsData } from "@/services/auditService";

interface AuditLogKPIsProps {
  kpiData: AuditLogKPIsData;
}

const AuditLogKPIs: React.FC<AuditLogKPIsProps> = ({ kpiData }) => {
  const { totalActions, deletions, failedLogins, modifications } = kpiData;

  const kpis = [
    {
      icon: ClipboardList,
      label: "Total Audited Events",
      value: totalActions,
      description: "Recorded audit events",
      tone: "neutral" as const,
    },
    {
      icon: Trash2,
      label: "Destructive Actions",
      value: deletions,
      description: deletions > 0 ? `${deletions} destructive actions` : "Zero deletions",
      tone: "danger" as const,
    },
    {
      icon: Pencil,
      label: "System Modifications",
      value: modifications,
      description: "State & record updates",
      tone: "warning" as const,
    },
    {
      icon: ShieldAlert,
      label: "Security & Auth Alerts",
      value: failedLogins,
      description: failedLogins === 0 ? "Zero auth anomalies" : `${failedLogins} failed attempts`,
      tone: failedLogins > 0 ? "danger" as const : "neutral" as const,
    },
  ];

  return (
    <AdminKpiGrid>
      {kpis.map((kpi) => (
        <AdminKpiCard key={kpi.label} label={kpi.label} value={kpi.value}
          description={kpi.description} icon={kpi.icon} tone={kpi.tone} />
      ))}
    </AdminKpiGrid>
  );
};

export default AuditLogKPIs;
