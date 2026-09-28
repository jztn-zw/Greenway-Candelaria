import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import {
FilterPillItem,
FilterPillTabs,
SearchInput,
SegmentedControl,
SegmentedControlOption,
} from "@/components/common";
import {
KPIRowSkeleton,
PageHeaderSkeleton,
RouteManagerSkeleton,
} from "@/components/PageLoadingSkeletons";

import { Button } from "@/components/ui/button";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { useAdminQuery } from "@/lib/adminQuery";
import { fetchBarangayStreets, type BarangayStreetRow } from "@/services/barangaysService";
import {
AlertCircle,
LayoutGrid,
PauseCircle,
PlayCircle,
Plus,
RotateCcw,
TableProperties,
Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { DAYS, DEFAULT_FORM } from "./constants";
import { useBarangays } from "./hooks/useBarangays";
import { useDrivers } from "./hooks/useDrivers";
import { Day, RouteData, RouteForm, useRoutes } from "./hooks/useRoutes";
import { useTrucks } from "./hooks/useTrucks";

import DuplicateDialog from "./components/DuplicateDialog";
import RouteDayView from "./components/RouteDayView";
import RouteDetailModal from "./components/RouteDetailModal";
import RouteEditorModal from "./components/RouteEditorModal";
import RouteKPIs from "./components/RouteKPIs";
import RouteTable from "./components/RouteTable";

type ViewMode = "DAY_VIEW" | "TABLE_VIEW";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const AdminRouteManager: React.FC = () => {
  // ── Data hooks ──
  const {
    routes,
    isLoading,
    isSaving,
    createNew,
    updateExisting,
    toggleActive,
    duplicate,
    remove,
    error,
    loadRoutes,
  } = useRoutes();

  const { barangays, isLoading: isLoadingBarangays } = useBarangays();
  const { trucks, isLoading: isLoadingTrucks } = useTrucks();
  const { drivers, isLoading: isLoadingDrivers } = useDrivers();

  // ── UI Filter & View state ──
  const [filterDay, setFilterDay] = useState<"all" | Day>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("DAY_VIEW");

  // ── Modals state ──
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [inspectingRouteId, setInspectingRouteId] = useState<string | null>(null);

  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateTargetDay, setDuplicateTargetDay] = useState<Day>("Tuesday");
  const [duplicatingRoute, setDuplicatingRoute] = useState<RouteData | null>(null);

  const [form, setForm] = useState<RouteForm>(DEFAULT_FORM);
  const [availableStreets, setAvailableStreets] = useState<BarangayStreetRow[]>([]);
  const [isLoadingStreets, setIsLoadingStreets] = useState(false);
  const [isCollectionAvailable, setIsCollectionAvailable] = useState(false);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RouteData | null>(null);
  const [togglingRouteId, setTogglingRouteId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<RouteData | null>(null);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  const inspectingRoute = useMemo(
    () => routes.find((r) => r.id === inspectingRouteId) ?? null,
    [routes, inspectingRouteId]
  );

  // ── Filtering Logic ──
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      // Day filter
      if (filterDay !== "all" && r.day !== filterDay) return false;

      // Status filter
      if (statusFilter === "ACTIVE" && !r.active) return false;
      if (statusFilter === "INACTIVE" && r.active) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTruck =
          r.truckName.toLowerCase().includes(query) ||
          r.truckPlate.toLowerCase().includes(query);
        const matchesDriver = r.driverName.toLowerCase().includes(query);
        const matchesBarangay = r.barangays.some((b) =>
          b.toLowerCase().includes(query)
        );
        const matchesDay = r.day.toLowerCase().includes(query);
        if (!matchesTruck && !matchesDriver && !matchesBarangay && !matchesDay) {
          return false;
        }
      }

      return true;
    });
  }, [routes, filterDay, statusFilter, searchQuery]);

  const routesByDay = useMemo(() => {
    return DAYS.reduce((acc, day) => {
      acc[day] = filteredRoutes.filter((r) => r.day === day);
      return acc;
    }, {} as Record<Day, RouteData[]>);
  }, [filteredRoutes]);

  const hasActiveFilters = filterDay !== "all" || statusFilter !== "ALL" || searchQuery.trim() !== "";

  const handleResetFilters = () => {
    setFilterDay("all");
    setStatusFilter("ALL");
    setSearchQuery("");
  };

  // ── Form & Modal triggers ──
  const startCreate = () => {
    setSelectedRouteId(null);
    setIsCreating(true);
    setForm(DEFAULT_FORM);
    setIsEditorOpen(true);
  };

  const startEdit = (route: RouteData) => {
    setIsCreating(false);
    setSelectedRouteId(route.id);
    setForm({
      day: route.day,
      truckId: route.truckId,
      driverId: route.driverId ?? "",
      startTime: route.startTime,
      selectedBarangayId: route.stops[0]?.barangayId ?? "",
      barangays: route.stops
        .slice()
        .sort((a, b) => a.stopOrder - b.stopOrder)
        .map((s) => ({
          id: s.streetId ?? s.barangayId,
          name: s.stopName,
          barangayId: s.barangayId,
          coveragePath: s.coveragePath,
        })),
    });
    setIsEditorOpen(true);
  };

  const handleOpenView = (route: RouteData) => {
    setInspectingRouteId(route.id);
    setIsDetailOpen(true);
  };

  const handleOpenDuplicate = (route: RouteData) => {
    setDuplicatingRoute(route);
    setDuplicateTargetDay(DAYS.find((day) => day !== route.day) ?? "Monday");
    setDuplicateDialogOpen(true);
  };

  // ── Barangay sequence management ──
  const addBarangay = (street: BarangayStreetRow) => {
    if (!form.barangays.find((x) => x.id === street.id)) {
      setForm((prev) => ({
        ...prev,
        barangays: [...prev.barangays, {
          id: street.id,
          name: `${street.name}${street.area ? ` (${street.area})` : ""}`,
          barangayId: street.barangay_id ?? prev.selectedBarangayId,
          latitude: street.latitude,
          longitude: street.longitude,
          coveragePath: street.coverage_path ?? null,
        }],
      }));
    }
  };

  const removeBarangay = (id: string) => {
    setForm((prev) => ({
      ...prev,
      barangays: prev.barangays.filter((b) => b.id !== id),
    }));
  };

  const moveBarangay = (idx: number, direction: "up" | "down") => {
    const newList = [...form.barangays];
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= newList.length) return;
    [newList[idx], newList[swap]] = [newList[swap], newList[idx]];
    setForm((prev) => ({ ...prev, barangays: newList }));
  };

  const reorderBarangays = (sourceIdx: number, targetIdx: number) => {
    if (sourceIdx === targetIdx) return;
    setForm((prev) => {
      const list = [...prev.barangays];
      const [moved] = list.splice(sourceIdx, 1);
      if (!moved) return prev;
      list.splice(targetIdx, 0, moved);
      return { ...prev, barangays: list };
    });
  };

  // A truck and a collection street may appear in only one schedule for a day.
  // The route currently being edited is excluded so its own selections remain valid.
  const scheduledRoutesForFormDay = useMemo(
    () => routes.filter(
      (route) =>
        route.day === form.day &&
        route.id !== selectedRouteId,
    ),
    [routes, form.day, selectedRouteId],
  );

  const availableTrucks = useMemo(() => {
    const scheduledTruckIds = new Set(
      scheduledRoutesForFormDay.map((route) => route.truckId),
    );
    return trucks.filter((truck) => !scheduledTruckIds.has(truck.id));
  }, [trucks, scheduledRoutesForFormDay]);

  const selectableStreets = useMemo(() => {
    const scheduledStreetIds = new Set(
      scheduledRoutesForFormDay.flatMap((route) =>
        route.stops
          .map((stop) => stop.streetId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    return availableStreets.filter(
      (street) =>
        !form.barangays.some((stop) => stop.id === street.id) &&
        !scheduledStreetIds.has(street.id),
    );
  }, [availableStreets, form.barangays, scheduledRoutesForFormDay]);

  const streetsQuery = useAdminQuery("barangays", ["route-streets", form.selectedBarangayId], () => fetchBarangayStreets(form.selectedBarangayId), { enabled: isEditorOpen && !!form.selectedBarangayId });
  useEffect(() => {
    setAvailableStreets(isEditorOpen ? streetsQuery.data?.streets ?? [] : []);
    setIsCollectionAvailable(isEditorOpen && (streetsQuery.data?.collection_service_available ?? false));
    setIsLoadingStreets(streetsQuery.isLoading);
  }, [isEditorOpen, streetsQuery.data, streetsQuery.isLoading]);

  // ── CRUD handlers ──
  const handleSave = async () => {
    if (!form.truckId || form.barangays.length === 0) {
      throw new Error("Complete the required route details before saving.");
    }
    if (!availableTrucks.some((truck) => truck.id === form.truckId)) {
      throw new Error("This truck is no longer available for the selected day. Please select another truck.");
    }
    if (isCreating) {
      const result = await createNew(form);
      if (result) {
        setIsEditorOpen(false);
      }
    } else if (selectedRouteId) {
      const result = await updateExisting(selectedRouteId, form);
      if (result) {
        setIsEditorOpen(false);
      }
    }
  };

  const handleDuplicate = async () => {
    if (!duplicatingRoute) return;
    setDuplicateDialogOpen(false);
    const result = await duplicate(duplicatingRoute, duplicateTargetDay);
    if (result) {
      startEdit(result);
    }
  };

  const handleDelete = async (route: RouteData) => {
    setDeletingRouteId(route.id);
    try {
      await remove(route.id);
      if (inspectingRouteId === route.id) {
        setIsDetailOpen(false);
      }
      if (selectedRouteId === route.id) {
        setIsEditorOpen(false);
      }
    } finally {
      setDeletingRouteId(null);
    }
  };

  const handleToggleActive = async (route: RouteData) => {
    setTogglingRouteId(route.id);
    try {
      await toggleActive(route);
    } finally {
      setTogglingRouteId(null);
    }
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    const route = statusTarget;
    setStatusTarget(null);
    await handleToggleActive(route);
  };

  // ── Status Filter Tabs (Option 1: Compact 3 tabs) ──
  const statusTabs = useMemo<FilterPillItem<StatusFilter>[]>(() => {
    return [
      { id: "ALL", label: "All Routes", count: routes.length },
      { id: "ACTIVE", label: "Active", count: routes.filter((r) => r.active).length },
      { id: "INACTIVE", label: "Paused", count: routes.filter((r) => !r.active).length },
    ];
  }, [routes]);

  const viewOptions = useMemo<SegmentedControlOption<ViewMode>[]>(() => {
    return [
      { id: "DAY_VIEW", label: "Day Schedule", icon: LayoutGrid },
      { id: "TABLE_VIEW", label: "Master Table", icon: TableProperties },
    ];
  }, []);

  // ── KPI counts ──
  const totalRoutes = routes.length;
  const activeRoutes = routes.filter((r) => r.active).length;
  const coveredBarangays = useMemo(() => {
    return new Set(
      routes
        .filter((route) => route.active)
        .flatMap((route) => route.stops.map((stop) => stop.barangayId)),
    ).size;
  }, [routes]);
  const totalBarangays = barangays.length || 0;

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-5">
        <PageHeaderSkeleton />
        <KPIRowSkeleton count={4} />
        <RouteManagerSkeleton />
      </div>
    );
  }

  if (error && routes.length === 0) {
    return (
      <div className="w-full max-w-[1600px] mx-auto min-h-[55vh] flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-7 text-center shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold font-display text-foreground">Routes could not be loaded</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
          </div>
          <Button onClick={() => void loadRoutes()} className="h-9 rounded-xl text-xs font-bold">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-7 pb-10">
      {/* ── Page Header (Unboxed Canvas) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
            Route Manager
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Plan collection days, assign fleet resources, and verify every barangay stop.
          </p>
        </div>

        <Button
          onClick={startCreate}
          className="gap-2 h-10 px-5 rounded-xl font-bold shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Route</span>
        </Button>
      </div>

      {/* ── 4 Bento Metric Cards ── */}
      <RouteKPIs
        totalRoutes={totalRoutes}
        activeRoutes={activeRoutes}
        coveredBarangays={coveredBarangays}
        totalBarangays={totalBarangays}
      />

      {/* ── Standardized 2-Tier Filter Card Container ── */}
      <section className="rounded-2xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden">
        {/* Tier 1: Primary Status Filter Tabs + View Switcher */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-5">
          <FilterPillTabs<StatusFilter>
            items={statusTabs}
            activeId={statusFilter}
            onChange={(id) => setStatusFilter(id)}
          />

          <SegmentedControl<ViewMode>
            options={viewOptions}
            value={viewMode}
            onChange={(mode) => setViewMode(mode)}
            ariaLabel="Route display mode"
            className="self-stretch sm:self-auto shrink-0 justify-center"
          />
        </div>

        {/* Tier 2: Search Input + Day of Week Filter + Live Count & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search truck, plate, driver, barangay..."
              containerClassName="w-full sm:max-w-xs md:max-w-sm"
            />

            {/* Day of Week Filter Dropdown */}
            <Select
              value={filterDay}
              onValueChange={(val: "all" | Day) => setFilterDay(val)}
            >
              <SelectTrigger className="w-36 h-9 text-xs rounded-xl bg-card border-border/80 shrink-0">
                <SelectValue placeholder="All Days" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs">All Days</SelectItem>
                {DAYS.map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
              Showing <span className="font-bold text-foreground">{filteredRoutes.length}</span> of {routes.length} routes
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-xl shrink-0 gap-1.5 cursor-pointer active:scale-95 transition-all hover:bg-muted/50"
                title="Reset active filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Main View Area (Day Schedule vs Master Table) ── */}
      {viewMode === "DAY_VIEW" ? (
        <RouteDayView
          routesByDay={routesByDay}
          filteredRoutes={filteredRoutes}
          trucks={trucks}
          isLoadingTrucks={isLoadingTrucks}
          onView={handleOpenView}
          onEdit={startEdit}
          onDuplicate={handleOpenDuplicate}
          onToggleActive={setStatusTarget}
          onDelete={setDeleteTarget}
          isTogglingId={togglingRouteId}
          isDeletingId={deletingRouteId}
        />
      ) : (
        <RouteTable
          routes={filteredRoutes}
          trucks={trucks}
          isLoadingTrucks={isLoadingTrucks}
          onView={handleOpenView}
          onEdit={startEdit}
          onDuplicate={handleOpenDuplicate}
          onToggleActive={setStatusTarget}
          onDelete={setDeleteTarget}
          isTogglingId={togglingRouteId}
          isDeletingId={deletingRouteId}
        />
      )}

      {/* ── Route Editor Modal (Create & Edit) ── */}
      <RouteEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        isCreating={isCreating}
        selectedRoute={selectedRoute}
        form={form}
        setForm={setForm}
        isSaving={isSaving}
        trucks={availableTrucks}
        drivers={drivers}
        isLoadingTrucks={isLoadingTrucks}
        isLoadingDrivers={isLoadingDrivers}
        isLoadingBarangays={isLoadingBarangays}
        barangays={barangays}
        availableStopPoints={selectableStreets}
        isLoadingStopPoints={isLoadingStreets}
        isCollectionAvailable={isCollectionAvailable}
        onSelectBarangay={(selectedBarangayId) => setForm((previous) => ({ ...previous, selectedBarangayId }))}
        onAddBarangay={addBarangay}
        onRemoveBarangay={removeBarangay}
        onMoveBarangay={moveBarangay}
        onReorderBarangay={reorderBarangays}
        onSave={handleSave}
      />

      {/* ── Route Detail Inspector Modal ── */}
      <RouteDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        route={inspectingRoute}
        truck={trucks.find((t) => t.id === inspectingRoute?.truckId)}
        barangays={barangays}
        onEdit={startEdit}
        onDuplicate={handleOpenDuplicate}
        onToggleActive={setStatusTarget}
        onDelete={handleDelete}
        isToggling={inspectingRoute ? togglingRouteId === inspectingRoute.id : false}
        isDeleting={inspectingRoute ? deletingRouteId === inspectingRoute.id : false}
      />

      {/* ── Duplicate Dialog ── */}
      <DuplicateDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        targetDay={duplicateTargetDay}
        sourceDay={duplicatingRoute?.day ?? null}
        setTargetDay={setDuplicateTargetDay}
        isSaving={isSaving}
        onDuplicate={handleDuplicate}
      />

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete collection route?"
        icon={<Trash2 />}
        variant="destructive"
        description="This removes the inactive route template. Completed daily route history will be preserved in the system."
        confirmLabel="Delete route"
        confirmDisabled={!deleteTarget || deletingRouteId === deleteTarget.id}
        closeOnConfirm
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) void handleDelete(target);
        }}
      />

      <ConfirmationDialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.active ? "Pause this collection route?" : "Enable this collection route?"}
        icon={statusTarget?.active ? <PauseCircle /> : <PlayCircle />}
        description={statusTarget?.active
          ? "Pausing removes the route from active operations. Its saved truck, collector, schedule, and stop order will remain available for later use."
          : "Enabling returns this route to active operations. GreenWay will check for same-day barangay conflicts before applying the change."}
        cancelLabel="Keep current status"
        confirmLabel={statusTarget?.active ? "Pause Route" : "Enable Route"}
        onConfirm={() => void confirmStatusChange()}
        closeOnConfirm
      />
    </div>
  );
};

export default AdminRouteManager;
