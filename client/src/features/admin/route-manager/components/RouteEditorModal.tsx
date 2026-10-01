import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TimePicker } from "@/components/ui/time-picker";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import { Label } from "@/components/ui/label";
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
  MapPin,
  CheckCircle2,
  Calendar,
  Layers,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DAYS, WASTE_MAP } from "../constants";
import BarangayOrderList from "./BarangayOrderList";
import type { RouteData, RouteForm, Day } from "../hooks/useRoutes";
import type { Truck } from "../hooks/useTrucks";
import type { Driver } from "../hooks/useDrivers";
import type { Barangay } from "../hooks/useBarangays";
import type { BarangayStreetRow } from "@/services/barangaysService";
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
  barangays: Barangay[];
  availableStopPoints: BarangayStreetRow[];
  isLoadingStopPoints: boolean;
  isCollectionAvailable: boolean;
  onSelectBarangay: (barangayId: string) => void;
  onAddBarangay: (point: BarangayStreetRow) => void;
  onRemoveBarangay: (id: string) => void;
  onMoveBarangay: (idx: number, direction: "up" | "down") => void;
  onReorderBarangay?: (sourceIdx: number, targetIdx: number) => void;
  onSave: () => Promise<void>;
}

type FormErrors = Partial<Record<"truck" | "stops" | "coverage" | "form", string>>;

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
  barangays,
  availableStopPoints,
  isLoadingStopPoints,
  isCollectionAvailable,
  onSelectBarangay,
  onAddBarangay,
  onRemoveBarangay,
  onMoveBarangay,
  onReorderBarangay,
  onSave,
}) => {
  const waste = WASTE_MAP[form.day];
  const isBio = waste.type === "biodegradable";

  // Auto-derive driver and truck from selected truck
  const assignedDriver = form.truckId
    ? drivers.find((d) => d.truck_id === form.truckId) ?? null
    : null;
  const selectedTruck = form.truckId
    ? trucks.find((t) => t.id === form.truckId) ?? null
    : null;
  const [errors, setErrors] = useState<FormErrors>({});

  const stopsMissingCoverage = useMemo(
    () => form.barangays.filter((stop) => !stop.coveragePath || stop.coveragePath.length < 2),
    [form.barangays],
  );

  useEffect(() => {
    if (!isOpen) setErrors({});
  }, [isOpen]);

  // A street path can be drawn in Barangay Manager after this route was first
  // loaded. Refresh missing paths from the editor's current street data so an
  // existing route preview does not remain stale until the whole page reloads.
  useEffect(() => {
    if (!isOpen || availableStopPoints.length === 0) return;

    const savedPathByStreetId = new Map(
      availableStopPoints
        .filter((street) => (street.coverage_path?.length ?? 0) >= 2)
        .map((street) => [street.id, street.coverage_path!] as const),
    );

    setForm((previous) => {
      let changed = false;
      const barangays = previous.barangays.map((stop) => {
        if ((stop.coveragePath?.length ?? 0) >= 2) return stop;

        const savedPath = savedPathByStreetId.get(stop.id);
        if (!savedPath) return stop;

        changed = true;
        return { ...stop, coveragePath: savedPath };
      });

      return changed ? { ...previous, barangays } : previous;
    });
  }, [isOpen, availableStopPoints, setForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    if (!form.truckId) {
      nextErrors.truck = trucks.length === 0
        ? `No truck is available for ${form.day}. Choose another day.`
        : "Select a truck for this collection route.";
    }
    if (form.barangays.length === 0) {
      nextErrors.stops = "Add at least one street collection stop.";
    }
    if (stopsMissingCoverage.length > 0) {
      nextErrors.coverage = `${stopsMissingCoverage.length} selected ${
        stopsMissingCoverage.length === 1 ? "street does" : "streets do"
      } not have a saved coverage path. Add the missing path in Barangay Manager before saving.`;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setErrors({});
      await onSave();
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Unable to save this route. Please try again.",
      });
    }
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

  // Bulk add all streets for the active barangay
  const handleAddAll = (points: BarangayStreetRow[]) => {
    if (!points || points.length === 0) return;
    setForm((prev) => {
      const existingIds = new Set(prev.barangays.map((b) => b.id));
      const additions = points
        .filter((street) => !existingIds.has(street.id))
        .map((street) => ({
          id: street.id,
          name: `${street.name}${street.area ? ` (${street.area})` : ""}`,
          barangayId: street.barangay_id ?? prev.selectedBarangayId,
          latitude: street.latitude,
          longitude: street.longitude,
          coveragePath: street.coverage_path ?? null,
        }));
      if (additions.length === 0) return prev;
      return {
        ...prev,
        barangays: [...prev.barangays, ...additions],
      };
    });
    setErrors((current) => ({ ...current, stops: undefined, coverage: undefined, form: undefined }));
  };

  // Clear all stops in current route
  const handleClearAll = () => {
    setForm((prev) => ({
      ...prev,
      barangays: [],
    }));
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
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[96vw] max-w-5xl xl:max-w-6xl p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[92vh] flex flex-col overflow-hidden"
        >
          <form noValidate onSubmit={handleSubmit} className="flex flex-col h-full max-h-[92vh] overflow-hidden">
            {/* ── Modal Header (Pinned) ── */}
            <div className="gw-modal-header px-5 py-4 border-b border-border/60 shrink-0 flex items-center justify-between bg-card">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                  {isCreating ? (
                    <CalendarPlus className="w-5 h-5" />
                  ) : (
                    <CalendarCheck className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="gw-heading text-base text-foreground tracking-tight">
                    {isCreating ? "Create Collection Route" : "Edit Collection Route"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                    {isCreating
                      ? "Configure schedule, truck, and ordered street stops; driver is resolved automatically."
                      : `Update collection parameters and stops for ${selectedRoute?.day ?? form.day} route.`}
                  </DialogDescription>
                </div>
              </div>

              {/* Header actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="gw-action-ghost w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                  title="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Modal Content (Scrollable Split Body) ── */}
            <div className="px-5 py-4 overflow-y-auto flex-1 scrollbar-thin">
              <div className="grid grid-cols-1 lg:grid-cols-[1.18fr_0.82fr] gap-5 items-start">
                {/* ── LEFT COLUMN: Input Configuration ── */}
                <div className="space-y-4">
                  {/* Step 1: Schedule & Assignment Card */}
                  <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                      <h3 className="gw-heading text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        Step 1: Schedule & Assignment
                      </h3>
                      <span className="text-ui-caption font-medium text-muted-foreground">
                        {form.day} Collection
                      </span>
                    </div>

                    {/* Schedule Row: Day, Waste Category & Start Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Day of Week */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">
                          Day of Week
                        </Label>
                        <Select
                          value={form.day}
                          onValueChange={(val: Day) => {
                            setForm((prev) => ({ ...prev, day: val }));
                            setErrors((current) => ({
                              ...current,
                              truck: undefined,
                              form: undefined,
                            }));
                          }}
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

                      {/* Waste Category Auto Display */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">
                          Waste Type <span className="text-ui-caption font-normal text-muted-foreground">(Auto)</span>
                        </Label>
                        <div
                          className={cn(
                            "h-9 px-3 rounded-xl border flex items-center gap-2 text-xs font-semibold shadow-2xs",
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
                          <span className="truncate">{waste.label}</span>
                        </div>
                      </div>

                      {/* Keyboard-editable GreenWay time picker */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">
                          Start Time
                        </Label>
                        <TimePicker
                          value={form.startTime.slice(0, 5)}
                          onChange={(value) =>
                            setForm((prev) => ({ ...prev, startTime: value }))
                          }
                          containerClassName="max-w-none"
                          className="w-full"
                          dropdownSide="bottom"
                          dropdownAlign="right"
                        />
                      </div>
                    </div>

                    {/* Truck & Driver Assignment Row */}
                    <div className="space-y-2 pt-1">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-foreground">
                            Assigned Collection Truck
                          </Label>
                          {trucks.length > 0 && (
                            <span className="text-ui-caption text-muted-foreground font-medium">
                              {trucks.length} truck{trucks.length > 1 ? "s" : ""} available on {form.day}
                            </span>
                          )}
                        </div>

                        <SearchableSelect
                          aria-invalid={Boolean(errors.truck)}
                          aria-describedby={errors.truck ? "route-truck-error" : undefined}
                          value={form.truckId}
                          onValueChange={(val) => {
                            const driver = drivers.find((d) => d.truck_id === val);
                            setForm((prev) => ({
                              ...prev,
                              truckId: val,
                              driverId: driver?.id ?? "",
                            }));
                            setErrors((current) => ({
                              ...current,
                              truck: undefined,
                              form: undefined,
                            }));
                          }}
                          disabled={isLoadingTrucks || trucks.length === 0}
                          options={trucks.map((truck) => ({
                            value: truck.id,
                            label: `${truck.name} (${truck.plate_number})`,
                            keywords: truck.plate_number,
                          }))}
                          placeholder={isLoadingTrucks ? "Loading trucks..." : "Select a collection truck"}
                          searchPlaceholder="Search trucks..."
                          leadingIcon={<TruckIcon className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
                          className={cn(
                            "h-9 rounded-xl text-xs",
                            errors.truck && "border-destructive/70",
                          )}
                        />
                        {errors.truck && (
                          <p id="route-truck-error" className="text-ui-caption font-medium text-destructive">
                            {errors.truck}
                          </p>
                        )}
                      </div>

                      {/* Unified Driver & Truck Status Card */}
                      {form.truckId ? (
                        assignedDriver ? (
                          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">
                                  {assignedDriver.full_name}
                                </p>
                                <p className="text-ui-overline text-muted-foreground truncate">
                                  Assigned Collector
                                </p>
                              </div>
                            </div>
                            <span className={"inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-ui-overline font-bold border shrink-0 " + getStatusBadgeStyle("Collector Linked").className}>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              Collector Linked
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/25 bg-amber-500/10">
                            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                                No collector is currently assigned to this truck
                              </p>
                              <p className="text-ui-caption text-amber-700/90 dark:text-amber-300/90 mt-0.5">
                                You can save this route as unassigned, but operations require linking a driver in Collector Manager.
                              </p>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-dashed border-border/80 bg-muted/20 text-muted-foreground text-xs">
                          <TruckIcon className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                          <span>Select a truck above to automatically link its registered driver.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Stop Configuration (BarangayOrderList) */}
                  <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                      <h3 className="gw-heading text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        Step 2: Stop Configuration
                      </h3>
                      <span className="text-ui-caption font-semibold text-primary tabular-nums">
                        {form.barangays.length} {form.barangays.length === 1 ? "stop" : "stops"} ordered
                      </span>
                    </div>

                    <BarangayOrderList
                      form={form}
                      barangays={barangays}
                      availableStopPoints={availableStopPoints}
                      isLoadingBarangays={isLoadingBarangays}
                      isLoadingStopPoints={isLoadingStopPoints}
                      isCollectionAvailable={isCollectionAvailable}
                      onSelectBarangay={onSelectBarangay}
                      error={errors.stops}
                      onAdd={(point) => {
                        onAddBarangay(point);
                        setErrors((current) => ({
                          ...current,
                          stops: undefined,
                          coverage: undefined,
                          form: undefined,
                        }));
                      }}
                      onAddAll={handleAddAll}
                      onClearAll={handleClearAll}
                      onRemove={onRemoveBarangay}
                      onMove={onMoveBarangay}
                      onReorder={onReorderBarangay}
                    />
                  </div>
                </div>

                {/* ── RIGHT COLUMN: Live Route Overview & Map Preview ── */}
                <div className="space-y-4 lg:sticky lg:top-0">
                  <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                        <MapPinned className="w-4 h-4 text-primary" />
                        Live Route Overview
                      </div>
                      <span className="text-ui-overline font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        {form.day}
                      </span>
                    </div>

                    {/* Parameter Summary Bar */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                        <span className="text-ui-overline font-medium text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Time & Waste
                        </span>
                        <p className="font-semibold text-foreground truncate">
                          {form.startTime} • {waste.label}
                        </p>
                      </div>

                      <div className="p-2 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                        <span className="text-ui-overline font-medium text-muted-foreground flex items-center gap-1">
                          <TruckIcon className="w-3 h-3" /> Vehicle
                        </span>
                        <p className="font-semibold text-foreground truncate">
                          {selectedTruck ? selectedTruck.name : "None Selected"}
                        </p>
                      </div>

                      <div className="p-2 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                        <span className="text-ui-overline font-medium text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" /> Driver
                        </span>
                        <p className="font-semibold text-foreground truncate">
                          {assignedDriver ? assignedDriver.full_name : "Unassigned"}
                        </p>
                      </div>

                      <div className="p-2 rounded-xl bg-muted/40 border border-border/70 space-y-0.5">
                        <span className="text-ui-overline font-medium text-muted-foreground flex items-center gap-1">
                          <Layers className="w-3 h-3" /> Total Stops
                        </span>
                        <p className="font-semibold text-primary">
                          {form.barangays.length} {form.barangays.length === 1 ? "Stop" : "Stops"}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Leaflet Route Map */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-ui-caption text-muted-foreground px-0.5">
                        <span>Street coverage route</span>
                        <span>
                          {form.barangays.length - stopsMissingCoverage.length} of {form.barangays.length} mapped
                        </span>
                      </div>
                      <RouteStopsMap
                        stops={form.barangays}
                        barangays={barangays}
                        className="h-60 sm:h-64 w-full rounded-xl overflow-hidden border border-border/70 shadow-2xs"
                      />
                      {stopsMissingCoverage.length > 0 && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-ui-caption leading-relaxed text-amber-700 dark:text-amber-300">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>
                            <strong>{stopsMissingCoverage.length} selected {stopsMissingCoverage.length === 1 ? "street needs" : "streets need"} a coverage path.</strong>{" "}
                            Add {stopsMissingCoverage.length === 1 ? "it" : "them"} in Barangay Manager before saving this route.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Route Stop Sequence Itinerary Preview */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-ui-caption font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          Stop Order Itinerary
                        </span>
                        <span className="text-ui-overline font-semibold text-muted-foreground">
                          {form.barangays.length} recorded
                        </span>
                      </div>

                      {form.barangays.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-xl bg-muted/10 px-3">
                          <MapPin className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-primary" />
                          <p className="font-medium text-foreground">No stops in route</p>
                          <p className="text-ui-caption text-muted-foreground mt-0.5">
                            Pick a barangay in Step 2 to add streets to the collection sequence.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                          {form.barangays.map((stop, idx) => {
                            const parentB = barangays.find(
                              (b) => b.id === (stop.barangayId ?? stop.id)
                            );
                            return (
                              <div
                                key={`${stop.id}-${idx}`}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border/70 bg-background/80 text-xs shadow-2xs hover:bg-muted/40 transition-colors"
                              >
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/25 flex items-center justify-center font-bold text-ui-overline shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1 truncate">
                                  <span className="font-semibold text-foreground truncate block">
                                    {stop.name}
                                  </span>
                                  {parentB && (
                                    <span className="text-ui-overline text-muted-foreground flex items-center gap-0.5 truncate">
                                      <MapPin className="w-2.5 h-2.5 opacity-70 shrink-0" />
                                      {parentB.name}
                                    </span>
                                  )}
                                </div>
                                {stop.coveragePath && stop.coveragePath.length >= 2 ? (
                                  <span className="flex shrink-0 items-center gap-1 text-ui-overline font-semibold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Path saved
                                  </span>
                                ) : (
                                  <span className="flex shrink-0 items-center gap-1 text-ui-overline font-semibold text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="h-3 w-3" />
                                    Needs path
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {errors.form && (
                <div className="mt-3 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errors.form}</span>
                </div>
              )}
            </div>

            {/* ── Modal Footer (Pinned / Sticky) ── */}
            <div className="gw-modal-footer px-5 py-3.5 border-t border-border/60 shrink-0 flex items-center justify-between gap-3 bg-card">
              {/* Readiness status */}
              <div className="min-w-0 hidden sm:flex items-center gap-2 text-xs">
                {!form.truckId ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span>Select a collection truck to continue</span>
                  </div>
                ) : trucks.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-destructive">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>No trucks available for {form.day}</span>
                  </div>
                ) : form.barangays.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span>Add at least one street collection stop</span>
                  </div>
                ) : stopsMissingCoverage.length > 0 ? (
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Add {stopsMissingCoverage.length} missing coverage {stopsMissingCoverage.length === 1 ? "path" : "paths"}
                    </span>
                  </div>
                ) : assignedDriver ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      Ready to schedule for {assignedDriver.full_name}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Info className="w-3.5 h-3.5 text-warning-foreground shrink-0" />
                    <span>Ready to save as an unassigned route</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRequestClose}
                  disabled={isSaving}
                  className="h-9 text-xs rounded-xl px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || isLoadingTrucks}
                  className="h-9 text-xs rounded-xl px-5 font-semibold shadow-sm gap-1.5 cursor-pointer"
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
