import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Route as RouteIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WASTE_MAP, formatTime12h } from "../constants";
import type { RouteData } from "../hooks/useRoutes";
import type { Truck as TruckType } from "../hooks/useTrucks";

interface RouteTableProps {
  routes: RouteData[];
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

export const RouteTable: React.FC<RouteTableProps> = ({
  routes,
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

  if (routes.length === 0) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
          <RouteIcon className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">No routes match current filters</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query, clearing day filters, or creating a new collection route.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/80 bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 pl-5">
                Day & Waste Category
              </TableHead>
              <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                Assigned Truck
              </TableHead>
              <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                Assigned Driver
              </TableHead>
              <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                Departure
              </TableHead>
              <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5">
                Collection Sequence
              </TableHead>
              <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 text-center">
                Status
              </TableHead>
              <TableHead className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider py-3.5 pr-5 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map((route) => {
              const truck = getTruck(route.truckId);
              const waste = WASTE_MAP[route.day];
              const isBio = waste.type === "biodegradable";
              const isToggling = isTogglingId === route.id;
              const isDeleting = isDeletingId === route.id;

              return (
                <TableRow
                  key={route.id}
                  onClick={() => onView(route)}
                  className={cn(
                    "border-b border-border/60 transition-colors hover:bg-muted/40 cursor-pointer group",
                    !route.active && "opacity-75 bg-muted/10"
                  )}
                >
                  {/* Day & Waste */}
                  <TableCell className="py-3.5 pl-5">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {route.day}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-md border w-fit tracking-wide",
                          isBio
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        )}
                      >
                        {waste.label}
                      </span>
                    </div>
                  </TableCell>

                  {/* Truck */}
                  <TableCell className="py-3.5">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">
                        {isLoadingTrucks
                          ? "Loading..."
                          : truck?.name ?? route.truckName}
                      </span>
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground border border-border/60 w-fit">
                        {isLoadingTrucks
                          ? "..."
                          : truck?.plate_number ?? route.truckPlate}
                      </span>
                    </div>
                  </TableCell>

                  {/* Driver */}
                  <TableCell className="py-3.5">
                    <span className="text-xs font-medium text-foreground">
                      {route.driverName || (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </span>
                  </TableCell>

                  {/* Departure */}
                  <TableCell className="py-3.5">
                    <span className="text-xs font-semibold text-foreground tabular-nums">
                      {formatTime12h(route.startTime)}
                    </span>
                  </TableCell>

                  {/* Sequence Preview */}
                  <TableCell className="py-3.5">
                    <div className="flex items-center gap-2 max-w-xs">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted border border-border/60 text-foreground shrink-0 tabular-nums">
                        {route.barangays.length} {route.barangays.length === 1 ? "stop" : "stops"}
                      </span>
                      <span
                        className="text-xs text-muted-foreground truncate"
                        title={route.barangays.join(" → ")}
                      >
                        {route.barangays.length > 0 ? route.barangays.join(", ") : "None"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-3.5 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border",
                        route.active
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground border-border/70"
                      )}
                    >
                      {route.active ? "Enabled" : "Paused"}
                    </span>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-3.5 pr-5 text-right">
                    <div
                      className="flex items-center justify-end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label="More options"
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
                            className="text-xs font-medium cursor-pointer rounded-lg px-2.5 py-1.5"
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RouteTable;
