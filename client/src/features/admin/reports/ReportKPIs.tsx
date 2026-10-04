import { FileText, ClipboardList, Truck, CircleCheck } from "lucide-react";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/AdminKpiCards";
import type { AdminReportsKPIs } from "@/services/reportsService";
import type { WasteReport } from "./types";

interface ReportKPIsProps {
  reports?: WasteReport[];
  kpis?: AdminReportsKPIs;
}

const ReportKPIs = ({ reports = [], kpis }: ReportKPIsProps) => {
  const total = kpis ? kpis.total : reports.length;
  const pending = kpis
    ? kpis.pending
    : reports.filter((r) => r.status === "Submitted" || r.status === "Under Review").length;
  const dispatched = kpis
    ? kpis.dispatched
    : reports.filter((r) => r.status === "Dispatched").length;
  const resolved = kpis
    ? kpis.resolved
    : reports.filter((r) => r.status === "Resolved").length;

  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const items = [
    {
      icon: FileText,
      label: "Total Reports",
      value: total,
      subtext: `${resolutionRate}% overall resolution`,
      tone: "neutral" as const,
    },
    {
      icon: ClipboardList,
      label: "Pending Review",
      value: pending,
      subtext: "Submitted or under review",
      tone: "warning" as const,
    },
    {
      icon: Truck,
      label: "In Dispatch",
      value: dispatched,
      subtext: "Reports marked dispatched",
      tone: "info" as const,
    },
    {
      icon: CircleCheck,
      label: "Resolved Cases",
      value: resolved,
      subtext: "Reports marked resolved",
      tone: "success" as const,
    },
  ];

  return (
    <AdminKpiGrid>
      {items.map((kpi) => (
        <AdminKpiCard key={kpi.label} label={kpi.label} value={kpi.value}
          description={kpi.subtext} icon={kpi.icon} tone={kpi.tone} />
      ))}
    </AdminKpiGrid>
  );
};

export default ReportKPIs;
