import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import {
  X,
  Loader2,
  Trash2,
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
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] sm:max-w-lg p-0 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[90vh] flex flex-col overflow-hidden gap-0">
          {/* Modal Header (Pinned / Non-scrollable) */}
          <div className="gw-modal-header px-5 py-3.5 border-b border-border/60 shrink-0 flex items-center justify-between bg-card">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="gw-heading text-base text-foreground tracking-tight">
                  {route.day} Collection Route
                </DialogTitle>
                <span
                  className={"inline-flex items-center px-2 py-0.5 rounded-md text-ui-overline font-bold uppercase border " + getStatusBadgeStyle(route.active ? "Enabled" : "Paused").className}
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
              className="gw-action-ghost w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content (Scrollable Body) */}
          <div className="px-5 py-4 overflow-y-auto flex-1 space-y-3.5 scrollbar-thin">
            {/* Overview Bento Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Waste Type */}
              <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                <p className="text-ui-overline font-semibold text-muted-foreground uppercase tracking-wider">
                  Waste Type
                </p>
                <p className="text-xs font-bold text-foreground truncate">{waste.label}</p>
                <p className="text-ui-overline text-muted-foreground italic">({waste.local})</p>
              </div>

              {/* Start Time */}
              <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                <p className="text-ui-overline font-semibold text-muted-foreground uppercase tracking-wider">
                  Departure
                </p>
                <p className="text-xs font-semibold text-foreground tabular-nums">
                  {formatTime12h(route.startTime)}
                </p>
                <p className="text-ui-overline text-muted-foreground">Scheduled Start</p>
              </div>

              {/* Total Stops */}
              <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                <p className="text-ui-overline font-semibold text-muted-foreground uppercase tracking-wider">
                  Coverage
                </p>
                <p className="text-xs font-semibold text-foreground tabular-nums">
                  {route.barangays.length} Stops
                </p>
                <p className="text-ui-overline text-muted-foreground">Ordered Sequence</p>
              </div>
            </div>

            {/* Vehicle & Collector Details */}
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/70 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Assigned Vehicle & Collector
                </span>
                <span className="text-ui-overline tabular-nums font-semibold px-2 py-0.5 rounded-lg bg-muted border border-border/60 text-foreground">
                  {truck?.plate_number ?? route.truckPlate}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-border/60">
                <div>
                  <p className="text-ui-overline text-muted-foreground uppercase tracking-wider font-semibold">Truck</p>
                  <p className="text-xs font-bold text-foreground mt-0.5 truncate">
                    {truck?.name ?? route.truckName}
                  </p>
                </div>
                <div>
                  <p className="text-ui-overline text-muted-foreground uppercase tracking-wider font-semibold">Driver</p>
                  <p className="text-xs font-bold text-foreground mt-0.5 truncate">
                    {route.driverName || "Unassigned"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-foreground">
                  Route Preview
                </span>
                <span className="text-ui-overline text-muted-foreground font-medium">Sequence follows the numbered markers</span>
              </div>
              <RouteStopsMap
                stops={orderedStops.map((stop) => ({
                  id: stop.id,
                  name: stop.stopName,
                  barangayId: stop.barangayId,
                  coveragePath: stop.coveragePath,
                }))}
                barangays={barangays}
                className="h-44"
              />
            </div>

            {/* Ordered Barangay Stops Sequence */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Collection Stops</span>
                <span className="text-ui-overline text-muted-foreground font-medium">Order of service</span>
              </div>

              <div className="border border-border/70 rounded-xl max-h-48 overflow-y-auto divide-y divide-border/60 bg-muted/15 scrollbar-thin">
                {orderedStops.map((stop, index) => (
                  <div
                    key={stop.id}
                    className="flex items-center justify-between px-3.5 py-2 text-xs hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-5 h-5 rounded-md bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-ui-overline font-semibold tabular-nums">{index + 1}</span>
                      </div>
                      <span className="font-semibold text-foreground truncate">
                        {stop.stopName}
                      </span>
                    </div>

                    {stop.zone && (
                      <span className="text-ui-overline tabular-nums font-medium text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded border border-border/60 shrink-0">
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
          <div className="gw-modal-footer px-5 py-3 border-t border-border/60 shrink-0 flex items-center justify-between gap-2 bg-card">
            {/* Destructive Delete Button */}
            <Button
              variant="destructive-ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={route.active || isDeleting}
              className={cn("h-8 text-xs font-semibold border rounded-xl px-3 transition-colors cursor-pointer", route.active && "opacity-40 cursor-not-allowed")}
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
                className="h-8 text-xs font-semibold rounded-xl px-3 transition-colors cursor-pointer"
              >
                Duplicate
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleActive(route)}
                disabled={isToggling}
                className="h-8 text-xs font-semibold rounded-xl px-3 transition-colors cursor-pointer"
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
                className="h-8 text-xs font-semibold rounded-xl px-3.5 transition-colors cursor-pointer shadow-2xs"
              >
                Edit Route
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Collection Route?"
        icon={<Trash2 />}
        variant="destructive"
        description={<>The inactive route template for {route.day} ({route.truckName}) will be removed and recorded in the MENRO Audit Logs. Completed daily route history will be preserved.</>}
        confirmLabel="Delete permanently"
        isPending={isDeleting}
        pendingLabel="Deleting..."
        closeOnConfirm
        onConfirm={() => {
          setDeleteDialogOpen(false);
          onClose();
          onDelete(route);
        }}
      />
    </>
  );
};

export default RouteDetailModal;
