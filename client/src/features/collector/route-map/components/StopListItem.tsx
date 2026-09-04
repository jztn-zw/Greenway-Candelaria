import type { RouteStop } from "../types";
import { CheckCircle2, Circle, Navigation, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StopListItemProps {
  stop: RouteStop;
}

const statusConfig = {
  "done": { label: "Done", icon: CheckCircle2, badgeClass: "bg-primary/15 text-primary border-primary/20" },
  "in-progress": { label: "In Progress", icon: Navigation, badgeClass: "bg-blue-500/15 text-blue-600 border-blue-500/20 animate-pulse" },
  "skipped": { label: "Skipped", icon: AlertTriangle, badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20" },
  "not-yet": { label: "Upcoming", icon: Circle, badgeClass: "bg-muted text-muted-foreground border-border/80" },
};

const StopListItem = ({ stop }: StopListItemProps) => {
  const config = statusConfig[stop.status];
  const Icon = config.icon;
  const isActive = stop.status === "in-progress";

  return (
    <div
      className={`group flex items-center gap-2.5 sm:gap-3 px-3 sm:px-3.5 py-2.5 sm:py-3 rounded-xl transition-all ${
        isActive
          ? "bg-blue-500/10 border-l-4 border-l-blue-500 border border-blue-500/20 shadow-xs"
          : stop.status === "done"
          ? "bg-primary/5 border border-primary/15 hover:bg-primary/10"
          : stop.status === "skipped"
          ? "bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10"
          : "bg-card border border-border/60 hover:bg-muted/40"
      }`}
    >
      {/* Stop number */}
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-transform ${
          isActive
            ? "bg-blue-500 text-white shadow-xs scale-105"
            : stop.status === "done"
            ? "bg-primary/15 text-primary"
            : stop.status === "skipped"
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {stop.stopNumber}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <p className={`text-xs sm:text-sm font-semibold truncate ${isActive ? "text-foreground" : stop.status === "done" ? "text-primary font-bold" : "text-foreground/90"}`}>
            {stop.barangay}
          </p>
          {stop.status === "not-yet" && stop.distanceKm > 0 && (
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 font-medium">
              {stop.distanceKm} km
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <Badge variant="outline" className={`text-[9px] sm:text-[10px] px-1.5 py-0 h-4 sm:h-4.5 font-medium ${config.badgeClass}`}>
            <Icon className="w-2.5 h-2.5 mr-1 shrink-0" />
            {config.label}
          </Badge>
          {stop.completedAt && (
            <span className="text-[10px] text-muted-foreground tabular-nums">at {stop.completedAt}</span>
          )}
          {stop.status === "skipped" && stop.skippedReason && (
            <span className="text-[10px] text-amber-700 dark:text-amber-300 truncate max-w-[150px]">{stop.skippedReason}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StopListItem;
