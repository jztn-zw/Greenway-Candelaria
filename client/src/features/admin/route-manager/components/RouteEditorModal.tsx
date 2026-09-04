import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck as TruckIcon,
  User,
  Clock,
  Leaf,
  Trash2,
  X,
  Loader2,
  CalendarCheck,
  CalendarPlus,
  Save,
  AlertTriangle,
  MapPinned,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DAYS, WASTE_MAP } from "../constants";
import BarangayOrderList from "./BarangayOrderList";
import type { RouteData, RouteForm, Day } from "../hooks/useRoutes";
import type { Truck } from "../hooks/useTrucks";
import type { Driver } from "../hooks/useDrivers";
import type { Barangay } from "../hooks/useBarangays";
import RouteStopsMap from "./RouteStopsMap";

interface RouteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  barangays: Barangay[];
  onAddBarangay: (b: { id: string; name: string }) => void;
  onRemoveBarangay: (id: string) => void;
  onMoveBarangay: (idx: number, direction: "up" | "down") => void;
  onReorderBarangay?: (sourceIdx: number, targetIdx: number) => void;
  onSave: () => void;
}

// 30-minute intervals for Start Time selection
const TIME_OPTIONS = Array.from({ length: 25 }, (_, index) => {
  const totalMinutes = 5 * 60 + index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return { value, label: `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}` };
});

