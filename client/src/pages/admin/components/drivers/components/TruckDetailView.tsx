import {
  ArrowLeft, Truck as TruckIcon, User, Edit2, Wrench, CheckCircle2, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Truck, Driver } from "../types";

interface TruckDetailViewProps {
  truck: Truck;
  drivers: Driver[];
  onBack: () => void;
  onEdit: (t: Truck) => void;
  onToggleStatus: (t: Truck) => void;
}

const TruckDetailView = ({ truck, drivers, onBack, onEdit, onToggleStatus }: TruckDetailViewProps) => {
  const driver = drivers.find(d => d.id === truck.assignedDriverId);

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Trucks
      </Button>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <TruckIcon className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">{truck.name}</h2>
              <p className="text-sm text-muted-foreground">{truck.model}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(truck)} className="gap-1.5">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onToggleStatus(truck)} className="gap-1.5">
              {truck.status === "Active"
                ? <><Wrench className="w-3.5 h-3.5" /> Mark Under Maintenance</>
                : <><CheckCircle2 className="w-3.5 h-3.5" /> Mark as Active</>}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><TruckIcon className="w-3 h-3" /> Plate Number</p>
            <p className="text-sm font-medium">{truck.plateNumber}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="w-3 h-3" /> Assigned Driver</p>
            <p className="text-sm font-medium">{driver ? driver.fullName : "Unassigned"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Waste Type</p>
            <p className="text-sm font-medium">{truck.wasteType}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Date Added</p>
            <p className="text-sm font-medium">{truck.dateAdded}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant="outline" className={truck.status === "Active"
              ? "bg-[hsl(var(--leaf))]/10 text-[hsl(var(--leaf))] border-[hsl(var(--leaf))]/20"
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
            }>{truck.status}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruckDetailView;
