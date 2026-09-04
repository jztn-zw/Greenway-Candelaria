import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Plus,
  Truck,
  Loader2,
  Users,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  X,
  KeyRound,
  Copy,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { SegmentedControl, type SegmentedControlOption } from "@/components/common/SegmentedControl";
import { SearchInput } from "@/components/common/SearchInput";
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
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Driver, Truck as TruckType } from "./types";
import {
  PageHeaderSkeleton,
  DriverManagerSkeleton,
} from "@/components/PageLoadingSkeletons";
import {
  fetchDrivers,
  createDriver,
  updateDriver,
  updateDriverAccountStatus,
  deleteDriver as deleteDriverApi,
  fetchDriverActivity,
  fetchTrucks,
  createTruck,
  updateTruck,
  deleteTruck as deleteTruckApi,
} from "@/services/driverManagerService";
import {
  createTemporaryDriverPassword,
  mapDriverActivityRow,
  mapDriverRow,
  mapTruckRow,
  toAvailabilityStatus,
} from "./driverManager.utils";

import DriverCardGrid from "./components/DriverCardGrid";
import DriverDetailView from "./components/DriverDetailView";
import DriverEditorModal from "./components/DriverEditorModal";
import TruckCardGrid from "./components/TruckCardGrid";
import TruckDetailView from "./components/TruckDetailView";
import TruckEditorModal from "./components/TruckEditorModal";

type Tab = "drivers" | "trucks";

