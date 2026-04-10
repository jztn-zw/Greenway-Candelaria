import type { RouteStop } from "../types";
import { CheckCircle2, Circle, Navigation, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StopListItemProps {
  stop: RouteStop;
}

const statusConfig = {
  "done": { label: "Done", icon: CheckCircle2, badgeClass: "bg-primary/15 text-primary border-primary/20" },
  "in-progress": { label: "In Progress", icon: Navigation, badgeClass: "bg-blue-500/15 text-blue-600 border-blue-500/20" },
  "skipped": { label: "Skipped", icon: AlertTriangle, badgeClass: "bg-yellow-500/15 text-yellow-600 border-yellow-500/20" },
  "not-yet": { label: "Not Yet", icon: Circle, badgeClass: "bg-muted text-muted-foreground border-border" },
};

const StopListItem = ({ stop }: StopListItemProps) => {
  const config = statusConfig[stop.status];
  const Icon = config.icon;
  const isActive = stop.status === "in-progress";

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        isActive
          ? "bg-blue-500/5 border-l-4 border-l-blue-500 border border-blue-500/15"
          : stop.status === "done"
          ? "bg-primary/5 border border-primary/15"
          : stop.status === "skipped"
          ? "bg-yellow-500/5 border border-yellow-500/15"
          : "border border-transparent hover:bg-muted/30"
      }`}
    >
      {/* Stop number */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
          isActive
            ? "bg-blue-500 text-white"
            : stop.status === "done"
            ? "bg-primary/15 text-primary"
            : stop.status === "skipped"
            ? "bg-yellow-500/15 text-yellow-600"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {stop.stopNumber}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${isActive ? "text-foreground" : stop.status === "done" ? "text-primary" : "text-foreground/80"}`}>
          {stop.barangay}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${config.badgeClass}`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
          {stop.completedAt && (
            <span className="text-[10px] text-muted-foreground">{stop.completedAt}</span>
          )}
          {stop.status === "not-yet" && stop.distanceKm > 0 && (
            <span className="text-[10px] text-muted-foreground">{stop.distanceKm} km away</span>
          )}
          {stop.status === "skipped" && stop.skippedReason && (
            <span className="text-[10px] text-yellow-600">{stop.skippedReason}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StopListItem;
