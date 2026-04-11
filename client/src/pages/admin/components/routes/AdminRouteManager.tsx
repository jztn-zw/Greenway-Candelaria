import { useState } from "react";
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
import RouteHeader from "./components/RouteHeader";
import RouteList from "./components/RouteList";
import RouteEmptyState from "./components/RouteEmptyState";
import RouteFormPanel from "./components/RouteFormPanel";
import DuplicateDialog from "./components/DuplicateDialog";

const AdminRouteManager = () => {
  // ── Data hooks ──
  const {
    routes, isLoading, isSaving,
    createNew, updateExisting, toggleActive, duplicate, remove,
  } = useRoutes();

  const { barangays, isLoading: isLoadingBarangays } = useBarangays();
  const { trucks, isLoading: isLoadingTrucks } = useTrucks();
  const { drivers, isLoading: isLoadingDrivers } = useDrivers();

  // ── UI state ──
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateTargetDay, setDuplicateTargetDay] = useState<Day>("Tuesday");
  const [filterDay, setFilterDay] = useState<Day | "all">("all");
  const [barangaySearch, setBarangaySearch] = useState("");
  const [form, setForm] = useState<RouteForm>(DEFAULT_FORM);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);
  const [togglingRouteId, setTogglingRouteId] = useState<string | null>(null);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;
  const filteredRoutes =
    filterDay === "all" ? routes : routes.filter((r) => r.day === filterDay);

  const routesByDay = DAYS.reduce(
    (acc, day) => {
      acc[day] = filteredRoutes.filter((r) => r.day === day);
      return acc;
    },
    {} as Record<Day, RouteData[]>,
  );

  // ── Form helpers ──
  const startCreate = () => {
    setSelectedRouteId(null);
    setIsCreating(true);
    setForm(DEFAULT_FORM);
    setBarangaySearch("");
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
        .sort((a, b) => a.stopOrder - b.stopOrder)
        .map((s) => ({ id: s.barangayId, name: s.barangayName })),
    });
  };

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

  const availableBarangays = barangays.filter(
    (b) =>
      !form.barangays.find((x) => x.id === b.id) &&
      b.name.toLowerCase().includes(barangaySearch.toLowerCase()),
  );

  // ── Save handler ──
  const handleSave = async () => {
    if (!form.truckId || form.barangays.length === 0) return;
    if (isCreating) {
      const result = await createNew(form);
      if (result) {
        setSelectedRouteId(result.id);
        setIsCreating(false);
      }
    } else if (selectedRouteId) {
      await updateExisting(selectedRouteId, form);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedRoute) return;
    setDuplicateDialogOpen(false);
    const result = await duplicate(selectedRoute, duplicateTargetDay);
    if (result) {
      setSelectedRouteId(result.id);
      startEdit(result);
    }
  };

  const handleDelete = async (route: RouteData) => {
    setDeletingRouteId(route.id);
    try {
      const success = await remove(route.id);
      if (success) {
        setSelectedRouteId(null);
        setIsCreating(false);
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

  // ── KPI counts ──
  const totalRoutes = routes.length;
  const activeRoutes = routes.filter((r) => r.active).length;
  const coveredBarangays = new Set(
    routes.filter((r) => r.active).flatMap((r) => r.barangays),
  ).size;
  const totalBarangays = barangays.length || 0;
  const isEditing = isCreating || selectedRouteId !== null;

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        <PageHeaderSkeleton />
        <KPIRowSkeleton count={3} />
        <RouteManagerSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      <RouteHeader
        totalRoutes={totalRoutes}
        activeRoutes={activeRoutes}
        coveredBarangays={coveredBarangays}
        totalBarangays={totalBarangays}
        onCreateNew={startCreate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <RouteList
          routesByDay={routesByDay}
          filteredRoutes={filteredRoutes}
          filterDay={filterDay}
          setFilterDay={setFilterDay}
          selectedRouteId={selectedRouteId}
          isCreating={isCreating}
          trucks={trucks}
          isLoadingTrucks={isLoadingTrucks}
          onSelectRoute={startEdit}
        />

        <div className="lg:col-span-3">
          {!isEditing ? (
            <RouteEmptyState onCreateNew={startCreate} />
          ) : (
            <RouteFormPanel
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
              onAddBarangay={addBarangay}
              onRemoveBarangay={removeBarangay}
              onMoveBarangay={moveBarangay}
              onSave={handleSave}
              onDuplicate={() => setDuplicateDialogOpen(true)}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              isDeletingRoute={selectedRoute ? deletingRouteId === selectedRoute.id : false}
              isTogglingRoute={selectedRoute ? togglingRouteId === selectedRoute.id : false}
            />
          )}
        </div>
      </div>

      <DuplicateDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        targetDay={duplicateTargetDay}
        setTargetDay={setDuplicateTargetDay}
        isSaving={isSaving}
        onDuplicate={handleDuplicate}
      />
    </div>
  );
};

export default AdminRouteManager;
