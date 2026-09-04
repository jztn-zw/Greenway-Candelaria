import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Truck,
  User,
  Clock,
  MapPin,
  MoreVertical,
  Eye,
  Pencil,
  Copy,
  Pause,
  Play,
  Trash2,
  Leaf,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WASTE_MAP } from "../constants";
import type { RouteData } from "../hooks/useRoutes";
import type { Truck as TruckType } from "../hooks/useTrucks";

interface RouteCardProps {
  route: RouteData;
  truck?: TruckType;
  isLoadingTruck?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  onView: (route: RouteData) => void;
  onEdit: (route: RouteData) => void;
  onDuplicate: (route: RouteData) => void;
  onToggleActive: (route: RouteData) => void;
  onDelete: (route: RouteData) => void;
  isToggling?: boolean;
  isDeleting?: boolean;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  truck,
  isLoadingTruck = false,
  onView,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
  isToggling = false,
  isDeleting = false,
}) => {
  const waste = WASTE_MAP[route.day];
  const isBio = waste.type === "biodegradable";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-primary/30 transition-all space-y-4 flex flex-col justify-between",
        !route.active && "opacity-75 bg-muted/20"
      )}
    >
      {/* Top row: Day / Waste Pill + Status + Action Menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Day & Waste badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border shadow-2xs",
              isBio
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
            )}
          >
            {isBio ? (
              <Leaf className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Trash2 className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            )}
            <span>{route.day}</span>
            <span className="opacity-70 font-normal">· {waste.label}</span>
          </span>

          {/* Active Status badge */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border",
              route.active
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted text-muted-foreground border-border/70"
            )}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                route.active ? "bg-primary animate-pulse" : "bg-muted-foreground"
              )}
            />
            {route.active ? "Enabled" : "Paused"}
          </span>
        </div>

        {/* Action Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer -mr-1"
              aria-label="Route actions"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-xl border-border/80">
            <DropdownMenuItem
              onClick={() => onDuplicate(route)}
              className="text-xs cursor-pointer gap-2"
            >
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Duplicate Route</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onToggleActive(route)}
              disabled={isToggling}
              className="text-xs cursor-pointer gap-2"
            >
              {route.active ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-amber-500" />
                  <span>Pause Route</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-primary" />
                  <span>Enable Route</span>
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(route)}
              disabled={route.active || isDeleting}
              className="text-xs cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Route</span>
              {route.active && <span className="ml-auto text-[10px] text-muted-foreground">Pause first</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Middle row: Assigned Vehicle & Driver Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-foreground truncate">
              {isLoadingTruck ? "Loading truck..." : truck?.name ?? route.truckName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground border border-border/60">
                {isLoadingTruck ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> ...
                  </span>
                ) : (
                  truck?.plate_number ?? route.truckPlate
                )}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <User className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="truncate">{route.driverName || "Unassigned"}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Departure & Stops summary */}
        <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-muted/40 border border-border/60">
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-foreground font-bold">{route.startTime}</span>
            <span>departure</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-foreground font-bold">{route.barangays.length}</span>
            <span>stops</span>
          </div>
        </div>

        {/* Sequence Preview */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Collection Sequence
          </p>
          <div className="flex flex-wrap gap-1.5 items-center">
            {route.barangays.slice(0, 3).map((bName, idx) => (
              <span
                key={bName}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg bg-background border border-border/70 text-foreground font-medium shadow-2xs"
              >
                <span className="text-[9px] font-bold text-primary font-mono">{idx + 1}</span>
                <span className="truncate max-w-[120px]">{bName}</span>
              </span>
            ))}
            {route.barangays.length > 3 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border/60">
                +{route.barangays.length - 3} more
              </span>
            )}
            {route.barangays.length === 0 && (
              <span className="text-xs text-muted-foreground italic">No stops assigned</span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Footer: Quick Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-border/60">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView(route)}
          aria-label={`Inspect ${route.day} route for ${route.truckName}`}
          className="flex-1 h-8 text-xs font-semibold rounded-xl cursor-pointer hover:bg-muted/70 gap-1.5 shadow-2xs"
        >
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Inspect</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(route)}
          aria-label={`Edit ${route.day} route for ${route.truckName}`}
          className="flex-1 h-8 text-xs font-semibold rounded-xl cursor-pointer hover:bg-muted/70 gap-1.5 shadow-2xs"
        >
          <Pencil className="w-3.5 h-3.5 text-primary" />
          <span>Edit</span>
        </Button>
      </div>
    </div>
  );
};

export default RouteCard;
