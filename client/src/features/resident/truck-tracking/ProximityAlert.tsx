import { Truck } from "lucide-react";
import type { Truck as TruckType } from "./types";

interface ProximityAlertProps {
  truck: TruckType;
}

const ProximityAlert = ({ truck }: ProximityAlertProps) => {
  if (
    !truck.isResidentTruck ||
    truck.status !== "on-the-way" ||
    !truck.barangaysAway ||
    truck.barangaysAway > 3
  ) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 sm:p-4 shadow-2xs transition-all animate-in fade-in-50">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-2xs">
        <Truck className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-display font-bold text-foreground">Prepare for collection</p>
        <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
          Please place your segregated waste outside and keep the pickup area accessible.
        </p>
      </div>
    </div>
  );
};

export default ProximityAlert;
