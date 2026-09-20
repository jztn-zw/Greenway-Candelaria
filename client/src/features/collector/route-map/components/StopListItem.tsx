import type { RouteStop } from "../types";
import { CheckCircle2, Circle, Navigation, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StopListItemProps {
  stop: RouteStop;
}

const statusConfig = {
  done: {
    label: "Completed",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  },
  "in-progress": {
    label: "Current target",
    icon: Navigation,
    badgeClass: "bg-primary/10 text-primary border-primary/25 font-bold",
  },
  skipped: {
    label: "Skipped",
    icon: AlertTriangle,
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
  },
  "not-yet": {
    label: "Upcoming",
    icon: Circle,
    badgeClass: "bg-muted text-muted-foreground border-border/80",
  },
};

const StopListItem = ({ stop }: StopListItemProps) => {
  const config = statusConfig[stop.status];
  const Icon = config.icon;
  const isActive = stop.status === "in-progress";
  const isDone = stop.status === "done";
  const isSkipped = stop.status === "skipped";

  return (
    <div
      className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all border ${
        isActive
          ? "bg-primary/[0.08] border-primary/40 shadow-2xs"
          : isDone
          ? "bg-card/90 border-border/60 opacity-85 hover:opacity-100"
          : isSkipped
          ? "bg-card/90 border-amber-500/25 opacity-85 hover:opacity-100"
          : "bg-card border-border/70 hover:bg-muted/30"
      }`}
    >
      {/* Stop number badge */}
      <div
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-bold transition-transform shadow-2xs ${
          isActive
            ? "bg-primary text-primary-foreground font-black shadow-primary/20"
            : isDone
            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
            : isSkipped
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
            : "bg-muted/80 text-muted-foreground border border-border/80"
        }`}
      >
        {isDone ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        ) : isSkipped ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        ) : (
          stop.stopNumber
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5">
          <p className="text-xs sm:text-sm font-bold text-foreground font-display truncate">
            {stop.barangay}
          </p>
          {stop.status === "not-yet" && stop.distanceKm > 0 && (
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 font-medium px-2 py-0.5 rounded-lg bg-muted/60 border border-border/60">
              {stop.distanceKm} km
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <Badge
            variant="outline"
            className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold ${config.badgeClass}`}
          >
            <Icon className="w-2.5 h-2.5 mr-1 shrink-0" />
            {config.label}
          </Badge>
          {stop.completedAt && (
            <span className="text-[10px] text-muted-foreground tabular-nums font-medium">
              at {stop.completedAt}
            </span>
          )}
          {stop.status === "skipped" && stop.skippedReason && (
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 truncate max-w-[160px]">
              • {stop.skippedReason}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StopListItem;
