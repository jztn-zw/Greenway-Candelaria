import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAYS, WASTE_MAP } from "../constants";
import RouteCard from "./RouteCard";
import type { RouteData, Day } from "../hooks/useRoutes";
import type { Truck } from "../hooks/useTrucks";

interface RouteListProps {
  routesByDay: Record<Day, RouteData[]>;
  filteredRoutes: RouteData[];
  filterDay: Day | "all";
  setFilterDay: (v: Day | "all") => void;
  selectedRouteId: string | null;
  isCreating: boolean;
  trucks: Truck[];
  isLoadingTrucks: boolean;
  onSelectRoute: (route: RouteData) => void;
}

const RouteList = ({
  routesByDay,
  filteredRoutes,
  filterDay,
  setFilterDay,
  selectedRouteId,
  isCreating,
  trucks,
  isLoadingTrucks,
  onSelectRoute,
}: RouteListProps) => {
  const getTruck = (id: string) => trucks.find((t) => t.id === id);

  return (
    <div className="lg:col-span-2 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-display font-semibold text-foreground inline-flex items-center gap-2">
          Routes by Day
          {isLoadingTrucks ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-normal">
              <Loader2 className="w-3 h-3 animate-spin" /> Trucks loading
            </span>
          ) : null}
        </h2>
        <Select value={filterDay} onValueChange={(v) => setFilterDay(v as Day | "all")}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Days</SelectItem>
            {DAYS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 lg:max-h-[600px] lg:overflow-y-auto lg:pr-1">
        {DAYS.map((day) => {
          const dayRoutes = routesByDay[day];
          if (dayRoutes.length === 0) return null;
          const w = WASTE_MAP[day];
          const isBio = w.type === "biodegradable";

          return (
            <div key={day} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className={cn("w-2 h-2 rounded-full", isBio ? "bg-primary" : "bg-muted-foreground/40")} />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{day}</span>
                <span className="text-[10px] text-muted-foreground">· {w.label}</span>
              </div>

              {dayRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  truck={getTruck(route.truckId)}
                  isLoadingTruck={isLoadingTrucks && !getTruck(route.truckId)}
                  isSelected={selectedRouteId === route.id && !isCreating}
                  onClick={() => onSelectRoute(route)}
                />
              ))}
            </div>
          );
        })}

        {filteredRoutes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No routes found for this filter.
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteList;