export const RouteEditorModal: React.FC<RouteEditorModalProps> = ({
  isOpen,
  onClose,
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
  barangays,
  onAddBarangay,
  onRemoveBarangay,
  onMoveBarangay,
  onReorderBarangay,
  onSave,
}) => {
  const waste = WASTE_MAP[form.day];
  const isBio = waste.type === "biodegradable";

  // Auto-derive driver from selected truck
  const assignedDriver = form.truckId
    ? drivers.find((d) => d.truck_id === form.truckId) ?? null
    : null;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.truckId || form.barangays.length === 0) return;
    onSave();
  };

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isDirty = useMemo(() => {
    if (selectedRoute) {
      const origDay = selectedRoute.day;
      const origTruck = selectedRoute.truckId;
      const origTime = selectedRoute.startTime;
      const origStops = selectedRoute.barangays;
      const stopsChanged =
        form.barangays.length !== origStops.length ||
        form.barangays.some((b, i) => b.id !== origStops[i]);
      return (
        form.day !== origDay ||
        form.truckId !== origTruck ||
        form.startTime !== origTime ||
        stopsChanged
      );
    }
    return form.truckId !== "" || form.barangays.length > 0 || form.startTime !== "06:00";
  }, [selectedRoute, form]);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleRequestClose()}>
        <DialogContent
          onPointerDownOutside={(e) => {
            if (isDirty) {
              e.preventDefault();
              setShowDiscardConfirm(true);
            }
          }}
          onEscapeKeyDown={(e) => {
            if (isDirty) {
              e.preventDefault();
              setShowDiscardConfirm(true);
            }
          }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:max-w-3xl p-0 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[90vh] flex flex-col overflow-hidden"
        >
          <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            {/* Modal Header (Pinned / Non-scrollable) */}
            <div className="p-5 sm:p-6 pb-3.5 border-b border-border/60 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  {isCreating ? (
                    <CalendarPlus className="w-4 h-4" />
                  ) : (
                    <CalendarCheck className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                    {isCreating ? "Create Collection Route" : "Edit Collection Route"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {isCreating
                      ? "Select a truck, schedule, and ordered stops; the linked collector is resolved automatically."
                      : `Update parameters for ${selectedRoute?.day ?? form.day} route.`}
                  </DialogDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
                title="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          {/* Form Content (Scrollable Body) */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* Section 1: Schedule & Waste Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Day of Week <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.day}
                  onValueChange={(val: Day) => setForm((prev) => ({ ...prev, day: val }))}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Auto Waste Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Waste Category <span className="text-[11px] font-normal text-muted-foreground">(Auto)</span>
                </Label>
                <div
                  className={cn(
                    "h-9 px-3 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-2xs",
                    isBio
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
                  )}
                >
                  {isBio ? (
                    <Leaf className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  )}
                  <span>{waste.label}</span>
                  <span className="text-[11px] opacity-75 font-normal">({waste.local})</span>
                </div>
              </div>
            </div>

            {/* Section 2: Vehicle, Driver & Start Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Truck selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Assigned Truck <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.truckId}
                  onValueChange={(val: string) => {
                    const driver = drivers.find((d) => d.truck_id === val);
                    setForm((prev) => ({
                      ...prev,
                      truckId: val,
                      driverId: driver?.id ?? "",
                    }));
                  }}
                  disabled={isLoadingTrucks}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus:ring-primary/20">
                    <div className="flex items-center gap-2 truncate">
                      <TruckIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Select a truck" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-56 rounded-xl">
                    {trucks.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs">
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span>{t.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {t.plate_number}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Driver auto display */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Collector / Driver <span className="text-[11px] font-normal text-muted-foreground">(Auto)</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    readOnly
                    value={
                      isLoadingDrivers
                        ? "Resolving driver..."
                        : assignedDriver
                        ? assignedDriver.full_name
                        : "No driver linked"
                    }
                    className="h-9 pl-9 text-xs rounded-xl bg-muted/40 border-border/80 shadow-2xs cursor-default"
                    tabIndex={-1}
                  />
                </div>
              </div>

              {/* Start Time Select */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  Start Time <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.startTime.slice(0, 5)}
                  onValueChange={(val: string) => setForm((prev) => ({ ...prev, startTime: val }))}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 shadow-2xs focus:ring-primary/20">
                    <div className="flex items-center gap-2 truncate">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Select time" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-56 rounded-xl">
                    {TIME_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.truckId && !isLoadingDrivers && !assignedDriver && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5" role="status">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-200">This truck has no assigned collector</p>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90 mt-0.5">
                    You can save an unassigned route, but it cannot be operated until a collector is linked in Collector Manager.
                  </p>
                </div>
              </div>
            )}

            {/* Section 3: Barangay Collection Sequence */}
            <div className="pt-3 border-t border-border/60 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-4 lg:items-start">
              <div>
                <BarangayOrderList
                  form={form}
                  barangaySearch={barangaySearch}
                  setBarangaySearch={setBarangaySearch}
                  availableBarangays={availableBarangays}
                  isLoadingBarangays={isLoadingBarangays}
                  onAdd={onAddBarangay}
                  onRemove={onRemoveBarangay}
                  onMove={onMoveBarangay}
                  onReorder={onReorderBarangay}
                />
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <MapPinned className="w-3.5 h-3.5 text-primary" /> Route Preview
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Visual check of the current collection order.
                  </p>
                </div>
                <RouteStopsMap stops={form.barangays} barangays={barangays} className="h-56" />
              </div>
            </div>
          </div>

          {/* Modal Footer (Pinned / Sticky) */}
          <div className="p-4 sm:p-5 sm:px-6 border-t border-border/60 shrink-0 bg-muted/10 flex items-center justify-end gap-2.5">
            <p className="mr-auto hidden sm:block text-[11px] text-muted-foreground" aria-live="polite">
              {!form.truckId
                ? "Select a truck to continue"
                : form.barangays.length === 0
                  ? "Add at least one collection stop"
                  : assignedDriver
                    ? `Ready to assign to ${assignedDriver.full_name}`
                    : "Ready to save as an unassigned route"}
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestClose}
              disabled={isSaving}
              className="h-9 text-xs rounded-xl border-border/80 px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSaving ||
                !form.truckId ||
                form.barangays.length === 0 ||
                isLoadingTrucks
              }
              className="h-9 text-xs rounded-xl px-5 font-bold shadow-sm gap-1.5 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Route...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {isCreating
                      ? assignedDriver || !form.truckId
                        ? "Create Route"
                        : "Create Unassigned Route"
                      : "Save Changes"}
                  </span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* ── Universal Unsaved Changes Guard Dialog ── */}
    <UnsavedChangesDialog
      isOpen={showDiscardConfirm}
      onClose={() => setShowDiscardConfirm(false)}
      onDiscard={() => {
        setShowDiscardConfirm(false);
        onClose();
      }}
      title="Discard Unsaved Route Changes?"
      description="You have unsaved changes to this collection route. If you close now, your assignments and stop order will be lost."
      discardLabel="Discard Changes"
      keepEditingLabel="Keep Editing"
    />
  </>
  );
};

export default RouteEditorModal;
