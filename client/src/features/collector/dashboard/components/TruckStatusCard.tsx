import { Truck, ShieldCheck, Wrench, AlertCircle } from "lucide-react";

export interface TruckCardProps {
  name?: string;
  plateNumber?: string;
  model?: string;
  status?: string;
  availabilityStatus?: string;
}

const TruckStatusCard = ({ data }: { data?: TruckCardProps | null }) => {
  if (!data || !data.plateNumber) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No Truck Assigned</p>
            <p className="text-xs text-muted-foreground">Please ask your supervisor for a truck assignment</p>
          </div>
        </div>
      </div>
    );
  }

  const isUnderMaintenance = data.availabilityStatus === "UNDER_MAINTENANCE";

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{data.name || "Assigned Truck"}</p>
            <p className="text-xs text-muted-foreground font-mono">{data.plateNumber} {data.model ? `· ${data.model}` : ""}</p>
          </div>
        </div>

        <div>
          {isUnderMaintenance ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
              <Wrench className="w-3 h-3" /> Under Maintenance
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <ShieldCheck className="w-3 h-3" /> Operational
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TruckStatusCard;
