import { toast } from "@/lib/toast";
import { getActionErrorMessage } from "@/lib/feedbackMessages";
import React,{ useState,useMemo,useEffect } from "react";
import { AdminModalContent as DialogContent } from "@/components/admin/AdminModal";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TimePicker } from "@/components/ui/time-picker";
import { AdminUnsavedChangesDialog as UnsavedChangesDialog } from "@/components/admin/AdminModal";
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
import { DAYS,WASTE_MAP } from "../constants";
import BarangayOrderList from "./BarangayOrderList";
import type { RouteData,RouteForm,Day } from "../hooks/useRoutes";
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
  isLoadingBarangays: boolean;
  barangays: Barangay[];
  availableStopPoints: BarangayStreetRow[];
  savedStreetCount?: number;
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
  isLoadingBarangays,
  barangays,
  availableStopPoints,
  savedStreetCount,
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

  // The collector's existing vehicle assignment supplies the route truck.
  const assignedDriver = form.driverId
    ? drivers.find((d) => d.id === form.driverId && d.truck_id === form.truckId) ?? null
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
    if (!form.truckId || !assignedDriver) {
      nextErrors.truck = trucks.length === 0
        ? `No truck is available for ${form.day}. Choose another day.`
        : "Select a collector with an available assigned truck.";
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
      toast.error("Could not save collection route", { description: getActionErrorMessage(err) });
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
          className="admin-route-editor fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-1.5rem)] max-w-5xl xl:max-w-6xl p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden max-h-[92dvh] flex flex-col overflow-hidden"
        >
          <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-col max-h-[92dvh] overflow-hidden">
            {/* ── Modal Header (Pinned) ── */}
            <div className="gw-modal-header px-3 py-3 sm:px-5 sm:py-4 border-b border-border/60 shrink-0 flex items-center justify-between gap-3 bg-card">
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
                  <DialogDescription className="text-ui-caption text-muted-foreground mt-0.5">
                    {isCreating
                      ? "Configure schedule, truck, and ordered street stops; driver is resolved automatically."
                      : `Update collection parameters and stops for ${selectedRoute?.day ?? form.day} route.`}
                  </DialogDescription>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRequestClose}
                className="gw-action-ghost w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Close modal"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Modal Content (Scrollable Split Body) ── */}
            <div className="gw-modal-body min-h-0 min-w-0 px-3 sm:px-5 py-4 overflow-y-auto flex-1 scrollbar-thin">
              <div className="admin-route-editor-grid grid min-w-0 grid-cols-1 gap-4 items-start">
                {/* ── LEFT COLUMN: Input Configuration ── */}
                <div className="min-w-0 space-y-4">
                  {/* Step 1: Schedule & Assignment Card */}
                  <p className="text-xs leading-relaxed text-muted-foreground">If today's collection has already ended, schedule changes apply from the next occurrence of the selected day.</p>
                  <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                      <h3 className="gw-heading text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        Step 1: Schedule & Assignment
                      </h3>
                      <span className="text-ui-caption font-medium text-muted-foreground">
                        {form.day} Collection
                      </span>
                    </div>

                    {/* Schedule Row: Day, Waste Category & Start Time */}
                    <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <div className="space-y-1.5 sm:col-span-2 sm:order-3">
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
                        <Label htmlFor="route-start-time" className="text-xs font-medium text-foreground">
                          Start Time
                        </Label>
                        <TimePicker
                          id="route-start-time"
                          value={form.startTime.slice(0, 5)}
                          onChange={(value) =>
                            setForm((prev) => ({ ...prev, startTime: value }))
                          }
                          containerClassName="max-w-none"
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Truck & Driver Assignment Row */}
                    <div className="space-y-2 pt-1">
                      <div className="space-y-1.5">
                        <Label htmlFor="route-collector" className="text-xs font-medium text-foreground">Assigned Collector</Label>
                        <SearchableSelect
                          id="route-collector" value={form.driverId}
                          aria-invalid={Boolean(errors.truck)}
                          aria-describedby={errors.truck ? "route-assignment-error" : undefined}
                          onValueChange={(value) => {
                            const collector = drivers.find((driver) => driver.id === value);
                            const truckId = collector?.truck_id;
                            if (!collector || !truckId) return;
                            setForm((previous) => ({ ...previous, driverId: collector.id, truckId }));
                            setErrors((current) => ({ ...current, truck: undefined, form: undefined }));
                          }}
                          options={drivers.filter((driver) => trucks.some((truck) => truck.id === driver.truck_id)).map((driver) => ({
                            value: driver.id, label: driver.full_name, keywords: driver.truck_name ?? "",
                          }))}
                          disabled={isLoadingTrucks || trucks.length === 0}
                          placeholder="Select a collector" searchPlaceholder="Search by collector name…" compactSearchPlaceholder="Collector name…"
                          emptyMessage="No collectors with an available assigned truck."
                          leadingIcon={<User className="size-3.5 shrink-0 text-muted-foreground" />}
                          className="h-9 rounded-xl text-xs"
                        />
                        <p className="text-ui-caption text-muted-foreground">The collector's truck is assigned automatically from Collector Manager.</p>
                        {trucks.length === 0 && !isLoadingTrucks && <p role="status" className="text-ui-caption text-warning-foreground">No collectors have an available truck on {form.day}. Choose another day or edit an existing schedule.</p>}
                        {errors.truck && <p id="route-assignment-error" className="text-ui-caption text-destructive">{errors.truck}</p>}
                      </div>
                      <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border/80 bg-muted/20 p-3">
                        <TruckIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="text-ui-caption text-muted-foreground">Assigned Truck</p>
                          <p className="break-words text-xs font-medium text-foreground">
                            {selectedTruck ? `${selectedTruck.name} (${selectedTruck.plate_number})` : "Select a collector to automatically assign their truck."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Stop Configuration (BarangayOrderList) */}
                  <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
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
                      savedStreetCount={savedStreetCount}
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
                <div className="min-w-0 space-y-4">
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
                        <span>Street Coverage Route</span>
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
                                    Path Saved
                                  </span>
                                ) : (
                                  <span className="flex shrink-0 items-center gap-1 text-ui-overline font-semibold text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="h-3 w-3" />
                                    Needs Path
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
            <div className="gw-modal-footer px-3 py-3 sm:px-5 sm:py-3.5 border-t border-border/60 shrink-0 flex flex-wrap items-center justify-between gap-3 bg-card">
              {/* Readiness status */}
              <div className="min-w-0 hidden md:flex items-center gap-2 text-xs">
                {!form.truckId ? (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span>Select a collector to continue</span>
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
                    <span>Select a collector with an available truck</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex max-w-full flex-wrap items-center justify-end gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRequestClose}
                  disabled={isSaving}
                  className="h-8 sm:h-9 max-w-full text-xs rounded-xl px-3"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || isLoadingTrucks}
                  className="h-8 sm:h-9 max-w-full text-xs rounded-xl px-3 sm:px-4 font-semibold gap-1.5 [&_svg]:size-3.5"
                  loading={isSaving}
                  loadingLabel={isCreating ? "Creating route…" : "Saving route…"}
                >
                  <>
                      <Save className="w-3.5 h-3.5" />
                      <span>
                        {isCreating ? "Create Route" : "Save Changes"}
                      </span>
                    </>
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
