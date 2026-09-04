import React from "react";
import { CheckCircle2, TrendingUp, FileCheck, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useCountUp } from "@/features/admin/dashboard/components/useCountUp";
import { cn } from "@/lib/utils";

interface SummaryCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  trend: { value: number; up: boolean };
  accent: string;
}

const SummaryCard = ({
  label,
  value,
  suffix = "",
  icon: Icon,
  trend,
  accent,
}: SummaryCardProps) => {
  const animated = useCountUp(value);

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
      {/* Top Row: Label on Left, Themed Squircle Icon on Right */}
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-semibold uppercase tracking-wider truncate">
          {label}
        </span>
        <div
          className={cn(
            "w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
            accent
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      {/* Middle Row: Primary Metric */}
      <div className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums">
        {animated.toLocaleString()}
        {suffix}
      </div>

      {/* Bottom Row: Trend Pill & Subtitle */}
      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
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
        <span className="truncate">vs prev. period</span>
      </div>
    </div>
  );
};

const AnalyticsSummaryKPIs: React.FC = () => {
  const cards: SummaryCardProps[] = [
    {
      label: "Total Collections",
      value: 648,
      icon: CheckCircle2,
      trend: { value: 8, up: true },
      accent: "bg-primary/10 text-primary border-primary/20",
    },
    {
      label: "Completion Rate",
      value: 87,
      suffix: "%",
      icon: TrendingUp,
      trend: { value: 3, up: true },
      accent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Reports Resolved",
      value: 42,
      icon: FileCheck,
      trend: { value: 12, up: true },
      accent: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    },
    {
      label: "Avg Resolution",
      value: 2.9,
      suffix: " days",
      icon: Clock,
      trend: { value: 15, up: true },
      accent: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c) => (
        <SummaryCard key={c.label} {...c} />
      ))}
    </div>
  );
};

export default AnalyticsSummaryKPIs;
