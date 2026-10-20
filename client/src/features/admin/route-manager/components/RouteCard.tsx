import ActionButtonLoader from "@/components/common/ActionButtonLoader";
import { getCategoryBadgeColors,getStatusBadgeStyle } from "@/components/ui/badgeStyles";
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
Copy,
Truck,
User,
Clock,
MapPin,
MoreVertical,
SquarePen,
Eye,
Power,
Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime12h,WASTE_MAP } from "../constants";
import { adminRouteStyles as routeStyles } from "@/components/common/communityContentStyles";
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
  showDay?: boolean;
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
  showDay = false,
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
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={cn(
        routeStyles.card,
        "hover:border-primary/40 transition-colors gap-3.5 flex flex-col cursor-pointer group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        !route.active && "opacity-75 bg-muted/20"
      )}
    >
      {showDay && (
        <div className="flex min-w-0 flex-wrap items-center gap-2 border-b border-border/60 pb-2.5">
          <span className="text-xs font-semibold text-foreground">{route.day}</span>
          <span className={cn("max-w-full rounded-md border px-2 py-0.5 text-ui-overline break-words", getCategoryBadgeColors(WASTE_MAP[route.day].label).className)}>{WASTE_MAP[route.day].label}</span>
        </div>
      )}
      {/* Assigned truck and route actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="gw-heading text-sm text-foreground break-words [overflow-wrap:anywhere] group-hover:text-primary transition-colors">
              {isLoadingTruck ? "Loading truck..." : truck?.name ?? route.truckName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-ui-overline tabular-nums font-semibold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/60">
                {isLoadingTruck ? (
                  <span className="inline-flex items-center gap-1">
                    <ActionButtonLoader className="gw-action-loader--compact" /> ...
                  </span>
                ) : (
                  truck?.plate_number ?? route.truckPlate
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Route actions */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {/* More options dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-lg cursor-pointer"
                aria-label="Route actions"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/80 p-1">
              <DropdownMenuItem
                onClick={() => onView(route)}
                className="gap-2.5 text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2"
              >
                <Eye aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                View
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => onEdit(route)}
                className="gap-2.5 text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2"
              >
                <SquarePen aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDuplicate(route)}
                className="gap-2.5 text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2"
              >
                <Copy aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleActive(route)}
                disabled={isToggling}
                className="gap-2.5 text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2"
              >
                <Power aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {route.active ? "Disable Route" : "Enable Route"}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => onDelete(route)}
                disabled={route.active || isDeleting}
                aria-label={route.active ? "Delete route (disable route first)" : "Delete route"}
                className="gap-2.5 text-xs font-medium cursor-pointer rounded-lg px-2.5 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span>Delete</span>
                {route.active && (
                  <span className="ml-auto whitespace-nowrap text-ui-overline text-muted-foreground font-normal">
                    Disable Route First
                  </span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Middle section: Driver & Departure / Stops */}
      <div className="mt-auto space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2 text-xs text-muted-foreground">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              Driver:{" "}
              {route.driverName ? (
                <span className="font-semibold text-foreground">{route.driverName}</span>
              ) : (
                <span className="italic">Unassigned</span>
              )}
            </span>
          </div>
          <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-ui-overline font-medium", getStatusBadgeStyle(route.active ? "Enabled" : "Paused").className)}>
            {route.active ? "Enabled" : "Paused"}
          </span>
        </div>

        {/* Departure & Stops summary */}
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-xs">
          <div className="min-w-0 space-y-1">
            <span className="flex items-center gap-1.5 text-ui-caption text-muted-foreground"><Clock className="size-3 shrink-0" aria-hidden="true" />Departure</span>
            <p className="text-foreground font-semibold tabular-nums">{formatTime12h(route.startTime)}</p>
          </div>
          <div className="min-w-0 space-y-1 border-l border-border/60 pl-2.5">
            <span className="flex items-center gap-1.5 text-ui-caption text-muted-foreground"><MapPin className="size-3 shrink-0" aria-hidden="true" />Stops</span>
            <p className="text-foreground font-semibold tabular-nums">{route.barangays.length} {route.barangays.length === 1 ? "stop" : "stops"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteCard;
