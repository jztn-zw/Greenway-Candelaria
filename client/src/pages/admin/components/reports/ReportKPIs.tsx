import { FileText, Clock, Truck, CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";
import { WasteReport } from "./types";

interface ReportKPIsProps {
  reports: WasteReport[];
}

const ReportKPIs = ({ reports }: ReportKPIsProps) => {
  const total = reports.length;
  const submitted = reports.filter((r) => r.status === "Submitted").length;
  const underReview = reports.filter((r) => r.status === "Under Review").length;
  const dispatched = reports.filter((r) => r.status === "Dispatched").length;
  const resolved = reports.filter((r) => r.status === "Resolved").length;

  const kpis = [
    {
      label: "Total Reports",
      value: total,
      icon: FileText,
      trend: "+12.5%",
      trendUp: true,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Pending Review",
      value: submitted + underReview,
      icon: Clock,
      trend: "-8.3%",
      trendUp: false,
      accent: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Dispatched",
      value: dispatched,
      icon: Truck,
      trend: "+4.1%",
      trendUp: true,
      accent: "bg-primary/10 text-primary",
    },
    {
      label: "Resolved",
      value: resolved,
      icon: CheckCircle2,
      trend: "+18.2%",
      trendUp: true,
      accent: "bg-primary/10 text-primary",
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
              <div className="flex items-center gap-1 mt-1.5">
                {kpi.trendUp ? (
                  <TrendingUp className="w-3 h-3 text-primary" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-destructive" />
                )}
                <span className={`text-[10px] font-medium ${kpi.trendUp ? "text-primary" : "text-destructive"}`}>
                  {kpi.trend}
                </span>
              </div>
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

export default ReportKPIs;
