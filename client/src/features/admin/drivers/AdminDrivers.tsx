import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { SearchInput } from "@/components/common/SearchInput";
import { SegmentedControl, type SegmentedControlOption } from "@/components/common/SegmentedControl";
import { CollectorManagerPageSkeleton, CollectorManagerProfileSkeleton } from "@/components/PageLoadingSkeletons";
import { Button } from "@/components/ui/button";

import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import { useAdminMutation, useAdminQuery, useAdminResource } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
createDriver as apicreateDriver,
createTruck as apicreateTruck,
deleteDriver as apideleteDriverApi,
deleteTruck as apideleteTruckApi,
updateDriver as apiupdateDriver,
updateDriverAccountStatus as apiupdateDriverAccountStatus,
updateTruck as apiupdateTruck,
fetchDriverActivity,
fetchDrivers,
fetchTrucks,
} from "@/services/driverManagerService";
import { Plus, RotateCcw, Trash2, Truck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
mapDriverActivityRow,
mapDriverRow,
mapTruckRow,
toAvailabilityStatus,
} from "./driverManager.utils";
import type { Driver, Truck as TruckType } from "./types";

import DriverCardGrid from "./components/DriverCardGrid";
import DriverDetailView from "./components/DriverDetailView";
import DriverEditorModal from "./components/DriverEditorModal";
import ResetDriverPasswordDialog from "./components/ResetDriverPasswordDialog";
import TruckCardGrid from "./components/TruckCardGrid";
import TruckDetailView from "./components/TruckDetailView";
import TruckEditorModal from "./components/TruckEditorModal";

type Tab = "drivers" | "trucks";

