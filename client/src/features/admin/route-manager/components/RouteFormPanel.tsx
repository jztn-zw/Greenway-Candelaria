import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fieldStyles } from "@/components/ui/fieldStyles";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Leaf,
  Trash2,
  Save,
  Copy,
  Pause,
  Play,
  Loader2,
  Clock,
  CalendarDays,
  MapPin,
  Pencil,
  Truck as TruckIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DAYS, WASTE_MAP } from "../constants";
import type { RouteData, RouteForm, Day } from "../hooks/useRoutes";
import type { Truck } from "../hooks/useTrucks";
import type { Driver } from "../hooks/useDrivers";
import type { Barangay } from "../hooks/useBarangays";

interface RouteFormPanelProps {
  isCreating: boolean;
  isRouteFormEditing: boolean;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  selectedRoute: RouteData | null;
  form: RouteForm;
  setForm: React.Dispatch<React.SetStateAction<RouteForm>>;
  isSaving: boolean;
  trucks: Truck[];
  drivers: Driver[];
  isLoadingTrucks: boolean;
  isLoadingDrivers: boolean;
  isLoadingBarangays: boolean;
  barangaySearch: string;
  setBarangaySearch: (v: string) => void;
  availableBarangays: Barangay[];
  onAddBarangay: (b: { id: string; name: string }) => void;
  onRemoveBarangay: (id: string) => void;
  onMoveBarangay: (idx: number, direction: "up" | "down") => void;
  onSave: () => void;
  onDuplicate: () => void;
  onToggleActive: (route: RouteData) => void;
  onDelete: (route: RouteData) => void;
  isTogglingRoute?: boolean;
  isDeletingRoute?: boolean;
}

