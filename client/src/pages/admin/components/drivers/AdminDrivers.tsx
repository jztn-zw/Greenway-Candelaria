import { useMemo, useState, useEffect, useCallback } from "react";
import { Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  type DriverActivityApiRow,
  type DriverApiRow,
  type TruckApiRow,
} from "@/services/driverManagerService";

import DriverCardGrid from "./components/DriverCardGrid";
import DriverDetailView from "./components/DriverDetailView";
import DriverEditorModal from "./components/DriverEditorModal";
import TruckCardGrid from "./components/TruckCardGrid";
import TruckDetailView from "./components/TruckDetailView";
import TruckEditorModal from "./components/TruckEditorModal";

type Tab = "drivers" | "trucks";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  let parsed: Date;
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/,
  );

  if (match) {
    const [, y, mo, d, h, mi, s, ms = "0"] = match;
    // Sessions are stored server-side; treat timezone-less MySQL datetime as UTC.
    parsed = new Date(
      Date.UTC(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s),
        Number(ms.padEnd(3, "0")),
      ),
    );
  } else {
    parsed = new Date(value);
  }

  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const toDriverStatus = (raw?: string): Driver["status"] =>
  String(raw || "").toUpperCase() === "ACTIVE" ? "Active" : "Deactivated";

const toTruckStatus = (raw?: string): TruckType["status"] =>
  String(raw || "").toUpperCase() === "ACTIVE"
    ? "Active"
    : "Under Maintenance";

const toAvailabilityStatus = (
  status: TruckType["status"],
): "ACTIVE" | "UNDER_MAINTENANCE" =>
  status === "Active" ? "ACTIVE" : "UNDER_MAINTENANCE";

const buildTempPassword = () =>
  `GW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const mapTruck = (row: TruckApiRow): TruckType => ({
  id: row.id,
  name: row.name,
  model: row.truck_model ?? "Unknown Model",
  plateNumber: row.plate_number,
  assignedDriverId: row.driver_id ?? null,
  wasteType: row.waste_type ?? "Not assigned",
  status: toTruckStatus(row.availability_status ?? "ACTIVE"),
  liveStatus: (row.status as TruckType["liveStatus"]) ?? "OFFLINE",
  dateAdded: formatDate(row.created_at),
});

const mapDriver = (row: DriverApiRow): Driver => ({
  id: row.id,
  userId: row.user_id,
  fullName: row.full_name,
  username: row.username,
  email: row.email,
  contactNumber: row.phone ?? "-",
  licenseNumber: "-",
  truckId: row.truck_id ?? null,
  status: toDriverStatus(row.account_status),
  lastLogin: formatDateTime(row.last_login),
  dateAdded: formatDate(row.created_at),
  activityLog: [],
});

const mapDriverActivity = (row: DriverActivityApiRow): Driver["activityLog"][number] => ({
  date: row.date,
  route: row.route,
  barangaysCompleted: row.barangays_completed,
  barangaysTotal: row.barangays_total,
  startTime: row.start_time,
  endTime: row.end_time,
  statusMessages: row.status_messages ?? [],
});

const AdminDrivers = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("drivers");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);

  const [driverSearch, setDriverSearch] = useState("");
  const [driverStatusFilter, setDriverStatusFilter] = useState("all");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [driverEditorOpen, setDriverEditorOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteDriverTarget, setDeleteDriverTarget] = useState<Driver | null>(null);
  const [resetPwResult, setResetPwResult] = useState<{ name: string; password: string } | null>(null);
  const [driverActivities, setDriverActivities] = useState<Record<string, Driver["activityLog"]>>({});
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  const [truckSearch, setTruckSearch] = useState("");
  const [truckStatusFilter, setTruckStatusFilter] = useState("all");
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
      setDrivers(driversResult.value.map(mapDriver));
    } else {
      toast.error("Failed to load drivers");
    }

    if (trucksResult.status === "fulfilled") {
      setTrucks(trucksResult.value.map(mapTruck));
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
            [selectedDriverId]: rows.map(mapDriverActivity),
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
    if (!editingDriver) {
      if (!data.email || !data.username || !data.password) {
        toast.error("Email, username, and password are required");
        return;
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
    const pw = buildTempPassword();
    setResetPwResult({ name: d.fullName, password: pw });
  };

  const deleteDriver = async () => {
    if (!deleteDriverTarget) return;

    await deleteDriverApi(deleteDriverTarget.id);
    await loadData();
    toast.success(`${deleteDriverTarget.fullName} deleted`);
    setDeleteDriverTarget(null);
    if (selectedDriverId === deleteDriverTarget.id) setSelectedDriverId(null);
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
  }) => {
    if (!editingTruck) {
      await createTruck({
        name: data.name,
        plate_number: data.plateNumber,
        truck_model: data.model,
        availability_status: toAvailabilityStatus(data.status as TruckType["status"]),
      });

      await loadData();
      toast.success("Truck added");
      return;
    }

    await updateTruck(editingTruck.id, {
      name: data.name,
      plate_number: data.plateNumber,
      truck_model: data.model,
      availability_status: toAvailabilityStatus(data.status as TruckType["status"]),
    });

    await loadData();
    toast.success("Truck updated");
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

    await deleteTruckApi(deleteTruckTarget.id);
    await loadData();
    toast.success(`${deleteTruckTarget.name} deleted`);
    setDeleteTruckTarget(null);
    if (selectedTruckId === deleteTruckTarget.id) setSelectedTruckId(null);
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
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Collector Manager</h1>
            <p className="text-sm text-muted-foreground">Manage collector accounts and truck records.</p>
          </div>
        </div>
        <Button onClick={() => (activeTab === "drivers" ? openDriverEditor() : openTruckEditor())} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> {activeTab === "drivers" ? "Add Collector" : "Add Truck"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="drivers">Collectors</TabsTrigger>
          <TabsTrigger value="trucks">Trucks</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === "drivers" ? (
        <DriverCardGrid
          drivers={drivers}
          trucks={trucks}
          search={driverSearch}
          onSearch={setDriverSearch}
          statusFilter={driverStatusFilter}
          onStatusFilter={setDriverStatusFilter}
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
          onSearch={setTruckSearch}
          statusFilter={truckStatusFilter}
          onStatusFilter={setTruckStatusFilter}
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
        onSave={(data) => {
          void handleSaveTruck(data).catch((err) => {
            toast.error("Failed to save truck", {
              description: err instanceof Error ? err.message : "Please try again.",
            });
          });
        }}
      />

      <AlertDialog open={!!deleteDriverTarget} onOpenChange={() => setDeleteDriverTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collector Account</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteDriverTarget?.fullName}</strong>'s collector account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void deleteDriver().catch((err) => {
                  toast.error("Failed to delete driver", {
                    description: err instanceof Error ? err.message : "Please try again.",
                  });
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTruckTarget} onOpenChange={() => setDeleteTruckTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Truck</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTruckTarget?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void deleteTruck().catch((err) => {
                  toast.error("Failed to delete truck", {
                    description: err instanceof Error ? err.message : "Please try again.",
                  });
                });
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!resetPwResult} onOpenChange={() => setResetPwResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">A new temporary password has been generated for <strong>{resetPwResult?.name}</strong>.</p>
            <div className="bg-muted rounded-lg p-4 font-mono text-center text-lg font-bold tracking-wider">{resetPwResult?.password}</div>
            <p className="text-xs text-muted-foreground">Share this password with the driver directly. They will be required to change it on first login.</p>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              navigator.clipboard.writeText(resetPwResult?.password || "");
              toast.success("Copied to clipboard");
            }}>
              Copy Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDrivers;
