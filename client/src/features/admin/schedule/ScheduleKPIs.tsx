import React from "react";
import { CalendarEvent } from "@/services/scheduleService";
import { cn } from "@/lib/utils";

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
      description: "Department master roster",
      tag: "bg-muted/70 text-muted-foreground border-border/80",
    },
    {
      title: "Upcoming",
      value: upcomingCount,
      description:
        total > 0
          ? `${Math.round((upcomingCount / total) * 100)}% queued next`
          : "None queued",
      tag: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      title: "In Progress",
      value: ongoingCount,
      description:
        total > 0
          ? `${Math.round((ongoingCount / total) * 100)}% active operations`
          : "No active tasks",
      tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      title: "Completed",
      value: completedCount,
      description:
        total > 0
          ? `${Math.round((completedCount / total) * 100)}% concluded`
          : "0 completed",
      tag: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
      {kpis.map((kpi, idx) => (
        <div
          key={kpi.title}
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
                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                kpi.tag
              )}
            >
              {kpi.title}
            </span>
          </div>

          <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight tabular-nums">
            {kpi.value}
          </div>

          <div className="text-[11px] text-muted-foreground font-medium truncate">
            {kpi.description}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ScheduleKPIs;