const RouteFormPanel = ({
  isCreating,
  isRouteFormEditing,
  onBeginEdit,
  onCancelEdit,
  selectedRoute,
  form,
  setForm,
  isSaving,
  trucks,
  drivers,
  isLoadingTrucks,
  isLoadingDrivers,
  isLoadingBarangays,
  barangaySearch,
  setBarangaySearch,
  availableBarangays,
  onAddBarangay,
  onRemoveBarangay,
  onMoveBarangay,
  onSave,
  onDuplicate,
  onToggleActive,
  onDelete,
  isTogglingRoute = false,
  isDeletingRoute = false,
}: RouteFormPanelProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const waste = WASTE_MAP[form.day];

  // Auto-derive driver from selected truck
  const assignedDriver = form.truckId
    ? drivers.find((d) => d.truck_id === form.truckId) ?? null
    : null;
  const selectedTruck = trucks.find((truck) => truck.id === form.truckId) ?? null;
  const fieldClass = fieldStyles.compact;

  if (!isCreating && selectedRoute && !isRouteFormEditing) {
    const routeTruck = trucks.find((truck) => truck.id === selectedRoute.truckId);
    const orderedStops = [...selectedRoute.stops].sort((a, b) => a.stopOrder - b.stopOrder);
    const detailStats = [
      { label: "Collection day", value: selectedRoute.day, note: WASTE_MAP[selectedRoute.day].label, icon: CalendarDays },
      { label: "Start time", value: selectedRoute.startTime, note: "Scheduled departure", icon: Clock },
      { label: "Total barangays", value: String(selectedRoute.barangays.length), note: "Collection stops", icon: MapPin },
    ];

    return (
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="px-5 py-4 border-b border-border/70 bg-muted/20">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CardTitle className="gw-heading text-base ">Route Details</CardTitle>
                <Badge className={"text-ui-overline border-0 " + getStatusBadgeStyle(selectedRoute.active ? "ACTIVE" : "INACTIVE").className}>
                  {selectedRoute.active ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full border border-primary/50 bg-primary/10 flex items-center justify-center shrink-0">
                  <TruckIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="font-semibold text-foreground">{routeTruck?.name ?? selectedRoute.truckName}</p>
                    <span className="text-xs text-muted-foreground">{routeTruck?.plate_number ?? selectedRoute.truckPlate}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{selectedRoute.driverName || "No driver assigned"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shadow-sm"
                  onClick={onBeginEdit}
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Route
                </Button>
                <Button
                  variant={selectedRoute.active ? "destructive-outline" : "primary-outline"}
                  size="sm"
                  className={cn("gap-2", "shadow-sm")}
                  onClick={() => onToggleActive(selectedRoute)}
                  disabled={isTogglingRoute || isDeletingRoute}
                >
                  {isTogglingRoute ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : selectedRoute.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {selectedRoute.active ? "Deactivate Route" : "Reactivate Route"}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl border border-border/80 divide-y sm:divide-y-0 sm:divide-x divide-border/70 overflow-hidden">
            {detailStats.map((stat) => (
              <div key={stat.label} className="p-3.5 flex items-start gap-2.5 bg-muted/15">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-ui-overline text-muted-foreground">{stat.label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{stat.value}</p>
                  <p className={cn("text-ui-overline mt-0.5", stat.label === "Collection day" ? "text-primary" : "text-muted-foreground")}>{stat.note}</p>
                </div>
              </div>
            ))}
          </div>

          <section>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="gw-heading text-sm text-foreground inline-flex items-center gap-1.5">
                Assigned Barangays
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-ui-overline font-semibold text-primary">
                  {orderedStops.length}
                </span>
              </h3>
              <span className="text-ui-caption text-muted-foreground">Collection order</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 rounded-xl border border-border/80 p-3.5 bg-muted/10">
              {orderedStops.map((stop, index) => (
                <div key={stop.barangayId} className="flex items-center gap-2.5 py-1.5 text-xs text-foreground">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-ui-overline font-bold flex items-center justify-center shrink-0">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {stop.barangayName}
                </div>
              ))}
              {orderedStops.length === 0 && <p className="py-5 text-center text-xs text-muted-foreground sm:col-span-2">No barangays assigned to this route.</p>}
            </div>
          </section>

          {!selectedRoute.active && (
            <div className="pt-4 border-t border-border/70 flex justify-end">
              <Button variant="destructive-outline" size="sm" className="gap-2 shadow-sm" onClick={() => setDeleteDialogOpen(true)} disabled={isDeletingRoute}>
                {isDeletingRoute ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete Route
              </Button>
            </div>
          )}
        </CardContent>

        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete this route?"
          icon={<Trash2 />}
          variant="destructive"
          description="This action cannot be undone. The route will be permanently removed and the deletion will be recorded in the Audit Log."
          confirmLabel="Delete permanently"
          isPending={isDeletingRoute}
          pendingLabel="Deleting..."
          closeOnConfirm
          onConfirm={() => { if (selectedRoute) onDelete(selectedRoute); }}
        />
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="px-5 py-4 border-b border-border/70 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="gw-heading text-base ">
              {isCreating ? "Create new route" : "Edit Route"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{isCreating ? "Set the schedule, truck, and collection sequence." : "Update the route schedule and assigned collection stops."}</p>
          </div>
          {!isCreating && selectedRoute && (
            <Badge
              variant="outline"
              className={"text-ui-overline " + getStatusBadgeStyle(selectedRoute.active ? "Active" : "Inactive").className}
            >
              {selectedRoute.active ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-6">
        {/* Day + waste type indicator */}
        <section className="space-y-3 rounded-xl border border-border/70 bg-muted/10 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schedule</p>
          <p className="text-ui-caption text-muted-foreground mt-0.5">Choose the collection day and its waste category.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Day of Week</Label>
            <Select value={form.day} onValueChange={(v) => setForm((p) => ({ ...p, day: v as Day }))}>
              <SelectTrigger className={fieldClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Waste Type (auto)</Label>
            <div className={cn(
              "h-9 flex items-center gap-2 px-3 rounded-md border text-sm font-medium shadow-inner shadow-black/5",
              waste.type === "biodegradable"
                ? "bg-primary/10 border-primary/35 text-primary"
                : "bg-muted/50 border-border/80 text-foreground"
            )}>
              {waste.type === "biodegradable" ? <Leaf className="w-4 h-4" /> : <Trash2 className="w-4 h-4 text-muted-foreground" />}
              {waste.label}
              <span className="text-xs text-muted-foreground italic ml-1">({waste.local})</span>
            </div>
          </div>
        </div>
        </section>

        {/* Truck + Driver (auto) + Time */}
        <section className="space-y-3 rounded-xl border border-border/70 bg-muted/10 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignment</p>
          <p className="text-ui-caption text-muted-foreground mt-0.5">Assign a truck; its linked driver is selected automatically.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Truck</Label>
            <SearchableSelect
              value={form.truckId}
              onValueChange={(v) => {
                const driver = drivers.find((d) => d.truck_id === v);
                setForm((p) => ({
                  ...p,
                  truckId: v,
                  driverId: driver?.id ?? "",
                }));
              }}
              disabled={isLoadingTrucks}
              options={trucks.map((t) => ({ value: t.id, label: `${t.name} · ${t.plate_number}` }))}
              placeholder={isLoadingTrucks ? "Loading..." : "Select truck"}
              leadingIcon={isLoadingTrucks ? <Loader2 className="w-3 h-3 animate-spin" /> : undefined}
              aria-label="Truck" searchPlaceholder="Search trucks..." className={fieldClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Driver (auto)</Label>
            <Input
              readOnly
              value={
                isLoadingDrivers
                  ? "Loading..."
                  : assignedDriver
                    ? assignedDriver.full_name
                    : "Select a truck first"
              }
              className={`${fieldClass} text-sm cursor-default`}
              tabIndex={-1}
            />
            {assignedDriver && selectedTruck && (
              <p className="text-ui-caption text-muted-foreground">
                Auto-assigned from <span className="font-medium text-foreground">{selectedTruck.name}</span>
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Start Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                className={`${fieldClass} pl-9 text-sm appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden`}
              />
            </div>
          </div>
        </div>
        </section>

        {/* This legacy panel is retained for the route details layout. Street
            assignment now lives in RouteEditorModal, where a barangay is
            selected before its available street stops are loaded. */}
        <section className="rounded-xl border border-border/70 bg-muted/10 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            Street stop selection is available in the collection route editor.
          </p>
        </section>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/15 p-3">
          <Button
            onClick={onSave}
            disabled={
              !form.truckId ||
              form.barangays.length === 0 ||
              isSaving ||
              isLoadingTrucks ||
              isLoadingDrivers ||
              isLoadingBarangays ||
              isDeletingRoute ||
              isTogglingRoute
            }
            className="gap-2 shadow-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Saving..." : isCreating ? "Save Route" : "Save Changes"}
          </Button>
          {!isCreating && selectedRoute && (
            <>
              <Button variant="outline" className="gap-2" onClick={onDuplicate} disabled={isSaving || isDeletingRoute || isTogglingRoute}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />} Duplicate
              </Button>
              <Button variant="outline" className="gap-2" onClick={onCancelEdit} disabled={isSaving || isDeletingRoute || isTogglingRoute}>
                <X className="w-3.5 h-3.5" /> Cancel changes
              </Button>
              <Button
                variant={selectedRoute.active ? "destructive-outline" : "primary-outline"}
                className={"gap-2 shadow-sm"}
                onClick={() => onToggleActive(selectedRoute)}
                disabled={isTogglingRoute || isSaving || isDeletingRoute}
              >
                {isTogglingRoute ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</>
                ) : selectedRoute.active ? (
                  <><Pause className="w-4 h-4" /> Deactivate</>
                ) : (
                  <><Play className="w-4 h-4" /> Reactivate</>
                )}
              </Button>

              {/* Delete — far right, visually separated, only enabled when inactive */}
              <Button
                variant="destructive-outline"
                className={cn("gap-2 ml-auto shadow-sm", selectedRoute.active && "opacity-35 pointer-events-none")}
                disabled={selectedRoute.active || isDeletingRoute || isSaving || isTogglingRoute}
                onClick={() => setDeleteDialogOpen(true)}
              >
                {isDeletingRoute ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
              </Button>
            </>
          )}
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete this route?"
          icon={<Trash2 />}
          variant="destructive"
          description="This action cannot be undone. The route will be permanently removed and the deletion will be recorded in the Audit Log."
          confirmLabel="Delete permanently"
          isPending={isDeletingRoute}
          pendingLabel="Deleting..."
          closeOnConfirm
          onConfirm={() => { if (selectedRoute) onDelete(selectedRoute); }}
        />
      </CardContent>
    </Card>
  );
};

export default RouteFormPanel;
