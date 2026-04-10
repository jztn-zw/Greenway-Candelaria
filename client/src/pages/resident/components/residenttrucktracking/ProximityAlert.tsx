import { Truck, AlertTriangle } from "lucide-react";
import type { Truck as TruckType } from "./types";

interface ProximityAlertProps {
  truck: TruckType;
}

const ProximityAlert = ({ truck }: ProximityAlertProps) => {
  if (!truck.isResidentTruck || truck.status !== "on-the-way" || !truck.barangaysAway || truck.barangaysAway > 3) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 border-2 border-primary/25 animate-fade-in shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
        <Truck className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-display font-bold text-foreground">
          🚛 Truck is {truck.barangaysAway} barangay{truck.barangaysAway > 1 ? "s" : ""} away!
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Please prepare your garbage for collection now.
        </p>
      </div>
      <div className="w-3 h-3 rounded-full bg-primary animate-pulse shrink-0" />
    </div>
  );
};

export default ProximityAlert;
