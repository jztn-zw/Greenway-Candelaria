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
  Truck,
  User,
  Clock,
  MoreVertical,
  Eye,
  Pencil,
  Copy,
  Pause,
  Play,
  Trash2,
  Leaf,
  Loader2,
  Route as RouteIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WASTE_MAP } from "../constants";
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
              <TableHead className="text-xs font-bold text-foreground py-3.5 pl-5">
                Day & Waste Category
              </TableHead>
              <TableHead className="text-xs font-bold text-foreground py-3.5">
                Assigned Truck
              </TableHead>
              <TableHead className="text-xs font-bold text-foreground py-3.5">
                Assigned Driver
              </TableHead>
              <TableHead className="text-xs font-bold text-foreground py-3.5">
                Departure
              </TableHead>
              <TableHead className="text-xs font-bold text-foreground py-3.5">
                Collection Sequence
              </TableHead>
              <TableHead className="text-xs font-bold text-foreground py-3.5 text-center">
                Status
              </TableHead>
              <TableHead className="text-xs font-bold text-foreground py-3.5 pr-5 text-right">
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
                  className={cn(
                    "border-b border-border/60 transition-colors hover:bg-muted/30 group",
                    !route.active && "opacity-75 bg-muted/10"
                  )}
                >
                  {/* Day & Waste */}
                  <TableCell className="py-4 pl-5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs",
                          isBio
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        )}
                      >
                        {isBio ? (
                          <Leaf className="w-4 h-4" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground leading-tight">
                          {route.day}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {waste.label}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  {/* Truck */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <Truck className="w-4 h-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {isLoadingTrucks
                            ? "Loading..."
                            : truck?.name ?? route.truckName}
                        </p>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {isLoadingTrucks
                            ? "..."
                            : truck?.plate_number ?? route.truckPlate}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Driver */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-medium text-foreground">
                        {route.driverName || (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </span>
                    </div>
                  </TableCell>

                  {/* Departure */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-1.5 text-xs text-foreground font-semibold tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{route.startTime}</span>
                    </div>
                  </TableCell>

                  {/* Sequence Preview */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                      <span className="inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                        {route.barangays.length} stops
                      </span>
                      {route.barangays.slice(0, 2).map((bName, idx) => (
                        <span
                          key={bName}
                          className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground truncate max-w-[90px]"
                        >
                          {bName}
                        </span>
                      ))}
                      {route.barangays.length > 2 && (
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          +{route.barangays.length - 2}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-4 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border",
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
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-4 pr-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(route)}
                        aria-label={`Inspect ${route.day} route for ${route.truckName}`}
                        className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Inspect Route Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(route)}
                        aria-label={`Edit ${route.day} route for ${route.truckName}`}
                        className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Edit Route"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label="More options"
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
