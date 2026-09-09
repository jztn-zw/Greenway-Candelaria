import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  MapPin,
  User,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  Clock,
  Radio,
} from "lucide-react";
import type { Truck as TruckType } from "./types";
import { cn } from "@/lib/utils";

interface TruckCardProps {
  truck: TruckType;
  isSelected: boolean;
  onClick: () => void;
}

const statusConfig = {
  scheduled: {
    label: "Scheduled",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  "on-the-way": {
    label: "On The Way",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  done: {
    label: "Completed",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  offline: {
    label: "Offline",
    className: "bg-muted text-muted-foreground border-border",
  },
};

const TruckCard = ({ truck, isSelected, onClick }: TruckCardProps) => {
  const [routeExpanded, setRouteExpanded] = useState(false);
  const status = statusConfig[truck.status] || statusConfig.offline;
  const hasDriver = Boolean(truck.driver && truck.driver.trim().length > 0);
  const hasArea = Boolean(truck.assignedArea && truck.assignedArea.trim().length > 0);
  const hasWaste = Boolean(truck.wasteType && truck.wasteType.trim().length > 0);
  const progressPercent =
    truck.totalBarangays > 0
      ? Math.min(100, Math.round((truck.completedBarangays / truck.totalBarangays) * 100))
      : 0;

  const isBio = truck.wasteType?.toLowerCase().includes("bio");
  const isNonBio =
    truck.wasteType?.toLowerCase().includes("non-bio") ||
    truck.wasteType?.toLowerCase().includes("recycl");

  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-200 border rounded-2xl group overflow-hidden",
        isSelected
          ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02] shadow-md"
          : "border-border/80 hover:border-primary/40 hover:shadow-xs bg-card"
      )}
    >
      <CardContent className="p-3.5 sm:p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cn(
                "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors border shadow-2xs",
                truck.status === "on-the-way"
                  ? "bg-primary/15 border-primary/25 text-primary"
                  : "bg-muted border-border/80 text-muted-foreground"
              )}
            >
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-display font-bold text-foreground truncate">
                {truck.name}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {truck.plateNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {truck.status === "on-the-way" && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
            )}
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-2 py-0.5 font-bold rounded-full border",
                status.className
              )}
            >
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Details List */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className={!hasArea ? "italic text-muted-foreground/60" : "font-medium text-foreground truncate"}>
              {hasArea ? truck.assignedArea : "No route assigned"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span className={!hasDriver ? "italic text-muted-foreground/60" : "text-muted-foreground truncate"}>
              {hasDriver ? truck.driver : "No driver assigned"}
            </span>
          </div>

          {hasWaste && (
            <div className="flex items-center gap-2 pt-0.5">
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-md border",
                  isBio && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
                  isNonBio && "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
                  !isBio && !isNonBio && "bg-primary/10 text-primary border-primary/20"
                )}
              >
                {truck.wasteType}
              </span>
            </div>
          )}
        </div>

        {/* Route Progress Bar */}
        {truck.totalBarangays > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground text-[11px] font-medium">Route Progress</span>
              <span className="font-bold text-foreground tabular-nums text-[11px]">
                {truck.completedBarangays}/{truck.totalBarangays} stops ({progressPercent}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  truck.status === "done" ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Driver Message Banner */}
        {truck.driverMessage && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-sand/60 border border-border/80">
            <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground italic leading-relaxed">
              "{truck.driverMessage}"
            </p>
          </div>
        )}

        {/* Resident Barangay Status Banner */}
        {truck.isResidentTruck && truck.residentStopStatus === "done" && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 transition-all">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  Collection Completed for Your Barangay
                </p>
                {truck.residentStopCompletedAt ? (
                  <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/90">
                    Finished at {truck.residentStopCompletedAt}
                  </p>
                ) : (
                  <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/90">
                    Collection finished today
                  </p>
                )}
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-bold shrink-0"
            >
              Completed
            </Badge>
          </div>
        )}

        {truck.isResidentTruck && truck.residentStopStatus === "skipped" && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-800 dark:text-yellow-200 transition-all">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
              <p className="text-xs font-bold truncate">
                Collection skipped for your barangay today
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30 font-bold shrink-0"
            >
              Skipped
            </Badge>
          </div>
        )}

        {/* Live Arrival Banner */}
        {truck.isResidentTruck &&
          truck.residentStopStatus !== "done" &&
          truck.residentStopStatus !== "skipped" &&
          truck.status === "on-the-way" && (
            <div
              className={cn(
                "flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all",
                truck.arrivedAtResident || truck.residentStopStatus === "in-progress"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                  : "bg-primary/10 border-primary/20 text-primary"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    truck.arrivedAtResident || truck.residentStopStatus === "in-progress"
                      ? "bg-emerald-600 animate-pulse"
                      : "bg-primary animate-pulse"
                  )}
                />
                <p className="text-xs font-bold truncate">
                  {truck.arrivedAtResident || truck.residentStopStatus === "in-progress"
                    ? "The truck is in your barangay now!"
                    : truck.eta !== null
                      ? `Est. arrival: ~${truck.eta} mins`
                      : "Calculating road route..."}
                </p>
              </div>

              {truck.barangaysAway !== null &&
                !truck.arrivedAtResident &&
                truck.residentStopStatus !== "in-progress" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-background/80 border border-border/60 shrink-0">
                    {truck.barangaysAway} stop{truck.barangaysAway > 1 ? "s" : ""} away
                  </span>
                )}
            </div>
          )}

        {/* Scheduled Status for Resident */}
        {truck.isResidentTruck &&
          truck.residentStopStatus !== "done" &&
          truck.residentStopStatus !== "skipped" &&
          truck.status === "scheduled" && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Clock className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                <span className="font-medium truncate">
                  Scheduled for collection today
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 font-bold shrink-0"
              >
                In Queue
              </Badge>
            </div>
          )}

        {/* Route Details Dropdown */}
        {truck.routeStops.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRouteExpanded(!routeExpanded);
              }}
              className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-2 cursor-pointer select-none touch-manipulation"
            >
              <span>Route Sequence ({truck.routeStops.length} stops)</span>
              {routeExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {routeExpanded && (
              <div className="mt-2 border border-border/80 rounded-xl overflow-hidden bg-muted/20 divide-y divide-border/60 max-h-56 overflow-y-auto overscroll-contain">
                {truck.routeStops.map((stop, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 sm:py-2 text-xs transition-colors",
                      stop.isResidentBarangay &&
                        "bg-primary/10 border-l-[3px] border-l-primary font-semibold",
                      !stop.isResidentBarangay && stop.status === "skipped" && "bg-yellow-500/5",
                      !stop.isResidentBarangay && stop.status === "done" && "bg-emerald-500/5"
                    )}
                  >
                    {stop.status === "done" && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                    {stop.status === "in-progress" && (
                      <Loader2 className="w-3.5 h-3.5 text-primary shrink-0 animate-spin" />
                    )}
                    {stop.status === "skipped" && (
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
                    )}
                    {stop.status === "not-started" && (
                      <Circle
                        className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          stop.isResidentBarangay
                            ? "text-primary/70"
                            : "text-muted-foreground/40"
                        )}
                      />
                    )}

                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span
                        className={cn(
                          "truncate",
                          stop.status === "done" &&
                            "text-muted-foreground font-medium line-through decoration-muted-foreground/40",
                          stop.status === "in-progress" && "text-primary font-bold",
                          stop.status === "skipped" &&
                            "text-yellow-700 dark:text-yellow-400 font-medium",
                          stop.status === "not-started" &&
                            (stop.isResidentBarangay ? "text-primary font-bold" : "text-foreground")
                        )}
                      >
                        {stop.barangay}
                      </span>

                      {stop.isResidentBarangay && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-bold shrink-0">
                          Your Barangay
                        </Badge>
                      )}
                    </div>

                    {stop.status === "done" && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-bold shrink-0"
                      >
                        Done
                      </Badge>
                    )}
                    {stop.status === "in-progress" && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/20 font-bold shrink-0"
                      >
                        In Progress
                      </Badge>
                    )}
                    {stop.status === "skipped" && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 bg-yellow-500/10 text-yellow-700 border-yellow-500/20 font-bold shrink-0"
                      >
                        Skipped
                      </Badge>
                    )}
                    {stop.completedAt && stop.status === "done" && (
                      <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                        {stop.completedAt}
                      </span>
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
