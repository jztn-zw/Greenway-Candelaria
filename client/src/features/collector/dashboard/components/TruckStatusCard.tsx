import { Truck, ShieldCheck, Wrench, Sparkles } from "lucide-react";

export interface TruckCardProps {
  name?: string;
  plateNumber?: string;
  model?: string;
  status?: string;
  availabilityStatus?: string;
  wasteType?: string | null;
}

interface Props {
  data?: TruckCardProps | null;
  onReportIssue?: () => void;
}

const TruckStatusCard = ({ data }: Props) => {
  if (!data || !data.plateNumber) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-card p-5 text-center shadow-xs">
        <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-2 text-muted-foreground border border-border/50">
          <Truck className="w-5 h-5" />
        </div>
        <p className="text-sm font-bold text-foreground font-display">No Truck Assigned</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ask your MENRO supervisor or dispatch office for your vehicle assignment.
        </p>
      </div>
    );
  }

  const isUnderMaintenance =
    data.availabilityStatus === "UNDER_MAINTENANCE" ||
    data.status === "MAINTENANCE" ||
    data.status === "INACTIVE";

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-foreground font-display tracking-tight uppercase">
            Assigned Vehicle
          </h3>
        </div>
        {isUnderMaintenance ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/25">
            <Wrench className="w-3 h-3" /> Under Maintenance
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
            <ShieldCheck className="w-3 h-3" /> Road Ready
          </span>
        )}
      </div>

      {/* Main Vehicle Details */}
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
          <Truck className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-foreground font-display tracking-tight truncate">
            {data.name || "Waste Collection Truck"}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span className="font-mono font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/60">
              {data.plateNumber}
            </span>
            {data.model && <span>{data.model}</span>}
          </div>
        </div>
      </div>

      {/* Quick Status Note */}
      <div className="pt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>Assigned for Candelaria municipal collection operations</span>
      </div>
    </div>
  );
};

export default TruckStatusCard;

