import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, User, Clock, MapPin, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RouteData } from "../hooks/useRoutes";
import type { Truck as TruckType } from "../hooks/useTrucks";

interface RouteCardProps {
  route: RouteData;
  truck?: TruckType;
  isSelected: boolean;
  onClick: () => void;
}

const RouteCard = ({ route, truck, isSelected, onClick }: RouteCardProps) => (
  <Card
    onClick={onClick}
    className={cn(
      "cursor-pointer transition-all duration-200 border",
      !route.active && "opacity-50",
      isSelected
        ? "border-primary ring-1 ring-primary/20 bg-primary/[0.03]"
        : "border-border hover:border-primary/30 hover:shadow-sm"
    )}
  >
    <CardContent className="p-3.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {truck?.name ?? route.truckName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {truck?.plate_number ?? route.truckPlate}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {!route.active && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-destructive/30 text-destructive">
              Inactive
            </Badge>
          )}
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><User className="w-3 h-3" />{route.driverName}</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{route.startTime}</span>
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{route.barangays.length} barangays</span>
      </div>
    </CardContent>
  </Card>
);

export default RouteCard;
