import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/AdminKpiCards";
import React from "react";
import { CalendarEvent } from "@/services/scheduleService";
import { CalendarDays, CalendarClock, Clock3, CircleCheck } from "lucide-react";

interface ScheduleKPIsProps {
  events: CalendarEvent[];
}

export const ScheduleKPIs: React.FC<ScheduleKPIsProps> = ({ events }) => {
  const total = events.length;
  const upcomingCount = events.filter((e) => e.status === "UPCOMING").length;
  const ongoingCount = events.filter((e) => e.status === "ONGOING").length;
  const completedCount = events.filter((e) => e.status === "COMPLETED").length;

  const kpis = [
    {
      title: "Total Schedules",
      value: total,
      description: "All internal activities",
      icon: CalendarDays,
      tone: "neutral" as const,
    },
    {
      title: "Upcoming",
      value: upcomingCount,
      description:
        total > 0
          ? `${Math.round((upcomingCount / total) * 100)}% queued next`
          : "None queued",
      icon: CalendarClock,
      tone: "warning" as const,
    },
    {
      title: "In Progress",
      value: ongoingCount,
      description:
        total > 0
          ? `${Math.round((ongoingCount / total) * 100)}% active operations`
          : "No active tasks",
      icon: Clock3,
      tone: "info" as const,
    },
    {
      title: "Completed",
      value: completedCount,
      description:
        total > 0
          ? `${Math.round((completedCount / total) * 100)}% concluded`
          : "0 completed",
      icon: CircleCheck,
      tone: "success" as const,
    },
  ];

  return (
    <AdminKpiGrid>
      {kpis.map((kpi) => (
        <AdminKpiCard key={kpi.title} label={kpi.title} value={kpi.value}
          description={kpi.description} icon={kpi.icon} tone={kpi.tone} />
      ))}
    </AdminKpiGrid>
  );
};

export default ScheduleKPIs;
