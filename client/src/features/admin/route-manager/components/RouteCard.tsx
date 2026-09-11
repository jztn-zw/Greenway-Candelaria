import React from "react";
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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime12h } from "../constants";
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
  onClick,
  onView,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
  isToggling = false,
  isDeleting = false,
}) => {
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      onView(route);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={cn(
        "rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-primary/40 transition-all space-y-3.5 flex flex-col justify-between cursor-pointer group text-left",
        !route.active && "opacity-75 bg-muted/20"
      )}
    >
      {/* Top row: Assigned Truck info + Status badge + More actions dropdown */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold font-display text-foreground truncate group-hover:text-primary transition-colors">
              {isLoadingTruck ? "Loading truck..." : truck?.name ?? route.truckName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
                {isLoadingTruck ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> ...
                  </span>
                ) : (
                  truck?.plate_number ?? route.truckPlate
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Toolbar: Status badge + More actions menu */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border mr-0.5",
              route.active
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted text-muted-foreground border-border/70"
            )}
          >
            {route.active ? "Enabled" : "Paused"}
          </span>

          {/* More options dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Route actions"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/80 p-1">
              <DropdownMenuItem
                onClick={() => onEdit(route)}
                className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
              >
                Edit Route
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDuplicate(route)}
                className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
              >
                Duplicate Route
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleActive(route)}
                disabled={isToggling}
                className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
              >
                {route.active ? "Pause Route" : "Enable Route"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => onDelete(route)}
                disabled={route.active || isDeleting}
                className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                Delete Route
                {route.active && (
                  <span className="ml-auto text-[10px] text-muted-foreground font-normal">
                    Pause first
                  </span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Middle section: Driver & Departure / Stops */}
      <div className="space-y-2.5">
        {/* Driver */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">
            Driver:{" "}
            {route.driverName ? (
              <span className="font-semibold text-foreground">{route.driverName}</span>
            ) : (
              <span className="italic">Unassigned</span>
            )}
          </span>
        </div>

        {/* Departure & Stops summary */}
        <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-muted/40 border border-border/60">
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-foreground font-bold tabular-nums">{formatTime12h(route.startTime)}</span>
            <span>departure</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-foreground font-bold tabular-nums">{route.barangays.length}</span>
            <span>{route.barangays.length === 1 ? "stop" : "stops"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteCard;
