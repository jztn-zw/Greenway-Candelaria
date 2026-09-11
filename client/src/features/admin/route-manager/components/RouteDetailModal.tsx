import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WASTE_MAP, formatTime12h } from "../constants";
import type { RouteData } from "../hooks/useRoutes";
import type { Truck as TruckType } from "../hooks/useTrucks";
import type { Barangay } from "../hooks/useBarangays";
import RouteStopsMap from "./RouteStopsMap";

interface RouteDetailModalProps {
  route: RouteData | null;
  truck?: TruckType;
  barangays: Barangay[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (route: RouteData) => void;
  onDuplicate: (route: RouteData) => void;
  onToggleActive: (route: RouteData) => void;
  onDelete: (route: RouteData) => void;
  isToggling?: boolean;
  isDeleting?: boolean;
}

export const RouteDetailModal: React.FC<RouteDetailModalProps> = ({
  route,
  truck,
  barangays,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  onToggleActive,
  onDelete,
  isToggling = false,
  isDeleting = false,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!route) return null;

  const waste = WASTE_MAP[route.day];
  const orderedStops = [...route.stops].sort((a, b) => a.stopOrder - b.stopOrder);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:max-w-lg p-0 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[90vh] flex flex-col overflow-hidden">
          {/* Modal Header (Pinned / Non-scrollable) */}
          <div className="p-5 sm:p-6 pb-3.5 border-b border-border/60 shrink-0 flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  {route.day} Collection Route
                </DialogTitle>
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                    route.active
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-muted text-muted-foreground border-border/70"
                  )}
                >
                  {route.active ? "Enabled" : "Paused"}
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Inspection of resource assignments and scheduled barangay sequence.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content (Scrollable Body) */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* Overview Bento Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Waste Type */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Waste Type
                </p>
                <p className="text-xs font-bold text-foreground truncate">{waste.label}</p>
                <p className="text-[10px] text-muted-foreground italic">({waste.local})</p>
              </div>

              {/* Start Time */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Departure
                </p>
                <p className="text-xs font-bold text-foreground tabular-nums">
                  {formatTime12h(route.startTime)}
                </p>
                <p className="text-[10px] text-muted-foreground">Scheduled Start</p>
              </div>

              {/* Total Stops */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1 col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Coverage
                </p>
                <p className="text-xs font-bold text-foreground tabular-nums">
                  {route.barangays.length} Stops
                </p>
                <p className="text-[10px] text-muted-foreground">Ordered Sequence</p>
              </div>
            </div>

            {/* Vehicle & Collector Details */}
            <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Assigned Vehicle & Collector
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted border border-border/60 text-foreground">
                  {truck?.plate_number ?? route.truckPlate}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-border/60">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Truck</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    {truck?.name ?? route.truckName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Driver</p>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    {route.driverName || "Unassigned"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-foreground">
                  Route Preview
                </span>
                <span className="text-[11px] text-muted-foreground">Sequence follows the numbered markers</span>
              </div>
              <RouteStopsMap
                stops={orderedStops.map((stop) => ({ id: stop.barangayId, name: stop.barangayName }))}
                barangays={barangays}
                className="h-48"
              />
            </div>

            {/* Ordered Barangay Stops Sequence */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Collection Stops</span>
                <span className="text-[11px] text-muted-foreground">Order of service</span>
              </div>

              <div className="border border-border/80 rounded-xl max-h-52 overflow-y-auto divide-y divide-border/60 bg-muted/10">
                {orderedStops.map((stop, index) => (
                  <div
                    key={stop.barangayId}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-extrabold font-mono">{index + 1}</span>
                      </div>
                      <span className="font-semibold text-foreground truncate">
                        {stop.barangayName}
                      </span>
                    </div>

                    {stop.zone && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md border border-border/60 shrink-0">
                        Zone {stop.zone}
                      </span>
                    )}
                  </div>
                ))}
                {orderedStops.length === 0 && (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No collection stops assigned to this route.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer Controls (Pinned / Sticky) */}
          <div className="p-4 sm:p-5 sm:px-6 border-t border-border/60 shrink-0 bg-muted/10 flex items-center justify-between gap-2">
            {/* Destructive Delete Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={route.active || isDeleting}
              className={cn(
                "h-9 text-xs font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl px-3 transition-colors cursor-pointer",
                route.active && "opacity-40 cursor-not-allowed"
              )}
              title={route.active ? "Pause route before deleting" : "Delete Route"}
            >
              {isDeleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
              ) : null}
              <span>Delete</span>
            </Button>

            {/* Right Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onDuplicate(route);
                }}
                className="h-9 text-xs font-semibold rounded-xl border-border/70 hover:bg-muted px-3.5 transition-colors cursor-pointer"
              >
                Duplicate
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleActive(route)}
                disabled={isToggling}
                className="h-9 text-xs font-semibold rounded-xl border-border/70 hover:bg-muted px-3.5 transition-colors cursor-pointer"
              >
                {isToggling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                ) : null}
                <span>{route.active ? "Pause Route" : "Enable Route"}</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(route);
                }}
                className="h-9 text-xs font-bold rounded-xl px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-2xs"
              >
                Edit Route
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-border/80">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Delete Collection Route?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              This action cannot be undone. The route for {route.day} ({route.truckName}) will be permanently removed, and this deletion will be recorded in the MENRO Audit Logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => {
                setDeleteDialogOpen(false);
                onClose();
                onDelete(route);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs h-9 font-bold"
            >
              {isDeleting ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RouteDetailModal;
