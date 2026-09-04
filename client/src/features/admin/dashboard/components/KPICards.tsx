import React from "react";
import { Truck, FileText, Clock, Users, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useCountUp } from "./useCountUp";
import { AnalyticsOverview, ReportsAnalytics } from "./useAdminDashboard";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  trend?: { value: number; up: boolean };
  subtitle: string;
  color: string;
  bg: string;
}

const KPICard = ({
  label,
  value,
  suffix = "",
  icon: Icon,
  trend,
  subtitle,
  color,
  bg,
}: KPICardProps) => {
  const animated = useCountUp(value);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-semibold uppercase tracking-wider truncate">
          {label}
        </span>
        <div
          className={cn(
            "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
            bg
          )}
        >
          <Icon className={cn("w-4 h-4", color)} />
        </div>
      </div>
      <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums">
        {animated.toLocaleString()}
        {suffix}
      </div>
      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
        {trend && (
          <span
            className={cn(
              "inline-flex items-center font-bold text-[10px] px-1.5 py-0.2 rounded-md",
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
  const pendingReports = overview?.reports?.pending ?? 0;
  const activeTrucks = overview?.trucks?.active ?? 0;
  const totalTrucks = overview?.trucks?.total ?? 0;
  const totalResidents = overview?.users?.residents ?? 0;

  const kpis: KPICardProps[] = [
    {
      label: "Total Reports",
      value: totalReports,
      icon: FileText,
      subtitle: "Incident records",
      color: "text-primary",
      bg: "bg-primary/10 text-primary border-primary/20",
    },
    {
      label: "Pending Triage",
      value: pendingReports,
      icon: Clock,
      subtitle: "Requires action",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    {
      label: "Active Fleet",
      value: activeTrucks,
      icon: Truck,
      subtitle: `${totalTrucks} registered trucks`,
      color: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    },
    {
      label: "Registered Residents",
      value: totalResidents,
      icon: Users,
      subtitle: "Verified accounts",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
};

export default KPICards;
