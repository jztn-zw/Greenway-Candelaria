import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Leaf,
  Trash2,
  Save,
  Copy,
  Pause,
  Play,
  Loader2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DAYS, WASTE_MAP } from "../constants";
import BarangayOrderList from "./BarangayOrderList";
import type { RouteData, RouteForm, Day } from "../hooks/useRoutes";
import type { Truck } from "../hooks/useTrucks";
import type { Driver } from "../hooks/useDrivers";
import type { Barangay } from "../hooks/useBarangays";

interface RouteFormPanelProps {
  isCreating: boolean;
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
}

const RouteFormPanel = ({
  isCreating,
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
}: RouteFormPanelProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const waste = WASTE_MAP[form.day];

  // Auto-derive driver from selected truck
  const assignedDriver = form.truckId
    ? drivers.find((d) => d.truck_id === form.truckId) ?? null
    : null;
  const selectedTruck = trucks.find((truck) => truck.id === form.truckId) ?? null;

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {isCreating ? "Create New Route" : "Edit Route"}
          </CardTitle>
          {!isCreating && selectedRoute && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                selectedRoute.active
                  ? "border-primary/30 text-primary bg-primary/5"
                  : "border-destructive/30 text-destructive"
              )}
            >
              {selectedRoute.active ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Day + waste type indicator */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Day of Week</Label>
            <Select value={form.day} onValueChange={(v) => setForm((p) => ({ ...p, day: v as Day }))}>
              <SelectTrigger className="h-9">
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
              "h-9 flex items-center gap-2 px-3 rounded-md border text-sm font-medium",
              waste.type === "biodegradable"
                ? "bg-primary/5 border-primary/20 text-primary"
                : "bg-muted border-border text-foreground"
            )}>
              {waste.type === "biodegradable" ? <Leaf className="w-4 h-4" /> : <Trash2 className="w-4 h-4 text-muted-foreground" />}
              {waste.label}
              <span className="text-xs text-muted-foreground italic ml-1">({waste.local})</span>
            </div>
          </div>
        </div>

        {/* Truck + Driver (auto) + Time */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Truck</Label>
            <Select
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
            >
              <SelectTrigger className="h-9">
                {isLoadingTrucks ? (
                  <span className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                  </span>
                ) : (
                  <SelectValue placeholder="Select truck" />
                )}
              </SelectTrigger>
              <SelectContent>
                {trucks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} · {t.plate_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              className="h-9 text-sm cursor-default"
              tabIndex={-1}
            />
            {assignedDriver && selectedTruck && (
              <p className="text-[11px] text-muted-foreground">
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
                className="h-9 pl-9 text-sm appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none [&::-webkit-clear-button]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
              />
            </div>
          </div>
        </div>

        {/* Barangay list */}
        <BarangayOrderList
          form={form}
          barangaySearch={barangaySearch}
          setBarangaySearch={setBarangaySearch}
          availableBarangays={availableBarangays}
          isLoadingBarangays={isLoadingBarangays}
          onAdd={onAddBarangay}
          onRemove={onRemoveBarangay}
          onMove={onMoveBarangay}
        />

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <Button
            onClick={onSave}
            disabled={!form.truckId || form.barangays.length === 0 || isSaving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : isCreating ? "Save Route" : "Save Changes"}
          </Button>
          {!isCreating && selectedRoute && (
            <>
              <Button variant="outline" className="gap-2" onClick={onDuplicate}>
                <Copy className="w-4 h-4" /> Duplicate
              </Button>
              <Button
                variant="outline"
                className={cn("gap-2", !selectedRoute.active && "border-primary/30 text-primary hover:bg-primary/5")}
                onClick={() => onToggleActive(selectedRoute)}
              >
                {selectedRoute.active ? (
                  <><Pause className="w-4 h-4" /> Deactivate</>
                ) : (
                  <><Play className="w-4 h-4" /> Reactivate</>
                )}
              </Button>

              {/* Delete — far right, visually separated, only enabled when inactive */}
              <Button
                variant="outline"
                className={cn(
                  "gap-2 ml-auto border-destructive/40 text-destructive hover:bg-destructive/10",
                  selectedRoute.active && "opacity-35 pointer-events-none"
                )}
                disabled={selectedRoute.active}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </>
          )}
        </div>

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this route?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The route will be permanently removed and the deletion will be recorded in the Audit Log.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (selectedRoute) onDelete(selectedRoute);
                }}
              >
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default RouteFormPanel;
