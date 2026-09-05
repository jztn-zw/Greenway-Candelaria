import {
  Truck as TruckIcon,
  User,
  Edit2,
  Wrench,
  CheckCircle2,
  CalendarDays,
  Recycle,
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

      {/* ── Truck Profile Bento Card ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 pb-6 border-b border-border/60">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-xs">
              <TruckIcon className="w-8 h-8" />
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
              className="h-9 px-3.5 rounded-xl border-border/80 hover:bg-muted font-semibold text-xs gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus(truck)}
              className="h-9 px-3.5 rounded-xl border-border/80 hover:bg-muted font-semibold text-xs gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            >
              {truck.status === "Active" ? (
                <>
                  <Wrench className="w-3.5 h-3.5 text-amber-500" /> Mark Under Maintenance
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Mark as Active
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Metadata Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TruckIcon className="w-3.5 h-3.5 text-primary" /> Plate Number
            </p>
            <p className="text-sm font-semibold font-mono text-foreground">
              {truck.plateNumber}
            </p>
          </div>

          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" /> Assigned Driver
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {driver ? driver.fullName : "Unassigned"}
            </p>
          </div>

          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Recycle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Waste Category
            </p>
            <p className="text-sm font-semibold text-foreground">
              {truck.wasteType}
            </p>
          </div>

          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-primary" /> Date Added
            </p>
            <p className="text-sm font-semibold text-foreground">
              {truck.dateAdded || "N/A"}
            </p>
          </div>

          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Fleet Status</p>
            <p className="text-sm font-semibold text-foreground">
              {truck.status === "Active" ? "Operational Fleet" : "Under Service / Maintenance"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruckDetailView;
