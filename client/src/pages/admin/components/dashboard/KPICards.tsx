import { Truck, FileText, Clock, Users, CheckCircle } from "lucide-react";
import { useCountUp } from "./useCountUp";

interface KPICardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
  trend: { value: number; up: boolean };
  accent: string;
}

const KPICard = ({ label, value, suffix = "", icon: Icon, trend, accent }: KPICardProps) => {
  const animated = useCountUp(value);
  return (
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
            {animated.toLocaleString()}{suffix}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <span className={`text-[10px] font-medium ${trend.up ? "text-primary" : "text-destructive"}`}>
              {trend.up ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
            <span className="text-[10px] text-muted-foreground">vs yesterday</span>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const KPICards = () => {
  const kpis: KPICardProps[] = [
    { label: "Active Trucks Today", value: 2, icon: Truck, trend: { value: 0, up: true }, accent: "bg-primary/10 text-primary" },
    { label: "Reports Submitted Today", value: 12, icon: FileText, trend: { value: 15, up: true }, accent: "bg-primary/10 text-primary" },
    { label: "Pending Reports", value: 7, icon: Clock, trend: { value: 8, up: false }, accent: "bg-amber-500/10 text-amber-600" },
    { label: "Registered Residents", value: 1234, icon: Users, trend: { value: 3, up: true }, accent: "bg-primary/10 text-primary" },
    { label: "Collection Completion", value: 85, suffix: "%", icon: CheckCircle, trend: { value: 5, up: true }, accent: "bg-primary/10 text-primary" },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {kpis.map((kpi) => (
        <KPICard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
};

export default KPICards;
