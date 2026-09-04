import React from "react";
import { RouteCard } from "./RouteCard";
import { DAYS, WASTE_MAP } from "../constants";
import { Leaf, Trash2, Route as RouteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RouteData, Day } from "../hooks/useRoutes";
import type { Truck as TruckType } from "../hooks/useTrucks";

interface RouteDayViewProps {
  routesByDay: Record<Day, RouteData[]>;
  filteredRoutes: RouteData[];
  trucks: TruckType[];
  isLoadingTrucks?: boolean;
  onView: (route: RouteData) => void;
  onEdit: (route: RouteData) => void;
  onDuplicate: (route: RouteData) => void;
  onToggleActive: (route: RouteData) => void;
  onDelete: (route: RouteData) => void;
  isTogglingId?: string | null;
  isDeletingId?: string | null;
}

export const RouteDayView: React.FC<RouteDayViewProps> = ({
  routesByDay,
  filteredRoutes,
  trucks,
  isLoadingTrucks = false,
  onView,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
  isTogglingId,
  isDeletingId,
}) => {
  const getTruck = (id: string) => trucks.find((t) => t.id === id);

  if (filteredRoutes.length === 0) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
          <RouteIcon className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">No routes match current filters</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query, selecting another day pill, or creating a new collection route.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {DAYS.map((day) => {
        const dayRoutes = routesByDay[day] || [];
        if (dayRoutes.length === 0) return null;

        const waste = WASTE_MAP[day];
        const isBio = waste.type === "biodegradable";

        return (
          <div key={day} className="space-y-3.5">
            {/* Day Header Section */}
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center border shadow-2xs",
                    isBio
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  )}
                >
                  {isBio ? <Leaf className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-foreground tracking-tight font-display">
                      {day}
                    </h3>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.2 rounded-full border",
                        isBio
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
                      )}
                    >
                      {waste.label} ({waste.local})
                    </span>
                  </div>
                </div>
              </div>

              <span className="text-xs text-muted-foreground font-medium">
                {dayRoutes.length} {dayRoutes.length === 1 ? "route" : "routes"}
              </span>
            </div>

            {/* Grid of Route Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {dayRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  truck={getTruck(route.truckId)}
                  isLoadingTruck={isLoadingTrucks && !getTruck(route.truckId)}
                  onView={onView}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onToggleActive={onToggleActive}
                  onDelete={onDelete}
                  isToggling={isTogglingId === route.id}
                  isDeleting={isDeletingId === route.id}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RouteDayView;