const AdminDrivers = () => {
  const createDriver = useAdminMutation(apicreateDriver, "drivers", "trucks", "routes", "tracking");
  const updateDriver = useAdminMutation(apiupdateDriver, "drivers", "trucks", "routes", "tracking");
  const updateDriverAccountStatus = useAdminMutation(apiupdateDriverAccountStatus, "drivers", "trucks", "routes", "tracking");
  const deleteDriverApi = useAdminMutation(apideleteDriverApi, "drivers", "trucks", "routes", "tracking");
  const createTruck = useAdminMutation(apicreateTruck, "drivers", "trucks", "routes", "tracking");
  const updateTruck = useAdminMutation(apiupdateTruck, "drivers", "trucks", "routes", "tracking");
  const deleteTruckApi = useAdminMutation(apideleteTruckApi, "drivers", "trucks", "routes", "tracking");
  const [activeTab, setActiveTab] = useState<Tab>("drivers");

  const [driverSearch, setDriverSearch] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState("all");
  const [driverAssignmentFilter, setDriverAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDriverId = searchParams.get("collectorId");
  const [driverEditorOpen, setDriverEditorOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteDriverTarget, setDeleteDriverTarget] = useState<Driver | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<Driver | null>(null);
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [isSavingTruck, setIsSavingTruck] = useState(false);
  const [isDeletingDriver, setIsDeletingDriver] = useState(false);
  const [isDeletingTruck, setIsDeletingTruck] = useState(false);

  const [truckSearch, setTruckSearch] = useState("");
  const [truckStatusFilter, setTruckStatusFilter] = useState("all");
  const [truckDriverFilter, setTruckDriverFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const selectedTruckId = searchParams.get("truckId");
  const [truckEditorOpen, setTruckEditorOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<TruckType | null>(null);
  const [deleteTruckTarget, setDeleteTruckTarget] = useState<TruckType | null>(null);

  const driversQuery = useAdminResource<Driver[]>("drivers", ["manager"], async () => (await fetchDrivers()).map(mapDriverRow), []);
  const trucksQuery = useAdminResource<TruckType[]>("trucks", ["manager"], async () => (await fetchTrucks()).map(mapTruckRow), []);
  const { data: drivers, setData: setDrivers } = driversQuery;
  const { data: trucks, setData: setTrucks } = trucksQuery;
  const isLoading = driversQuery.isLoading || trucksQuery.isLoading;
  const driversError = driversQuery.error?.message ?? "";
  const trucksError = trucksQuery.error?.message ?? "";
  const loadData = () => Promise.all([driversQuery.refetch(), trucksQuery.refetch()]);
  const activityQuery = useAdminQuery("drivers", ["activity", selectedDriverId], async () =>
    (await fetchDriverActivity(selectedDriverId!, 30)).map(mapDriverActivityRow), { enabled: !!selectedDriverId });
  const isActivityLoading = activityQuery.isLoading;
  const activityError = activityQuery.error?.message ?? "";
  const driverActivities = useMemo(() => ({ [selectedDriverId ?? ""]: activityQuery.data ?? [] }), [selectedDriverId, activityQuery.data]);
  useEffect(() => { if (selectedTruckId) setActiveTab("trucks"); }, [selectedTruckId]);

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

  const openTruckProfile = (truck: TruckType) => {
    setActiveTab("trucks");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("collectorId");
      next.delete("collectorName");
      next.set("truckId", truck.id);
      next.set("truckName", truck.name);
      return next;
    });
  };

  const closeTruckProfile = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("truckId");
      next.delete("truckName");
      return next;
    });
  };

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
      { id: "all", label: "All Collectors", count: driversError ? undefined : totalCollectors },
      { id: "Active", label: "Active", count: driversError ? undefined : activeCollectors },
      { id: "Deactivated", label: "Deactivated", count: driversError ? undefined : deactivatedCollectors },
    ],
    [totalCollectors, activeCollectors, deactivatedCollectors, driversError]
  );

  const truckStatusTabs: FilterPillItem[] = useMemo(
    () => [
      { id: "all", label: "All Trucks", count: trucksError ? undefined : totalTrucks },
      { id: "Active", label: "Operational", count: trucksError ? undefined : activeTrucks },
      { id: "Under Maintenance", label: "Maintenance", count: trucksError ? undefined : maintTrucks },
    ],
    [totalTrucks, activeTrucks, maintTrucks, trucksError]
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
    setEditingDriver(driver);
    setDriverEditorOpen(true);
  };

  const openDriverProfile = (driver: Driver) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("collectorId", driver.id);
      next.set("collectorName", driver.fullName);
      return next;
    });
  };

  const closeDriverProfile = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("collectorId");
      next.delete("collectorName");
      return next;
    });
  };

  const handleSaveDriver = async (data: {
    fullName: string;
    email?: string;
    username?: string;
    password?: string;
    contactNumber: string;
    truckId: string | null;
  }) => {
    setIsSavingDriver(true);
    try {
      if (!editingDriver) {
        if (!data.email || !data.username || !data.password) {
          throw new Error("Email, username, and password are required.");
        }

        await createDriver({
          full_name: data.fullName,
          username: data.username,
          email: data.email,
          phone: data.contactNumber,
          password: data.password,
          ...(data.truckId ? { truck_id: data.truckId } : {}),
        });

          return { username: data.username, password: data.password };
      }

      await updateDriver(editingDriver.id, {
        full_name: data.fullName,
        phone: data.contactNumber,
        truck_id: data.truckId,
      });

      if (selectedDriverId === editingDriver.id) {
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.set("collectorName", data.fullName);
          return next;
        });
      }
      toast.success("Driver updated");
      return {};
    } finally {
      setIsSavingDriver(false);
    }
  };

  const toggleDriverStatus = async (d: Driver) => {
    const nextStatus = d.status === "Active" ? "DEACTIVATED" : "ACTIVE";

    await updateDriverAccountStatus(d.id, nextStatus);

    toast.success(
      `${d.fullName} ${nextStatus === "ACTIVE" ? "reactivated" : "deactivated"}`,
    );
  };

  const deleteDriver = async () => {
    if (!deleteDriverTarget) return;

    setIsDeletingDriver(true);
    try {
      await deleteDriverApi(deleteDriverTarget.id);
      toast.success(`${deleteDriverTarget.fullName} removed from the manager`);
      setDeleteDriverTarget(null);
      if (selectedDriverId === deleteDriverTarget.id) closeDriverProfile();
    } finally {
      setIsDeletingDriver(false);
    }
  };

  const openTruckEditor = (truck?: TruckType) => {
    setEditingTruck(truck || null);
    setTruckEditorOpen(true);
  };

  const openTruckEditorFromDetail = (truck: TruckType) => {
    closeTruckProfile();
    setEditingTruck(truck);
    setTruckEditorOpen(true);
  };

  const handleSaveTruck = async (data: {
    name: string;
    model: string;
    plateNumber: string;
    status: string;
  }): Promise<void> => {
    setIsSavingTruck(true);
    try {
      if (!editingTruck) {
        await createTruck({
          name: data.name,
          plate_number: data.plateNumber,
          truck_model: data.model,
          availability_status: toAvailabilityStatus(data.status as TruckType["status"]),
        });

          toast.success("Truck added");
        return;
      }

      await updateTruck(editingTruck.id, {
        name: data.name,
        plate_number: data.plateNumber,
        truck_model: data.model,
        availability_status: toAvailabilityStatus(data.status as TruckType["status"]),
      });

      if (selectedTruckId === editingTruck.id) {
        setSearchParams((current) => {
          const next = new URLSearchParams(current);
          next.set("truckName", data.name);
          return next;
        });
      }
      toast.success("Truck updated");
      return;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to save truck. Please try again.");
    } finally {
      setIsSavingTruck(false);
    }
  };

  const toggleTruckStatus = async (t: TruckType) => {
    const next = t.status === "Active" ? "UNDER_MAINTENANCE" : "ACTIVE";

    await updateTruck(t.id, { availability_status: next });

    toast.success(
      `${t.name} marked as ${next === "ACTIVE" ? "Active" : "Under Maintenance"}`,
    );
  };

  const deleteTruck = async () => {
    if (!deleteTruckTarget) return;

    setIsDeletingTruck(true);
    try {
      await deleteTruckApi(deleteTruckTarget.id);
      toast.success(`${deleteTruckTarget.name} deleted`);
      setDeleteTruckTarget(null);
      if (selectedTruckId === deleteTruckTarget.id) closeTruckProfile();
    } finally {
      setIsDeletingTruck(false);
    }
  };

  if (isLoading && (selectedDriverId || selectedTruckId)) {
    return <CollectorManagerProfileSkeleton kind={selectedTruckId ? "truck" : "collector"} />;
  }

  if (selectedDriver) {
    return (
      <>
        <DriverDetailView
          driver={selectedDriver}
          trucks={trucks}
          isActivityLoading={isActivityLoading}
          activityError={activityError}
          onRetryActivity={() => activityQuery.refetch()}
          onEdit={openDriverEditorFromDetail}
          onResetPassword={setResetPasswordTarget}
          onToggleStatus={(driver) => {
            void toggleDriverStatus(driver).catch((err) => {
              toast.error("Failed to update driver status", {
                description: err instanceof Error ? err.message : "Please try again.",
              });
            });
          }}
        />
        <DriverEditorModal
          open={driverEditorOpen}
          onOpenChange={setDriverEditorOpen}
          editingDriver={editingDriver}
          trucks={trucks}
          drivers={drivers}
          isSaving={isSavingDriver}
          onSave={handleSaveDriver}
        />
        {resetPasswordTarget ? (
          <ResetDriverPasswordDialog
            key={resetPasswordTarget.id}
            driver={resetPasswordTarget}
            onClose={() => setResetPasswordTarget(null)}
          />
        ) : null}
      </>
    );
  }

  if (selectedTruck) {
    return (
      <TruckDetailView
        truck={selectedTruck}
        drivers={drivers}
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
    return <CollectorManagerPageSkeleton activeTab={activeTab} />;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-7 pb-10">
      {/* ── Executive Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="gw-page-title sm:text-ui-page-lg text-foreground tracking-tight">
            Collector Manager
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage municipal waste collector personnel, truck assignments, and fleet statuses.
          </p>
        </div>

        <Button
          onClick={() =>
            activeTab === "drivers" ? openDriverEditor() : openTruckEditor()
          }
          className="h-10 px-4 rounded-xl font-semibold shadow-xs gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          {activeTab === "drivers" ? "Add Collector" : "Add Truck"}
        </Button>
      </div>

      {/* ── Executive Metric KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        {[
          {
            title: "Total Collectors",
            value: driversError ? "—" : totalCollectors,
            subtext: driversError ? "Collector data unavailable" : `${activeCollectors} active · ${deactivatedCollectors} deactivated`,
            tag: "bg-muted/70 text-muted-foreground border-border/80",
          },
          {
            title: "Active Personnel",
            value: driversError ? "—" : activeCollectors,
            subtext: driversError ? "Collector data unavailable" : "Accounts marked active",
            tag: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          },
          {
            title: "Fleet Trucks",
            value: trucksError ? "—" : totalTrucks,
            subtext: trucksError ? "Fleet data unavailable" : `${activeTrucks} operational${maintTrucks > 0 ? ` · ${maintTrucks} maint.` : ""}`,
            tag: "bg-muted/70 text-muted-foreground border-border/80",
          },
          {
            title: "Assigned Fleet",
            value: trucksError ? "—" : assignedTrucks,
            subtext:
              trucksError ? "Fleet data unavailable" : totalTrucks > 0
                ? `${Math.round((assignedTrucks / totalTrucks) * 100)}% vehicles paired`
                : "No vehicles in fleet",
            tag: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
          },
        ].map((kpi, idx) => (
          <div
            key={kpi.title}
            className={cn(
              "p-4 sm:p-5 flex flex-col justify-between space-y-2.5 transition-colors hover:bg-muted/15",
              idx % 2 === 0 ? "border-r border-border/70" : "",
              idx < 3 ? "lg:border-r lg:border-border/70" : "lg:border-r-0",
              idx < 2 ? "border-b lg:border-b-0 border-border/70" : ""
            )}
          >
            <div className="flex items-center min-h-[22px]">
              <span
                className={cn(
                  "text-ui-overline font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                  kpi.tag
                )}
              >
                {kpi.title}
              </span>
            </div>

            <div className="gw-stat-value text-2xl sm:text-3xl text-foreground tracking-tight tabular-nums">
              {kpi.value}
            </div>

            <div className="text-ui-caption text-muted-foreground font-medium truncate">
              {kpi.subtext}
            </div>
          </div>
        ))}
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
                <SelectTrigger className="w-40 h-9 text-xs rounded-xl bg-background border-border/80 shrink-0">
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
                <SelectTrigger className="w-40 h-9 text-xs rounded-xl bg-background border-border/80 shrink-0">
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
              className="h-9 px-2.5 text-xs rounded-xl shrink-0 gap-1.5 cursor-pointer transition-all"
              title="Reset active filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </section>

      {/* ── Main Content Grid ── */}
      {activeTab === "drivers" && driversError ? (
        <div className="rounded-2xl border border-border/80 bg-card p-10 text-center text-sm">
          <p role="alert" className="text-destructive">Could not load collectors. {driversError}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void loadData()}>Retry</Button>
        </div>
      ) : activeTab === "trucks" && trucksError ? (
        <div className="rounded-2xl border border-border/80 bg-card p-10 text-center text-sm">
          <p role="alert" className="text-destructive">Could not load trucks. {trucksError}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void loadData()}>Retry</Button>
        </div>
      ) : activeTab === "drivers" ? (
        <DriverCardGrid
          drivers={drivers}
          trucks={trucks}
          search={driverSearch}
          statusFilter={driverStatusFilter}
          assignmentFilter={driverAssignmentFilter}
          onView={openDriverProfile}
          onEdit={openDriverEditor}
          onResetPassword={setResetPasswordTarget}
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
          onView={openTruckProfile}
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
        onSave={handleSaveDriver}
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
      <ConfirmationDialog
        kind="dialog"
        open={!!deleteDriverTarget}
        onOpenChange={(open) => !open && setDeleteDriverTarget(null)}
        title="Remove Collector Account?"
        icon={<Trash2 />}
        variant="destructive"
        description={<>Remove <strong className="font-semibold text-foreground">{deleteDriverTarget?.fullName}</strong>&apos;s collector account (@{deleteDriverTarget?.username}) from the manager? Sign-in access will end and the truck will be unlinked. Saved route history remains.</>}
        confirmLabel="Remove Account"
        isPending={isDeletingDriver}
        pendingLabel="Removing..."
        onConfirm={() => {
          void deleteDriver().catch((err) => {
            toast.error("Failed to delete driver", { description: err instanceof Error ? err.message : "Please try again." });
          });
        }}
      />

      {/* ── Delete Truck Confirmation Modal ── */}
      <ConfirmationDialog
        kind="dialog"
        open={!!deleteTruckTarget}
        onOpenChange={(open) => !open && setDeleteTruckTarget(null)}
        title="Delete Truck Record?"
        icon={<Trash2 />}
        variant="destructive"
        description={<>Are you sure you want to permanently delete <strong className="font-semibold text-foreground">{deleteTruckTarget?.name}</strong> ({deleteTruckTarget?.plateNumber}) from the municipal fleet? This action cannot be undone.</>}
        confirmLabel="Delete Permanently"
        isPending={isDeletingTruck}
        pendingLabel="Deleting..."
        onConfirm={() => {
          void deleteTruck().catch((err) => {
            toast.error("Failed to delete truck", { description: err instanceof Error ? err.message : "Please try again." });
          });
        }}
      />

      {resetPasswordTarget ? (
        <ResetDriverPasswordDialog
          key={resetPasswordTarget.id}
          driver={resetPasswordTarget}
          onClose={() => setResetPasswordTarget(null)}
        />
      ) : null}
    </div>
  );
};

export default AdminDrivers;
