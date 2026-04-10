import { CheckCircle, TrendingUp, FileCheck, Clock } from "lucide-react";
import { useCountUp } from "../dashboard/useCountUp";

interface SummaryCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  trend: { value: number; up: boolean };
  accent: string;
}

const SummaryCard = ({ label, value, suffix = "", icon: Icon, trend, accent }: SummaryCardProps) => {
  const animated = useCountUp(value);
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums font-display">
            {animated.toLocaleString()}{suffix}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className={`text-[10px] font-medium ${trend.up ? "text-primary" : "text-destructive"}`}>
              {trend.up ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
            <span className="text-[10px] text-muted-foreground">vs prev. period</span>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const AnalyticsSummaryKPIs = () => {
  const cards: SummaryCardProps[] = [
    { label: "Total Collections", value: 648, icon: CheckCircle, trend: { value: 8, up: true }, accent: "bg-primary/10 text-primary" },
    { label: "Completion Rate", value: 87, suffix: "%", icon: TrendingUp, trend: { value: 3, up: true }, accent: "bg-primary/10 text-primary" },
    { label: "Reports Resolved", value: 42, icon: FileCheck, trend: { value: 12, up: true }, accent: "bg-primary/10 text-primary" },
    { label: "Avg Resolution", value: 2.9, suffix: " days", icon: Clock, trend: { value: 15, up: true }, accent: "bg-amber-500/10 text-amber-600" },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => <SummaryCard key={c.label} {...c} />)}
    </div>
  );
};

export default AnalyticsSummaryKPIs;
