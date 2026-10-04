import { Bell, BookOpen, CalendarClock, FilePenLine } from "lucide-react";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/AdminKpiCards";
import React from "react";

interface Props {
  metrics: {
    active: number;
    scheduled: number;
    drafts: number;
    totalRecipients: number;
    totalReads: number;
  };
}

const AnnouncementKPIs: React.FC<Props> = ({ metrics }) => {
  const avgReadRate = metrics.totalRecipients > 0
    ? Math.round((metrics.totalReads / metrics.totalRecipients) * 100)
    : 0;

  const kpis = [
    {
      icon: Bell,
      label: "Active Notices",
      value: metrics.active,
      trend: "Live to residents",
      tone: "success" as const,
    },
    {
      icon: BookOpen,
      label: "Avg. Read Rate",
      value: `${avgReadRate}%`,
      trend: `${metrics.totalReads.toLocaleString()} total reads`,
      tone: "neutral" as const,
    },
    {
      icon: CalendarClock,
      label: "Scheduled",
      value: metrics.scheduled,
      trend: metrics.scheduled > 0 ? "Queued to dispatch" : "None queued",
      tone: "warning" as const,
    },
    {
      icon: FilePenLine,
      label: "Drafts",
      value: metrics.drafts,
      trend: metrics.drafts > 0 ? "In preparation" : "All dispatched",
      tone: "neutral" as const,
    },
  ];

  return (
    <AdminKpiGrid>
      {kpis.map((kpi) => (
        <AdminKpiCard key={kpi.label} label={kpi.label} value={kpi.value}
          description={kpi.trend} icon={kpi.icon} tone={kpi.tone} />
      ))}
    </AdminKpiGrid>
  );
};

export default AnnouncementKPIs;
