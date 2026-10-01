import { collectorBadgeClassName } from "@/features/collector/components/collectorBadgeStyles";
import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import { Truck, ShieldCheck, Wrench, Building2 } from "lucide-react";
import { isNonBiodegradable } from "../dashboard.utils";

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
  if (!data) {
    return (
      <div className={`rounded-2xl border border-dashed border-border/80 bg-card p-5 sm:p-6 text-center shadow-xs ${className || ""}`}>
        <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-2.5 text-muted-foreground border border-border/50">
          <Truck className="w-4 h-4" />
        </div>
        <p className="text-sm font-semibold text-foreground font-body">No truck assigned</p>
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
          <h3 className="gw-heading text-sm text-foreground tracking-tight truncate">
            Assigned vehicle
          </h3>
        </div>
        {isUnderMaintenance ? (
          <span className={collectorBadgeClassName + " " + getStatusBadgeStyle("Under maintenance").className}>
            <Wrench className="w-3 h-3" /> Under maintenance
          </span>
        ) : data.availabilityStatus === "ACTIVE" ? (
          <span className={collectorBadgeClassName + " " + getStatusBadgeStyle("Road ready").className}>
            <ShieldCheck className="w-3 h-3" /> Road ready
          </span>
        ) : <span className="text-xs text-muted-foreground">Readiness unavailable</span>}
      </div>

      {/* Middle: Balanced 3-Column Vehicle Telemetry Grid */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 my-auto py-2">
        <div className="p-1.5 sm:p-2.5 md:p-3 rounded-xl bg-muted/25 border border-border/60 flex flex-col justify-between min-w-0">
          <span className="text-[9px] sm:text-ui-overline font-semibold text-muted-foreground uppercase tracking-tight sm:tracking-wider leading-none truncate">
            Unit name
          </span>
          <div className="min-w-0 mt-1">
            <p className="text-xs sm:text-sm font-semibold text-foreground font-body leading-tight break-words [overflow-wrap:anywhere]">
              {data.name || "Truck"}
            </p>
            <p className="text-ui-overline sm:text-ui-caption text-muted-foreground mt-0.5 leading-tight truncate">
              {data.model || "Model unavailable"}
            </p>
          </div>
        </div>

        <div className="p-1.5 sm:p-2.5 md:p-3 rounded-xl bg-muted/25 border border-border/60 flex flex-col justify-between min-w-0">
          <span className="text-[9px] sm:text-ui-overline font-semibold text-muted-foreground uppercase tracking-tight sm:tracking-wider leading-none truncate">
            Plate number
          </span>
          <div className="min-w-0 mt-1">
            <p className="text-xs sm:text-sm font-semibold tabular-nums text-foreground leading-tight break-words [overflow-wrap:anywhere]">
              {data.plateNumber || "Unavailable"}
            </p>
            <p className="text-ui-overline sm:text-ui-caption text-muted-foreground mt-0.5 leading-tight truncate">
              Registered
            </p>
          </div>
        </div>

        <div className="p-1.5 sm:p-2.5 md:p-3 rounded-xl bg-muted/25 border border-border/60 flex flex-col justify-between min-w-0">
          <span className="text-[9px] sm:text-ui-overline font-semibold text-muted-foreground uppercase tracking-tight sm:tracking-wider leading-none truncate">
            Assigned load
          </span>
          <div className="min-w-0 mt-1">
            <p className={`text-xs sm:text-sm font-semibold font-body leading-tight break-words [overflow-wrap:anywhere] ${isNonBiodegradable(data.wasteType) ? "text-amber-700 dark:text-amber-300" : "text-foreground"}`}>
              {data.wasteType || "General waste"}
            </p>
            <p className="text-ui-overline sm:text-ui-caption text-muted-foreground mt-0.5 leading-tight truncate">
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
            className="gw-action-destructive-outline inline-flex items-center justify-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0"
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
