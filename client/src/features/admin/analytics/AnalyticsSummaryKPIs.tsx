import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useCountUp } from "@/features/admin/dashboard/components/useCountUp";
import { cn } from "@/lib/utils";

interface SummarySegmentProps {
  label: string;
  value: number;
  suffix?: string;
  trend: { value: number; up: boolean };
  tag: string;
  idx: number;
}

const SummarySegment = ({
  label,
  value,
  suffix = "",
  trend,
  tag,
  idx,
}: SummarySegmentProps) => {
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
  const cards = [
    {
      label: "Total Collections",
      value: 648,
      trend: { value: 8, up: true },
      tag: "bg-muted/70 text-muted-foreground border-border/80",
    },
    {
      label: "Completion Rate",
      value: 87,
      suffix: "%",
      trend: { value: 3, up: true },
      tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      label: "Reports Resolved",
      value: 42,
      trend: { value: 12, up: true },
      tag: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    },
    {
      label: "Avg Resolution",
      value: 2.9,
      suffix: " days",
      trend: { value: 15, up: true },
      tag: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
      {cards.map((c, idx) => (
        <SummarySegment key={c.label} {...c} idx={idx} />
      ))}
    </div>
  );
};

export default AnalyticsSummaryKPIs;
