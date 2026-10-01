import React from "react";
import { useCountUp } from "@/features/admin/dashboard/components/useCountUp";
import { useAnalyticsData } from "./AnalyticsDataContext";
import { cn } from "@/lib/utils";

const Kpi = ({ label, value, suffix = "", helper, tone, index }: { label: string; value: number; suffix?: string; helper: string; tone: string; index: number }) => {
  const animated = useCountUp(value);
  return (
    <article className={cn(
      "min-w-0 p-4 sm:p-5 flex flex-col justify-between space-y-2.5 transition-colors hover:bg-muted/15",
      index % 2 === 0 && "border-r border-border/70",
      index < 3 ? "lg:border-r lg:border-border/70" : "lg:border-r-0",
      index < 2 && "border-b lg:border-b-0 border-border/70",
    )}>
      <div className="flex items-center min-h-[22px]">
        <span className={cn("text-ui-overline font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border", tone)}>{label}</span>
      </div>
      <p className="gw-stat-value text-2xl sm:text-3xl text-foreground tracking-tight tabular-nums">{animated.toLocaleString()}{suffix}</p>
      <p className="text-ui-caption text-muted-foreground font-medium">{helper}</p>
    </article>
  );
};

const AnalyticsSummaryKPIs: React.FC = () => {
  const { overview } = useAnalyticsData();
  return (
  <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
    <Kpi index={0} label="Scheduled stops" value={overview.scheduledStops} helper="Route stops this period" tone="bg-muted/70 text-muted-foreground border-border/80" />
    <Kpi index={1} label="Collection rate" value={overview.completionRate} suffix="%" helper={`${overview.completedStops} ${overview.completedStops === 1 ? "stop" : "stops"} completed`} tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" />
    <Kpi index={2} label="Missed stops" value={overview.missedStops} helper="Requires collection follow-up" tone="bg-destructive/10 text-destructive border-destructive/20" />
    <Kpi index={3} label="Open reports now" value={overview.openReports} helper="Current queue awaiting resolution" tone="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20" />
  </div>
  );
};

export default AnalyticsSummaryKPIs;
