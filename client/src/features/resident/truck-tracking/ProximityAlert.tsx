import { Truck, Clock, MapPin, Radio } from "lucide-react";
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
    <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-3 sm:p-4 shadow-sm transition-all animate-in fade-in-50">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-xs mt-0.5 sm:mt-0">
            <Truck className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                Approaching Area
              </span>
              {truck.eta !== null && (
                <span className="sm:hidden text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                  ~{truck.eta} mins
                </span>
              )}
              <span className="text-xs font-semibold text-foreground truncate">
                {truck.name} ({truck.plateNumber})
              </span>
            </div>

            <p className="text-xs sm:text-sm font-display font-bold text-foreground mt-0.5">
              Collection truck is {truck.barangaysAway} barangay{truck.barangaysAway > 1 ? "s" : ""} away
            </p>

            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Please prepare your segregated waste containers outside for pickup now.
            </p>
          </div>
        </div>

        {truck.eta !== null && (
          <div className="hidden sm:flex flex-col items-end shrink-0 bg-background/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-emerald-500/20 shadow-2xs">
            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-600" />
              Est. Arrival
            </span>
            <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
              ~{truck.eta} mins
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProximityAlert;
