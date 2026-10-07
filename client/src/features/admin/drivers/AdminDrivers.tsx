import { AdminFilterDialog, AdminFilterField } from "@/components/admin/AdminFilterDialog";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { Users, UserCheck, Truck, Link2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/AdminKpiCards";

import { ConfirmationDialog } from "@/components/dialogs/ConfirmationDialog";
import PageErrorState from "@/components/feedback/PageErrorState";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { PageRetryContext } from "@/components/feedback/pageRetryContext";
import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { SearchInput } from "@/components/common/SearchInput";
import { SegmentedControl, type SegmentedControlOption } from "@/components/common/SegmentedControl";
import { CollectorManagerPageSkeleton, CollectorManagerProfileSkeleton } from "@/components/loading/PageLoadingSkeletons";
import { Button } from "@/components/ui/button";
import { adminCollectorManagerStyles as styles } from "@/components/common/communityContentStyles";

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
  const { data: drivers } = driversQuery;
  const { data: trucks } = trucksQuery;
  const isLoading = driversQuery.isLoading || trucksQuery.isLoading;
  const driversError = driversQuery.dataUpdatedAt === 0 ? driversQuery.error?.message ?? "" : "";
  const trucksError = trucksQuery.dataUpdatedAt === 0 ? trucksQuery.error?.message ?? "" : "";
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
      { id: "trucks", label: "Trucks", icon: Truck },
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
          isActivityRefreshing={activityQuery.isFetching}
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
  if (driversError && trucksError && !driverEditorOpen && !truckEditorOpen) return <PageErrorState kind="unavailable" description="We couldn't load collectors and trucks. Please try again." onRetry={() => void loadData()} retrying={driversQuery.isFetching || trucksQuery.isFetching} homeHref="/admin" />;

  return (
    <PageRetryContext.Provider value={true}>
    <div className={styles.page}>
      {/* ── Executive Page Header ── */}
      <ResidentPageHeader
        className="admin-module-header"
        title="Collector Manager"
        description="Manage municipal waste collector personnel, truck assignments, and truck statuses."
        actionsClassName="admin-module-header-actions"
        actions={<Button
          onClick={() =>
            activeTab === "drivers" ? openDriverEditor() : openTruckEditor()
          }
          className={styles.action}
        >
          <Plus className="w-4 h-4" />
          {activeTab === "drivers" ? "Add Collector" : "Add Truck"}
        </Button>}
      />

      {(driversQuery.error || trucksQuery.error) && <DataRefreshNotice primary message="Some collector or truck information couldn't load or refresh. Available information is still shown; previously loaded data may be outdated." onRetry={() => { if (driversQuery.error) void driversQuery.refetch(); if (trucksQuery.error) void trucksQuery.refetch(); }} retrying={driversQuery.isFetching || trucksQuery.isFetching} />}

      {/* ── Executive Metric KPI Strip ── */}
      <AdminKpiGrid>
        {[
          {
            icon: Users,
            title: "Total Collectors",
            value: driversError ? "—" : totalCollectors,
            subtext: driversError ? "Collector data unavailable" : `${activeCollectors} active · ${deactivatedCollectors} deactivated`,
            tone: "neutral" as const,
          },
          {
            icon: UserCheck,
            title: "Active Personnel",
            value: driversError ? "—" : activeCollectors,
            subtext: driversError ? "Collector data unavailable" : "Accounts marked active",
            tone: "success" as const,
          },
          {
            icon: Truck,
            title: "Trucks",
            value: trucksError ? "—" : totalTrucks,
            subtext: trucksError ? "Truck data unavailable" : `${activeTrucks} operational${maintTrucks > 0 ? ` · ${maintTrucks} maint.` : ""}`,
            tone: "neutral" as const,
          },
          {
            icon: Link2,
            title: "Assigned Trucks",
            value: trucksError ? "—" : assignedTrucks,
            subtext:
              trucksError ? "Truck data unavailable" : totalTrucks > 0
                ? `${Math.round((assignedTrucks / totalTrucks) * 100)}% vehicles paired`
                : "No trucks registered",
            tone: "info" as const,
          },
        ].map((kpi) => (
          <AdminKpiCard key={kpi.title} label={kpi.title} value={kpi.value}
            description={kpi.subtext} icon={kpi.icon} tone={kpi.tone} />
        ))}
      </AdminKpiGrid>

      {/* ── Standardized 2-Tier Filter Card Container ── */}
        <section className="admin-toolbar min-w-0 rounded-2xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden">
          {/* Tier 1: Primary Status Filter Tabs + Entity View Switcher */}
          <div className={`${styles.primary} admin-toolbar-primary`}>
            {activeTab === "drivers" ? (
              <FilterPillTabs
                items={driverStatusTabs}
                activeId={driverStatusFilter}
                onChange={setDriverStatusFilter}
                className={`${styles.filters} admin-toolbar-chips`}
              />
            ) : (
              <FilterPillTabs
                items={truckStatusTabs}
                activeId={truckStatusFilter}
                onChange={setTruckStatusFilter}
                className={`${styles.filters} admin-toolbar-chips`}
              />
            )}

            <div className="admin-toolbar-desktop-only">
              <SegmentedControl<Tab>
                options={entityOptions}
                value={activeTab}
                onChange={(tab) => setActiveTab(tab)}
                ariaLabel="Personnel & trucks entity switcher"
                className={styles.view}
              />
            </div>
          </div>

          {/* Tier 2: Search Input + Assignment Filter Dropdown + Reset */}
          <div className={`${styles.secondary} admin-toolbar-search-section`}>
            <div className={`${styles.fields} admin-toolbar-search-row`}>{activeTab === "drivers" ? (
              <SearchInput
                value={driverSearch}
                onChange={setDriverSearch}
                placeholder="Search by name, username, email, or phone…" compactPlaceholder="Name or phone…"
                containerClassName={styles.search}
              />
            ) : (
              <SearchInput
                value={truckSearch}
                onChange={setTruckSearch}
                placeholder="Search by truck name, model, or plate…" compactPlaceholder="Truck name or plate…"
                containerClassName={styles.search}
              />
            )}
              <div className="admin-toolbar-desktop-only">{activeTab === "drivers" ? (
                <Select
                  value={driverAssignmentFilter}
                  onValueChange={(val: "all" | "assigned" | "unassigned") =>
                    setDriverAssignmentFilter(val)
                  }
                >
                  <SelectTrigger className={cn(styles.assignment, "bg-background border-border/80")}>
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
                  <SelectTrigger className={cn(styles.assignment, "bg-background border-border/80")}>
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
              <AdminFilterDialog title={activeTab === "drivers" ? "Filter Collectors" : "Filter Trucks"} activeCount={Number((activeTab === "drivers" ? driverAssignmentFilter : truckDriverFilter) !== "all")}
                values={{ activeTab, driverAssignmentFilter, truckDriverFilter }}
                onApply={(next) => {
                  setDriverAssignmentFilter(next.driverAssignmentFilter);
                  setTruckDriverFilter(next.truckDriverFilter);
                  setActiveTab(next.activeTab);
                }}
                resetValues={{ activeTab, driverAssignmentFilter: "all", truckDriverFilter: "all" }}
              >
                {(draft, setDraft) => (
                  <>
                    <AdminFilterField label="Assignment">{draft.activeTab === "drivers" ? (
                      <Select
                        value={draft.driverAssignmentFilter}
                        onValueChange={(val: "all" | "assigned" | "unassigned") =>
                          setDraft({ ...draft, driverAssignmentFilter: val })
                        }
                      >
                        <SelectTrigger aria-label="Assignment" className="h-9 w-full rounded-xl text-xs">
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
                        value={draft.truckDriverFilter}
                        onValueChange={(val: "all" | "assigned" | "unassigned") =>
                          setDraft({ ...draft, truckDriverFilter: val })
                        }
                      >
                        <SelectTrigger aria-label="Assignment" className="h-9 w-full rounded-xl text-xs">
                          <SelectValue placeholder="All Vehicles" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all" className="text-xs">All Vehicles</SelectItem>
                          <SelectItem value="assigned" className="text-xs">Paired with Driver</SelectItem>
                          <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    </AdminFilterField>
                    <AdminFilterField label="View">
                      <SegmentedControl<Tab>
                        options={entityOptions}
                        value={draft.activeTab}
                        onChange={(tab) => setDraft({ ...draft, activeTab: tab })}
                        ariaLabel="Personnel & trucks entity switcher"
                        className={styles.view}
                      />
                    </AdminFilterField>
                  </>
                )}
              </AdminFilterDialog>
            </div>

            <div className="admin-toolbar-desktop-only">{hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className={styles.reset}
                title="Reset active filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
            </div>
          </div>
        </section>

      {/* ── Main Content Grid ── */}
      {activeTab === "drivers" && driversError ? (
        <PageErrorState kind="unavailable" variant="section" title="Collectors couldn't load" onRetry={() => void driversQuery.refetch()} retrying={driversQuery.isFetching} />
      ) : activeTab === "trucks" && trucksError ? (
        <PageErrorState kind="unavailable" variant="section" title="Trucks couldn't load" onRetry={() => void trucksQuery.refetch()} retrying={trucksQuery.isFetching} />
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
        description={<>Are you sure you want to permanently delete <strong className="font-semibold text-foreground">{deleteTruckTarget?.name}</strong> ({deleteTruckTarget?.plateNumber}) from the municipal truck list? This action cannot be undone.</>}
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
    </PageRetryContext.Provider>
  );
};

export default AdminDrivers;
