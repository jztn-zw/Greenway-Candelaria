import { Truck, ShieldCheck, AlertTriangle, AlertCircle } from "lucide-react";
import type { TruckStatusData } from "./mockData";

const conditionConfig = {
  good: { label: "Good", icon: ShieldCheck, cls: "bg-primary/10 text-primary" },
  "needs-inspection": { label: "Needs Inspection", icon: AlertTriangle, cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400" },
  "issue-reported": { label: "Issue Reported", icon: AlertCircle, cls: "bg-destructive/10 text-destructive" },
};

const TruckStatusCard = ({ data }: { data: TruckStatusData }) => {
  const c = conditionConfig[data.condition];
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Truck className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{data.name}</p>
          <p className="text-xs text-muted-foreground">{data.plateNumber}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${c.cls}`}>
          <c.icon className="w-3 h-3" />
          {c.label}
        </div>
        <span className="text-[11px] text-muted-foreground">Last inspection: {data.lastInspection}</span>
      </div>
    </div>
  );
};

export default TruckStatusCard;
