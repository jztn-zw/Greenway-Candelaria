import { Truck, ShieldCheck, Wrench, Building2 } from "lucide-react";

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
  className?: string;
}

const TruckStatusCard = ({ data, onReportIssue, className }: Props) => {
  if (!data || !data.plateNumber) {
    return (
      <div className={`rounded-2xl border border-dashed border-border/80 bg-card p-5 sm:p-6 text-center shadow-xs ${className || ""}`}>
        <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-2.5 text-muted-foreground border border-border/50">
          <Truck className="w-4 h-4" />
        </div>
        <p className="text-sm font-bold text-foreground font-display">No truck assigned</p>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-xs mx-auto">
          Contact your MENRO supervisor or dispatch office for your daily vehicle assignment.
        </p>
      </div>
    );
  }

  const isUnderMaintenance =
    data.availabilityStatus === "UNDER_MAINTENANCE" ||
    data.status === "MAINTENANCE" ||
    data.status === "INACTIVE";

  return (
    <div className={`rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between ${className || ""}`}>
      {/* Header: Title + Road Readiness Status */}
      <div className="flex items-center justify-between pb-3 border-b border-border/50 shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Truck className="w-4 h-4 text-primary shrink-0" />
          <h3 className="text-xs font-bold text-foreground font-display tracking-tight truncate">
            Assigned vehicle
          </h3>
        </div>
        {isUnderMaintenance ? (
          <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/25 shrink-0">
            <Wrench className="w-3 h-3" /> Under maintenance
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
            <ShieldCheck className="w-3 h-3" /> Road ready
          </span>
        )}
      </div>

      {/* Middle: Balanced 3-Column Vehicle Telemetry Grid */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 my-auto py-2">
        <div className="p-1.5 sm:p-2.5 md:p-3 rounded-xl bg-muted/25 border border-border/60 flex flex-col justify-between min-w-0">
          <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-tight sm:tracking-wider leading-none truncate">
            Unit name
          </span>
          <div className="min-w-0 mt-1">
            <p className="text-xs sm:text-sm font-bold text-foreground font-display leading-tight break-words [overflow-wrap:anywhere]">
              {data.name || "Truck"}
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">
              {data.model || "Compactor"}
            </p>
          </div>
        </div>

        <div className="p-1.5 sm:p-2.5 md:p-3 rounded-xl bg-muted/25 border border-border/60 flex flex-col justify-between min-w-0">
          <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-tight sm:tracking-wider leading-none truncate">
            Plate number
          </span>
          <div className="min-w-0 mt-1">
            <p className="text-xs sm:text-sm font-bold font-mono text-foreground leading-tight break-words [overflow-wrap:anywhere]">
              {data.plateNumber}
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">
              Registered
            </p>
          </div>
        </div>

        <div className="p-1.5 sm:p-2.5 md:p-3 rounded-xl bg-muted/25 border border-border/60 flex flex-col justify-between min-w-0">
          <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase tracking-tight sm:tracking-wider leading-none truncate">
            Assigned load
          </span>
          <div className="min-w-0 mt-1">
            <p className="text-xs sm:text-sm font-bold text-foreground font-display leading-tight break-words [overflow-wrap:anywhere]">
              {data.wasteType || "General waste"}
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">
              MENRO fleet
            </p>
          </div>
        </div>
      </div>

      {/* Footer: Contextual Prompt & Breakdown Action */}
      <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
          <Building2 className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
          <span className="truncate">Candelaria MENRO</span>
        </div>

        {onReportIssue && (
          <button
            type="button"
            onClick={onReportIssue}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-xl text-xs font-semibold text-destructive bg-destructive/10 hover:bg-destructive/15 border border-destructive/20 transition-all cursor-pointer active:scale-98 shrink-0"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Report breakdown</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TruckStatusCard;
