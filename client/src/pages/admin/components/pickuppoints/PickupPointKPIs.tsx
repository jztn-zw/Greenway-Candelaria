import { MapPin, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import type { PickupPoint } from "./types";

interface PickupPointKPIsProps {
  points: PickupPoint[];
}

const PickupPointKPIs = ({ points }: PickupPointKPIsProps) => {
  const verified = points.filter((p) => p.status === "verified").length;
  const pending = points.filter((p) => p.status === "pending").length;
  const flagged = points.filter((p) => p.flagged).length;

  const kpis = [
    {
      label: "Total Points",
      value: points.length,
      trend: "+3 this week",
      icon: MapPin,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Verified",
      value: verified,
      trend: `${Math.round((verified / Math.max(points.length, 1)) * 100)}% of total`,
      icon: CheckCircle2,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Pending Review",
      value: pending,
      trend: "Needs attention",
      icon: Clock,
      accent: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Flagged Areas",
      value: flagged,
      trend: "Problem spots",
      icon: AlertTriangle,
      accent: "bg-destructive/10 text-destructive",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
              <p className="text-2xl font-bold font-display text-foreground mt-2 tabular-nums">{kpi.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1.5">{kpi.trend}</p>
            </div>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${kpi.accent}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PickupPointKPIs;
