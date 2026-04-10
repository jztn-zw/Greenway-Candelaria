import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, User, MessageSquare, ChevronDown, ChevronUp, CheckCircle2, Circle, Loader2, AlertTriangle } from "lucide-react";
import type { Truck as TruckType, RouteStopInfo } from "./types";
import { cn } from "@/lib/utils";

interface TruckCardProps {
  truck: TruckType;
  isSelected: boolean;
  onClick: () => void;
}

const statusConfig = {
  scheduled: { label: "Scheduled", className: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400" },
  "on-the-way": { label: "On The Way", className: "bg-primary/10 text-primary border-primary/20" },
  done: { label: "Done", className: "bg-leaf/10 text-leaf border-leaf/20" },
  offline: { label: "Offline", className: "bg-muted text-muted-foreground border-border" },
};

const TruckCard = ({ truck, isSelected, onClick }: TruckCardProps) => {
  const [routeExpanded, setRouteExpanded] = useState(false);
  const status = statusConfig[truck.status];
  const hasDriver = truck.driver && truck.driver.length > 0;
  const hasArea = truck.assignedArea && truck.assignedArea.length > 0;
  const hasWaste = truck.wasteType && truck.wasteType.length > 0;
  const progressPercent = truck.totalBarangays > 0 ? (truck.completedBarangays / truck.totalBarangays) * 100 : 0;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-200 border group",
        isSelected
          ? "border-primary ring-2 ring-primary/15 bg-primary/[0.02] shadow-md"
          : "border-border hover:border-primary/30 hover:shadow-sm"
      )}
    >
      <CardContent className="p-3.5 sm:p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
              truck.status === "on-the-way" ? "bg-primary/15" : "bg-muted"
            )}>
              <Truck className={cn(
                "w-4 h-4",
                truck.status === "on-the-way" ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-display font-semibold text-foreground truncate">{truck.name}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{truck.plateNumber}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 shrink-0 font-medium rounded-full", status.className)}>
            {status.label}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className={!hasArea ? "italic text-muted-foreground/60" : ""}>
              {hasArea ? truck.assignedArea : "No route assigned"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className={!hasDriver ? "italic text-muted-foreground/60" : ""}>
              {hasDriver ? truck.driver : "No driver assigned"}
            </span>
          </div>
          {hasWaste && (
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3.5 h-3.5 rounded-full bg-primary/20 shrink-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
              <span className="text-foreground font-medium">{truck.wasteType}</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {truck.totalBarangays > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground tabular-nums">
                {truck.completedBarangays}/{truck.totalBarangays} barangays
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  truck.status === "done" ? "bg-leaf" : "bg-primary"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Driver message */}
        {truck.driverMessage && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sand border border-border">
            <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground italic leading-relaxed">"{truck.driverMessage}"</p>
          </div>
        )}

        {/* ETA for resident's truck */}
        {truck.isResidentTruck && truck.status === "on-the-way" && (
          <div className={cn(
            "flex items-center gap-2.5 p-2.5 rounded-lg border",
            truck.arrivedAtResident
              ? "bg-primary/10 border-primary/20"
              : "bg-primary/5 border-primary/10"
          )}>
            <div className={cn(
              "w-2.5 h-2.5 rounded-full shrink-0",
              truck.arrivedAtResident ? "bg-primary" : "bg-primary animate-pulse"
            )} />
            <p className={cn(
              "text-xs font-semibold",
              truck.arrivedAtResident ? "text-primary" : "text-primary"
            )}>
              {truck.arrivedAtResident
                ? "🎉 The truck is in your area now!"
                : truck.eta !== null
                  ? `Est. arrival to your area: ~${truck.eta} min`
                  : "Calculating ETA..."}
            </p>
          </div>
        )}

        {/* Route dropdown */}
        {truck.routeStops.length > 0 && (
          <div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRouteExpanded(!routeExpanded);
              }}
              className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <span>Route Details ({truck.routeStops.length} stops)</span>
              {routeExpanded
                ? <ChevronUp className="w-3.5 h-3.5" />
                : <ChevronDown className="w-3.5 h-3.5" />
              }
            </button>
            {routeExpanded && (
              <div className="mt-1.5 border border-border rounded-lg overflow-hidden bg-card divide-y divide-border">
                {truck.routeStops.map((stop, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-xs",
                      stop.status === "skipped" && "bg-yellow-500/5",
                      stop.status === "done" && "bg-primary/5"
                    )}
                  >
                    {stop.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                    {stop.status === "in-progress" && <Loader2 className="w-3.5 h-3.5 text-primary shrink-0 animate-spin" />}
                    {stop.status === "skipped" && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                    {stop.status === "not-started" && <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />}
                    <span className={cn(
                      "flex-1",
                      stop.status === "done" && "text-primary font-medium line-through decoration-primary/30",
                      stop.status === "in-progress" && "text-primary font-semibold",
                      stop.status === "skipped" && "text-yellow-600 font-medium",
                      stop.status === "not-started" && "text-foreground"
                    )}>
                      {stop.barangay}
                    </span>
                    {stop.status === "done" && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 font-medium">
                        Done
                      </Badge>
                    )}
                    {stop.status === "skipped" && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-medium">
                        Skipped
                      </Badge>
                    )}
                    {stop.completedAt && stop.status === "done" && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">{stop.completedAt}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TruckCard;
