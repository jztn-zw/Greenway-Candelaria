import {
  Truck as TruckIcon,
  User,
  Recycle,
  CalendarDays,
  ShieldCheck,
  Hash,
  Edit2,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/common";
import { Truck, Driver, truckStatusStyles } from "../types";

interface TruckDetailViewProps {
  truck: Truck;
  drivers: Driver[];
  onBack: () => void;
  onEdit: (t: Truck) => void;
  onToggleStatus: (t: Truck) => void;
}

const TruckDetailView = ({
  truck,
  drivers,
  onBack,
  onEdit,
  onToggleStatus,
}: TruckDetailViewProps) => {
  const driver = drivers.find((d) => d.id === truck.assignedDriverId);

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* ── Top Navigation & Page Header ── */}
      <div className="space-y-3">
        <BackButton label="Back to Trucks" onClick={onBack} />

        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight leading-tight">
            Truck Details
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vehicle specifications, operational availability, and assigned driver.
          </p>
        </div>
      </div>

      {/* ── Truck Profile Overview Card ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
              <TruckIcon className="w-7 h-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
                  {truck.name}
                </h2>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                    truckStatusStyles[truck.status] || ""
                  }`}
                >
                  {truck.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {truck.model}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(truck)}
              className="h-9 px-3.5 rounded-xl border-border/80 hover:bg-muted font-medium text-xs cursor-pointer active:scale-95 shadow-2xs gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
              Edit Truck
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus(truck)}
              className="h-9 px-3.5 rounded-xl border-border/80 hover:bg-muted font-medium text-xs cursor-pointer active:scale-95 shadow-2xs gap-1.5"
            >
              {truck.status === "Active" ? (
                <>
                  <Wrench className="w-3.5 h-3.5 text-muted-foreground" />
                  Mark Under Maintenance
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                  Mark as Active
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Structured Information Grid (2 Layers, Typography-Driven) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-6 pt-6 border-t border-border/60">
          {/* Layer 1: Vehicle Identification & Driver */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-muted-foreground/70" />
              Plate Number
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground font-sans tabular-nums font-semibold">
              {truck.plateNumber}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TruckIcon className="w-3.5 h-3.5 text-muted-foreground/70" />
              Vehicle Model
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground truncate">
              {truck.model}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground/70" />
              Assigned Driver
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground truncate">
              {driver ? (
                <span>
                  {driver.fullName}{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (@{driver.username})
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground italic">Unassigned</span>
              )}
            </p>
          </div>

          {/* Layer 2: Specifications & Operational Status */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Recycle className="w-3.5 h-3.5 text-muted-foreground/70" />
              Waste Category
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {truck.wasteType}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/70" />
              Date Added
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {truck.dateAdded || "N/A"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/70" />
              Fleet Status
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {truck.status === "Active" ? "Operational Fleet" : "Under Service / Maintenance"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruckDetailView;
