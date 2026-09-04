import React from "react";
import { CalendarDays, Lock, Users, Truck } from "lucide-react";
import { CalendarEvent } from "@/services/scheduleService";
import { cn } from "@/lib/utils";

interface ScheduleKPIsProps {
  events: CalendarEvent[];
}

export const ScheduleKPIs: React.FC<ScheduleKPIsProps> = ({ events }) => {
  const total = events.length;
  const privateCount = events.filter((e) => e.event_type === "PRIVATE_EVENT").length;
  const communityCount = events.filter((e) => e.event_type === "COMMUNITY_EVENT").length;
  const collectionCount = events.filter((e) => e.event_type === "COLLECTION_SCHEDULE").length;

  const kpis = [
    {
      title: "Total Schedules",
      value: total,
      description: "Active calendar entries",
      icon: CalendarDays,
      iconBox: "bg-primary/10 text-primary border-primary/20",
    },
    {
      title: "MENRO Private",
      value: privateCount,
      description: "Internal department only",
      icon: Lock,
      iconBox: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      title: "Public Community",
      value: communityCount,
      description: "Visible to all residents",
      icon: Users,
      iconBox: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      title: "Collection Routes",
      value: collectionCount,
      description: "Sector dispatch schedules",
      icon: Truck,
      iconBox: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.title}
            className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider truncate">
                {kpi.title}
              </span>
              <div
                className={cn(
                  "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
                  kpi.iconBox
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums">
              {kpi.value}
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

export default ScheduleKPIs;