const AdminDrivers = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("drivers");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);

  const [driverSearch, setDriverSearch] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState("all");
  const [driverAssignmentFilter, setDriverAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [driverEditorOpen, setDriverEditorOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteDriverTarget, setDeleteDriverTarget] = useState<Driver | null>(null);
  const [resetPwResult, setResetPwResult] = useState<{ name: string; password: string } | null>(null);
  const [driverActivities, setDriverActivities] = useState<Record<string, Driver["activityLog"]>>({});
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [isSavingTruck, setIsSavingTruck] = useState(false);
  const [isDeletingDriver, setIsDeletingDriver] = useState(false);
  const [isDeletingTruck, setIsDeletingTruck] = useState(false);

  const [truckSearch, setTruckSearch] = useState("");
  const [truckStatusFilter, setTruckStatusFilter] = useState("all");
  const [truckDriverFilter, setTruckDriverFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [truckEditorOpen, setTruckEditorOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<TruckType | null>(null);
  const [deleteTruckTarget, setDeleteTruckTarget] = useState<TruckType | null>(null);

  const loadData = useCallback(async () => {
    const [driversResult, trucksResult] = await Promise.allSettled([
      fetchDrivers(),
      fetchTrucks(),
    ]);

    if (driversResult.status === "fulfilled") {
      setDrivers(driversResult.value.map(mapDriverRow));
    } else {
      toast.error("Failed to load drivers");
    }

    if (trucksResult.status === "fulfilled") {
      setTrucks(trucksResult.value.map(mapTruckRow));
    } else {
      toast.error("Failed to load trucks");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await loadData();
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;

    const loadActivity = async () => {
      if (!selectedDriverId) return;
      setIsActivityLoading(true);

      try {
        const rows = await fetchDriverActivity(selectedDriverId, 30);
        if (!cancelled) {
          setDriverActivities((prev) => ({
            ...prev,
            [selectedDriverId]: rows.map(mapDriverActivityRow),
          }));
        }
      } catch (err) {
        if (!cancelled) {
          toast.error("Failed to load driver activity", {
            description: err instanceof Error ? err.message : "Please try again.",
          });
          setDriverActivities((prev) => ({ ...prev, [selectedDriverId]: [] }));
        }
      } finally {
        if (!cancelled) setIsActivityLoading(false);
      }
    };

    void loadActivity();

    return () => {
      cancelled = true;
    };
  }, [selectedDriverId]);

  const selectedDriver = useMemo(() => {
    const base = drivers.find((d) => d.id === selectedDriverId) ?? null;
    if (!base) return null;
    return {
      ...base,
      activityLog: driverActivities[base.id] ?? [],
    };
  }, [drivers, selectedDriverId, driverActivities]);

  const selectedTruck = useMemo(
    () => trucks.find((t) => t.id === selectedTruckId) ?? null,
    [trucks, selectedTruckId],
  );

  // Executive KPI stats
  const totalCollectors = drivers.length;
  const activeCollectors = drivers.filter((d) => d.status === "Active").length;
  const deactivatedCollectors = drivers.filter(
    (d) => d.status === "Deactivated",
  ).length;

  const totalTrucks = trucks.length;
  const activeTrucks = trucks.filter((t) => t.status === "Active").length;
  const maintTrucks = trucks.filter(
    (t) => t.status === "Under Maintenance",
  ).length;
  const assignedTrucks = trucks.filter(
    (t) => t.assignedDriverId !== null,
  ).length;

  const driverStatusTabs: FilterPillItem[] = useMemo(
    () => [
      { id: "all", label: "All Collectors", count: totalCollectors },
      { id: "Active", label: "Active", count: activeCollectors },
      { id: "Deactivated", label: "Deactivated", count: deactivatedCollectors },
    ],
    [totalCollectors, activeCollectors, deactivatedCollectors]
  );

  const truckStatusTabs: FilterPillItem[] = useMemo(
    () => [
      { id: "all", label: "All Trucks", count: totalTrucks },
      { id: "Active", label: "Operational", count: activeTrucks },
      { id: "Under Maintenance", label: "Maintenance", count: maintTrucks },
    ],
    [totalTrucks, activeTrucks, maintTrucks]
  );

  const entityOptions: SegmentedControlOption<Tab>[] = useMemo(
    () => [
      { id: "drivers", label: "Collectors", icon: Users },
      { id: "trucks", label: "Fleet Trucks", icon: Truck },
    ],
    []
  );

  const hasActiveFilters =
    activeTab === "drivers"
      ? driverSearch.trim() !== "" ||
        driverStatusFilter !== "all" ||
        driverAssignmentFilter !== "all"
      : truckSearch.trim() !== "" ||
        truckStatusFilter !== "all" ||
        truckDriverFilter !== "all";

  const handleResetFilters = () => {
    if (activeTab === "drivers") {
      setDriverSearch("");
      setDriverStatusFilter("all");
      setDriverAssignmentFilter("all");
    } else {
      setTruckSearch("");
      setTruckStatusFilter("all");
      setTruckDriverFilter("all");
    }
  };

  const openDriverEditor = (driver?: Driver) => {
    setEditingDriver(driver || null);
    setDriverEditorOpen(true);
  };

  const openDriverEditorFromDetail = (driver: Driver) => {
    setSelectedDriverId(null);
    setEditingDriver(driver);
    setDriverEditorOpen(true);
  };

  const handleSaveDriver = async (data: {
    fullName: string;
    email?: string;
    username?: string;
    password?: string;
    contactNumber: string;
    licenseNumber: string;
    truckId: string | null;
  }) => {
    setIsSavingDriver(true);
    try {
      if (!editingDriver) {
        if (!data.email || !data.username || !data.password) {
          toast.error("Email, username, and password are required");
          return null;
        }

        await createDriver({
          full_name: data.fullName,
          username: data.username,
          email: data.email,
          phone: data.contactNumber,
          password: data.password,
          ...(data.truckId ? { truck_id: data.truckId } : {}),
        });

        await loadData();
        return { username: data.username, password: data.password };
      }

      await updateDriver(editingDriver.id, {
        full_name: data.fullName,
        phone: data.contactNumber,
        truck_id: data.truckId,
      });

      await loadData();
      toast.success("Driver updated");
      return {};
    } finally {
      setIsSavingDriver(false);
    }
  };

  const toggleDriverStatus = async (d: Driver) => {
    const nextStatus = d.status === "Active" ? "DEACTIVATED" : "ACTIVE";

    await updateDriverAccountStatus(d.userId, nextStatus);

    if (nextStatus === "DEACTIVATED") {
      await updateDriver(d.id, { truck_id: null });
    }

    await loadData();
    toast.success(
      `${d.fullName} ${nextStatus === "ACTIVE" ? "reactivated" : "deactivated"}`,
    );
  };

  const resetPassword = (d: Driver) => {
    const pw = createTemporaryDriverPassword();
    setResetPwResult({ name: d.fullName, password: pw });
  };

  const deleteDriver = async () => {
    if (!deleteDriverTarget) return;

    setIsDeletingDriver(true);
    try {
      await deleteDriverApi(deleteDriverTarget.id);
      await loadData();
      toast.success(`${deleteDriverTarget.fullName} deleted`);
      setDeleteDriverTarget(null);
      if (selectedDriverId === deleteDriverTarget.id) setSelectedDriverId(null);
    } finally {
      setIsDeletingDriver(false);
    }
  };

  const openTruckEditor = (truck?: TruckType) => {
    setEditingTruck(truck || null);
    setTruckEditorOpen(true);
  };

  const openTruckEditorFromDetail = (truck: TruckType) => {
    setSelectedTruckId(null);
    setEditingTruck(truck);
    setTruckEditorOpen(true);
  };

  const handleSaveTruck = async (data: {
    name: string;
    model: string;
    plateNumber: string;
    assignedDriverId: string | null;
    wasteType: string;
    status: string;
  }): Promise<boolean> => {
    setIsSavingTruck(true);
    try {
      if (!editingTruck) {
        await createTruck({
          name: data.name,
          plate_number: data.plateNumber,
          truck_model: data.model,
          availability_status: toAvailabilityStatus(data.status as TruckType["status"]),
        });

        await loadData();
        toast.success("Truck added");
        return true;
      }

      await updateTruck(editingTruck.id, {
        name: data.name,
        plate_number: data.plateNumber,
        truck_model: data.model,
        availability_status: toAvailabilityStatus(data.status as TruckType["status"]),
      });

      await loadData();
      toast.success("Truck updated");
      return true;
    } catch (err) {
      toast.error("Failed to save truck", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
      return false;
    } finally {
      setIsSavingTruck(false);
    }
  };

  const toggleTruckStatus = async (t: TruckType) => {
    const next = t.status === "Active" ? "UNDER_MAINTENANCE" : "ACTIVE";

    await updateTruck(t.id, { availability_status: next });
    await loadData();

    toast.success(
      `${t.name} marked as ${next === "ACTIVE" ? "Active" : "Under Maintenance"}`,
    );
  };

  const deleteTruck = async () => {
    if (!deleteTruckTarget) return;

    setIsDeletingTruck(true);
    try {
      await deleteTruckApi(deleteTruckTarget.id);
      await loadData();
      toast.success(`${deleteTruckTarget.name} deleted`);
      setDeleteTruckTarget(null);
      if (selectedTruckId === deleteTruckTarget.id) setSelectedTruckId(null);
    } finally {
      setIsDeletingTruck(false);
    }
  };

  if (selectedDriver) {
    return (
      <DriverDetailView
        driver={selectedDriver}
        trucks={trucks}
        isActivityLoading={isActivityLoading}
        onBack={() => setSelectedDriverId(null)}
        onEdit={openDriverEditorFromDetail}
        onResetPassword={resetPassword}
        onToggleStatus={(driver) => {
          void toggleDriverStatus(driver).catch((err) => {
            toast.error("Failed to update driver status", {
              description: err instanceof Error ? err.message : "Please try again.",
            });
          });
        }}
      />
    );
  }

  if (selectedTruck) {
    return (
      <TruckDetailView
        truck={selectedTruck}
        drivers={drivers}
        onBack={() => setSelectedTruckId(null)}
        onEdit={openTruckEditorFromDetail}
        onToggleStatus={(truck) => {
          void toggleTruckStatus(truck).catch((err) => {
            toast.error("Failed to update truck status", {
              description: err instanceof Error ? err.message : "Please try again.",
            });
          });
        }}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        <PageHeaderSkeleton />
        <DriverManagerSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-7 pb-10">
      {/* ── Executive Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
              Collector Manager
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage municipal waste collector personnel, truck assignments, and fleet statuses.
            </p>
          </div>
        </div>

        <Button
          onClick={() =>
            activeTab === "drivers" ? openDriverEditor() : openTruckEditor()
          }
          className="h-10 px-4 rounded-xl font-semibold shadow-xs gap-2 cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          {activeTab === "drivers" ? "Add Collector" : "Add Truck"}
        </Button>
      </div>

      {/* ── Executive Metric KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Collectors */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Collectors
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            {totalCollectors}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {activeCollectors} Active
            </span>
            <span>·</span>
            <span>{deactivatedCollectors} Deactivated</span>
          </div>
        </div>

        {/* Active Personnel */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Active Personnel
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            {activeCollectors}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Ready for route dispatch
          </div>
        </div>

        {/* Fleet Trucks */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Fleet Trucks
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            {totalTrucks}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {activeTrucks} Operational
            </span>
            {maintTrucks > 0 && (
              <>
                <span>·</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {maintTrucks} Maintenance
                </span>
              </>
            )}
          </div>
        </div>

        {/* Assigned Fleet */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Assigned Fleet
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            {assignedTrucks}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {totalTrucks > 0
              ? `${Math.round((assignedTrucks / totalTrucks) * 100)}% vehicles paired`
              : "No vehicles in fleet"}
          </div>
        </div>
      </div>

      {/* ── Standardized 2-Tier Filter Card Container ── */}
      <section className="rounded-2xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden">
        {/* Tier 1: Primary Status Filter Tabs + Entity View Switcher */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 sm:p-5">
          {activeTab === "drivers" ? (
            <FilterPillTabs
              items={driverStatusTabs}
              activeId={driverStatusFilter}
              onChange={setDriverStatusFilter}
            />
          ) : (
            <FilterPillTabs
              items={truckStatusTabs}
              activeId={truckStatusFilter}
              onChange={setTruckStatusFilter}
            />
          )}

          <SegmentedControl<Tab>
            options={entityOptions}
            value={activeTab}
            onChange={(tab) => setActiveTab(tab)}
            ariaLabel="Personnel & fleet entity switcher"
            className="self-start sm:self-auto shrink-0"
          />
        </div>

        {/* Tier 2: Search Input + Assignment Filter Dropdown + Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
            {activeTab === "drivers" ? (
              <SearchInput
                value={driverSearch}
                onChange={setDriverSearch}
                placeholder="Search collector name, username, phone..."
                containerClassName="w-full sm:max-w-xs md:max-w-sm"
              />
            ) : (
              <SearchInput
                value={truckSearch}
                onChange={setTruckSearch}
                placeholder="Search truck name, model, plate..."
                containerClassName="w-full sm:max-w-xs md:max-w-sm"
              />
            )}

            {activeTab === "drivers" ? (
              <Select
                value={driverAssignmentFilter}
                onValueChange={(val: "all" | "assigned" | "unassigned") =>
                  setDriverAssignmentFilter(val)
                }
              >
                <SelectTrigger className="w-40 h-9 text-xs rounded-xl bg-card border-border/80 shrink-0">
                  <SelectValue placeholder="All Personnel" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs">All Personnel</SelectItem>
                  <SelectItem value="assigned" className="text-xs">With Truck</SelectItem>
                  <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={truckDriverFilter}
                onValueChange={(val: "all" | "assigned" | "unassigned") =>
                  setTruckDriverFilter(val)
                }
              >
                <SelectTrigger className="w-40 h-9 text-xs rounded-xl bg-card border-border/80 shrink-0">
                  <SelectValue placeholder="All Vehicles" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs">All Vehicles</SelectItem>
                  <SelectItem value="assigned" className="text-xs">Paired with Driver</SelectItem>
                  <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            )}
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

      {/* ── Main Content Grid ── */}
      {activeTab === "drivers" ? (
        <DriverCardGrid
          drivers={drivers}
          trucks={trucks}
          search={driverSearch}
          statusFilter={driverStatusFilter}
          assignmentFilter={driverAssignmentFilter}
          onView={(driver) => setSelectedDriverId(driver.id)}
          onEdit={openDriverEditor}
          onResetPassword={resetPassword}
          onToggleStatus={(driver) => {
            void toggleDriverStatus(driver).catch((err) => {
              toast.error("Failed to update driver status", {
                description: err instanceof Error ? err.message : "Please try again.",
              });
            });
          }}
          onDelete={setDeleteDriverTarget}
        />
      ) : (
        <TruckCardGrid
          trucks={trucks}
          drivers={drivers}
          search={truckSearch}
          statusFilter={truckStatusFilter}
          driverFilter={truckDriverFilter}
          onView={(truck) => setSelectedTruckId(truck.id)}
          onEdit={openTruckEditor}
          onToggleStatus={(truck) => {
            void toggleTruckStatus(truck).catch((err) => {
              toast.error("Failed to update truck status", {
                description: err instanceof Error ? err.message : "Please try again.",
              });
            });
          }}
          onDelete={setDeleteTruckTarget}
        />
      )}

      <DriverEditorModal
        open={driverEditorOpen}
        onOpenChange={setDriverEditorOpen}
        editingDriver={editingDriver}
        trucks={trucks}
        drivers={drivers}
        isSaving={isSavingDriver}
        onSave={async (data) => {
          try {
            return await handleSaveDriver(data);
          } catch (err) {
            toast.error("Failed to save driver", {
              description: err instanceof Error ? err.message : "Please try again.",
            });
            return null;
          }
        }}
      />

      <TruckEditorModal
        open={truckEditorOpen}
        onOpenChange={setTruckEditorOpen}
        editingTruck={editingTruck}
        trucks={trucks}
        drivers={drivers}
        isSaving={isSavingTruck}
        onSave={handleSaveTruck}
      />

      {/* ── Delete Collector Confirmation Modal ── */}
      <Dialog
        open={!!deleteDriverTarget}
        onOpenChange={(open) => !open && setDeleteDriverTarget(null)}
      >
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[92vw] sm:max-w-md p-5 sm:p-6 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight truncate">
                Delete Collector Account?
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => setDeleteDriverTarget(null)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <div className="py-2.5">
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground font-semibold">
                {deleteDriverTarget?.fullName}
              </strong>
              &apos;s collector account (@{deleteDriverTarget?.username})? Any
              assigned truck will be unlinked. This action cannot be undone.
            </DialogDescription>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end pt-3.5 border-t border-border/60">
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingDriver}
              onClick={() => {
                void deleteDriver().catch((err) => {
                  toast.error("Failed to delete driver", {
                    description:
                      err instanceof Error ? err.message : "Please try again.",
                  });
                });
              }}
              className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs gap-1.5"
            >
              {isDeletingDriver ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {isDeletingDriver ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Truck Confirmation Modal ── */}
      <Dialog
        open={!!deleteTruckTarget}
        onOpenChange={(open) => !open && setDeleteTruckTarget(null)}
      >
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[92vw] sm:max-w-md p-5 sm:p-6 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight truncate">
                Delete Truck Record?
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => setDeleteTruckTarget(null)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <div className="py-2.5">
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground font-semibold">
                {deleteTruckTarget?.name}
              </strong>{" "}
              ({deleteTruckTarget?.plateNumber}) from the municipal fleet? This
              action cannot be undone.
            </DialogDescription>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end pt-3.5 border-t border-border/60">
            <Button
              type="button"
              variant="destructive"
              disabled={isDeletingTruck}
              onClick={() => {
                void deleteTruck().catch((err) => {
                  toast.error("Failed to delete truck", {
                    description:
                      err instanceof Error ? err.message : "Please try again.",
                  });
                });
              }}
              className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs gap-1.5"
            >
              {isDeletingTruck ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {isDeletingTruck ? "Deleting..." : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Password Reset Success Modal ── */}
      <Dialog
        open={!!resetPwResult}
        onOpenChange={() => setResetPwResult(null)}
      >
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-[92vw] sm:max-w-md p-5 sm:p-6 rounded-2xl border border-border/80 shadow-2xl bg-background text-left [&>button:last-child]:hidden">
          <div className="flex items-center justify-between pb-3.5 border-b border-border/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                <KeyRound className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                Password Reset Successful
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => setResetPwResult(null)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 py-2">
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              A new temporary password has been generated for{" "}
              <strong className="text-foreground font-semibold">
                {resetPwResult?.name}
              </strong>
              .
            </DialogDescription>

            <div className="bg-muted/50 border border-border/70 rounded-xl p-4 font-mono text-center text-lg font-bold tracking-wider text-foreground select-all">
              {resetPwResult?.password}
            </div>

            <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
              Share this password with the collector securely. They will be
              required to change it upon their next login.
            </p>
          </div>

          <div className="flex items-center justify-end pt-3.5 border-t border-border/60">
            <Button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(resetPwResult?.password || "");
                toast.success("Password copied to clipboard");
              }}
              className="h-10 px-5 rounded-xl font-semibold text-xs cursor-pointer active:scale-95 shadow-xs gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" /> Copy Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDrivers;
