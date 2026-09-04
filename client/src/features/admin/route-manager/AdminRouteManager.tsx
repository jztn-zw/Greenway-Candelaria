import React, { useState, useMemo } from "react";
import {
  PageHeaderSkeleton,
  KPIRowSkeleton,
  RouteManagerSkeleton,
} from "@/components/PageLoadingSkeletons";
import { useRoutes, RouteData, RouteForm, Day } from "./hooks/useRoutes";
import { useBarangays } from "./hooks/useBarangays";
import { useTrucks } from "./hooks/useTrucks";
import { useDrivers } from "./hooks/useDrivers";
import { DAYS, DEFAULT_FORM } from "./constants";
import {
  FilterPillTabs,
  FilterPillItem,
  SegmentedControl,
  SegmentedControlOption,
  SearchInput,
} from "@/components/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Route as RouteIcon,
  Plus,
  RotateCcw,
  LayoutGrid,
  TableProperties,
  PauseCircle,
  PlayCircle,
  AlertCircle,
} from "lucide-react";

import RouteKPIs from "./components/RouteKPIs";
import RouteDayView from "./components/RouteDayView";
import RouteTable from "./components/RouteTable";
import RouteEditorModal from "./components/RouteEditorModal";
import RouteDetailModal from "./components/RouteDetailModal";
import DuplicateDialog from "./components/DuplicateDialog";

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

  const [barangaySearch, setBarangaySearch] = useState("");
  const [form, setForm] = useState<RouteForm>(DEFAULT_FORM);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);
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
    setBarangaySearch("");
    setIsEditorOpen(true);
  };

  const startEdit = (route: RouteData) => {
    setIsCreating(false);
    setSelectedRouteId(route.id);
    setBarangaySearch("");
    setForm({
      day: route.day,
      truckId: route.truckId,
      driverId: route.driverId ?? "",
      startTime: route.startTime,
      barangays: route.stops
        .slice()
        .sort((a, b) => a.stopOrder - b.stopOrder)
        .map((s) => ({ id: s.barangayId, name: s.barangayName })),
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
  const addBarangay = (b: { id: string; name: string }) => {
    if (!form.barangays.find((x) => x.id === b.id)) {
      setForm((prev) => ({ ...prev, barangays: [...prev.barangays, b] }));
    }
    setBarangaySearch("");
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

  const availableBarangays = useMemo(() => {
    return barangays.filter(
      (b) =>
        !form.barangays.find((x) => x.id === b.id) &&
        b.name.toLowerCase().includes(barangaySearch.toLowerCase())
    );
  }, [barangays, form.barangays, barangaySearch]);

  // ── CRUD handlers ──
  const handleSave = async () => {
    if (!form.truckId || form.barangays.length === 0) return;
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
    return new Set(routes.filter((r) => r.active).flatMap((r) => r.barangays)).size;
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
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <RouteIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
              Route Manager
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Plan collection days, assign fleet resources, and verify every barangay stop.
            </p>
          </div>
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
          onDelete={handleDelete}
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
          onDelete={handleDelete}
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
        trucks={trucks}
        drivers={drivers}
        isLoadingTrucks={isLoadingTrucks}
        isLoadingDrivers={isLoadingDrivers}
        isLoadingBarangays={isLoadingBarangays}
        barangaySearch={barangaySearch}
        setBarangaySearch={setBarangaySearch}
        availableBarangays={availableBarangays}
        barangays={barangays}
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

      <AlertDialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-border/80 sm:max-w-md">
          <AlertDialogHeader>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-1">
              {statusTarget?.active ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
            </div>
            <AlertDialogTitle className="text-base font-bold font-display">
              {statusTarget?.active ? "Pause this collection route?" : "Enable this collection route?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              {statusTarget?.active
                ? "Pausing removes the route from active operations. Its saved truck, collector, schedule, and stop order will remain available for later use."
                : "Enabling returns this route to active operations. GreenWay will check for same-day barangay conflicts before applying the change."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl h-9 text-xs">Keep current status</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmStatusChange()}
              className="rounded-xl h-9 text-xs font-bold"
            >
              {statusTarget?.active ? "Pause Route" : "Enable Route"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRouteManager;
