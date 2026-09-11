import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useCountUp } from "./useCountUp";
import { AnalyticsOverview, ReportsAnalytics } from "./useAdminDashboard";
import { cn } from "@/lib/utils";

interface KPISegmentProps {
  label: string;
  value: number;
  suffix?: string;
  trend?: { value: number; up: boolean };
  subtitle: string;
  tag: string;
  idx: number;
}

const KPISegment = ({
  label,
  value,
  suffix = "",
  trend,
  subtitle,
  tag,
  idx,
}: KPISegmentProps) => {
  const animated = useCountUp(value);

  return (
    <div
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
            tag
          )}
        >
          {label}
        </span>
      </div>

      <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-tight tabular-nums">
        {animated.toLocaleString()}
        {suffix}
      </div>

      <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5 flex-wrap">
        {trend && (
          <span
            className={cn(
              "inline-flex items-center font-bold text-[10px] px-1.5 py-0.5 rounded-md",
              trend.up
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {trend.up ? (
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3 h-3 mr-0.5" />
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
        <span className="truncate">{subtitle}</span>
      </div>
    </div>
  );
};

interface KPICardsProps {
  overview?: AnalyticsOverview | null;
  reportsAnalytics?: ReportsAnalytics | null;
}

const KPICards = ({ overview, reportsAnalytics }: KPICardsProps) => {
  const totalReports = overview?.reports?.total ?? reportsAnalytics?.total ?? 0;
  const resolvedReports = overview?.reports?.resolved ?? reportsAnalytics?.resolved ?? 0;
  const rawResolutionRate = reportsAnalytics?.resolution_rate
    ? parseFloat(reportsAnalytics.resolution_rate.replace("%", ""))
    : (totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 100);
  const activeTrucks = overview?.trucks?.active ?? 0;
  const totalTrucks = overview?.trucks?.total ?? 0;
  const totalResidents = overview?.users?.residents ?? 0;

  const kpis = [
    {
      label: "Total Reports",
      value: totalReports,
      subtitle: "Incidents logged",
      tag: "bg-muted/70 text-muted-foreground border-border/80",
    },
    {
      label: "Resolution Rate",
      value: Math.round(rawResolutionRate),
      suffix: "%",
      subtitle: `${resolvedReports} resolved cases`,
      tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Active Fleet",
      value: activeTrucks,
      subtitle: `${totalTrucks} registered trucks`,
      tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Registered Residents",
      value: totalResidents,
      subtitle: "Verified community accounts",
      tag: "bg-muted/70 text-muted-foreground border-border/80",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
      {kpis.map((kpi, idx) => (
        <KPISegment key={kpi.label} {...kpi} idx={idx} />
      ))}
    </div>
  );
};

export default KPICards;
