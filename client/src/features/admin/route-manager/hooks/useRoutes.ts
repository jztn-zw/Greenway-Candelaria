import { useAdminMutation, useAdminResource } from "@/lib/adminQuery";
// src/pages/admin/hooks/useRoutes.ts
import { toast } from "@/lib/toast";
import {
createRoute as apicreateRoute,
deleteRoute as apideleteRoute,
ApiRoute,
updateRoute as apiupdateRoute,
fetchRoutes,
} from "@/services/routesService";
import { useCallback, useEffect, useState } from "react";
import { WASTE_MAP } from "../constants";

// ─── Frontend shape (what the component works with) ───────────────────────────

export type Day =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface RouteStop {
  id: string;
  barangayId: string;
  barangayName: string;
  streetId: string | null;
  stopName: string;
  coveragePath: [number, number][] | null;
  zone: string;
  stopOrder: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "MISSED";
}

export interface RouteData {
  id: string;
  day: Day;
  truckId: string;
  truckName: string;
  truckPlate: string;
  driverId: string | null;
  driverName: string;
  startTime: string;
  stops: RouteStop[];
  barangays: string[]; // ordered barangay names for display
  active: boolean;
  status: ApiRoute["status"];
}

// ─── Form shape (what the editor works with) ──────────────────────────────────

export interface RouteForm {
  day: Day;
  truckId: string;
  driverId: string;
  startTime: string;
  selectedBarangayId: string;
  barangays: {
    id: string;
    name: string;
    barangayId: string;
    latitude?: number | null;
    longitude?: number | null;
    coveragePath?: [number, number][] | null;
  }[];
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

const DAY_MAP: Record<string, Day> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

const DAY_REVERSE: Record<Day, string> = {
  Monday: "MONDAY",
  Tuesday: "TUESDAY",
  Wednesday: "WEDNESDAY",
  Thursday: "THURSDAY",
  Friday: "FRIDAY",
  Saturday: "SATURDAY",
  Sunday: "SUNDAY",
};

const normalizeCoveragePath = (
  value: [number, number][] | string | null | undefined,
): [number, number][] | null => {
  if (!value) return null;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return null;

    const points = parsed.flatMap((point): [number, number][] => {
      if (!Array.isArray(point) || point.length < 2) return [];
      const latitude = Number(point[0]);
      const longitude = Number(point[1]);
      return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? [[latitude, longitude]]
        : [];
    });

    return points.length >= 2 ? points : null;
  } catch {
    return null;
  }
};

const mapRoute = (raw: ApiRoute): RouteData => {
  const sortedStops = [...raw.stops].sort(
    (a, b) => a.stop_order - b.stop_order,
  );
  return {
    id: raw.id,
    day: DAY_MAP[raw.day_of_week] ?? "Monday",
    truckId: raw.truck_id,
    truckName: raw.truck_name,
    truckPlate: raw.truck_plate,
    driverId: raw.driver_id,
    driverName: raw.driver_name ?? "Unassigned",
    startTime: raw.start_time.slice(0, 5), // "06:00:00" → "06:00"
    stops: sortedStops.map((s) => ({
      id: s.id,
      barangayId: s.barangay_id,
      barangayName: s.barangay_name,
      streetId: s.street_id ?? null,
      stopName: s.stop_name ?? s.barangay_name,
      coveragePath: normalizeCoveragePath(s.coverage_path),
      zone: s.zone,
      stopOrder: s.stop_order,
      status: s.status,
    })),
    barangays: sortedStops.map((s) => s.stop_name ?? s.barangay_name),
    active: raw.status === "ACTIVE",
    status: raw.status,
  };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useRoutes = () => {
  const createRoute = useAdminMutation(apicreateRoute, "routes", "tracking", "drivers", "trucks", "schedule");
  const updateRoute = useAdminMutation(apiupdateRoute, "routes", "tracking", "drivers", "trucks", "schedule");
  const deleteRoute = useAdminMutation(apideleteRoute, "routes", "tracking", "drivers", "trucks", "schedule");
  const { data: routes, setData: setRoutes, isLoading, isFetching: isRefreshing, dataUpdatedAt, error: queryError, refetch: loadRoutes } =
    useAdminResource<RouteData[]>("routes", ["list"], async () => (await fetchRoutes()).map(mapRoute), []);
  const [savingAction, setSavingAction] = useState<"route" | "duplicate" | null>(null);
  const error = queryError?.message ?? null;


  // ── Fetch ─────────────────────────────────────────────────────────────────────


  // ── Create ────────────────────────────────────────────────────────────────────

  const createNew = useCallback(
    async (form: RouteForm): Promise<RouteData | null> => {
      try {
        setSavingAction("route");
        const raw = await createRoute({
          truck_id: form.truckId,
          driver_id: form.driverId || undefined,
          day_of_week: DAY_REVERSE[form.day],
          start_time: form.startTime,
          waste_type: WASTE_MAP[form.day].label,
          stops: form.barangays.map((b, i) => ({
            barangay_id: b.barangayId,
            street_id: b.id,
            stop_order: i + 1,
          })),
        });
        const mapped = mapRoute(raw);
        setRoutes((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
        toast.success("Route created successfully");
        return mapped;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create route.";
        throw new Error(message);
      } finally {
        setSavingAction(null);
      }
    },
    [createRoute, setRoutes],
  );

  // ── Update ────────────────────────────────────────────────────────────────────

  const updateExisting = useCallback(
    async (id: string, form: RouteForm): Promise<RouteData | null> => {
      try {
        setSavingAction("route");
        const raw = await updateRoute(id, {
          truck_id: form.truckId,
          driver_id: form.driverId || undefined,
          day_of_week: DAY_REVERSE[form.day],
          start_time: form.startTime,
          waste_type: WASTE_MAP[form.day].label,
          stops: form.barangays.map((b, i) => ({
            barangay_id: b.barangayId,
            street_id: b.id,
            stop_order: i + 1,
          })),
        });
        const mapped = mapRoute(raw);
        setRoutes((prev) => prev.map((r) => (r.id === id ? mapped : r)));
        toast.success("Route updated");
        return mapped;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to update route.";
        throw new Error(message);
      } finally {
        setSavingAction(null);
      }
    },
    [setRoutes, updateRoute],
  );

  // ── Toggle Active (ACTIVE ↔ INACTIVE) ─────────────────────────────────────────

  const toggleActive = useCallback(async (route: RouteData): Promise<boolean> => {
    const newStatus = route.active ? "INACTIVE" : "ACTIVE";

    try {
      await updateRoute(route.id, { status: newStatus });
      setRoutes((prev) => prev.map((r) => r.id === route.id ? { ...r, active: !route.active, status: newStatus } : r));
      toast.success(route.active ? "Route paused" : "Route enabled");
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update route status.",
      );
      return false;
    }
  }, [setRoutes, updateRoute]);

  // ── Duplicate ─────────────────────────────────────────────────────────────────

  const duplicate = useCallback(
    async (route: RouteData, targetDay: Day): Promise<RouteData | null> => {
      try {
        setSavingAction("duplicate");
        const raw = await createRoute({
          truck_id: route.truckId,
          driver_id: route.driverId ?? undefined,
          day_of_week: DAY_REVERSE[targetDay],
          start_time: route.startTime,
          waste_type: WASTE_MAP[targetDay].label,
          stops: route.stops.map((s) => ({
            barangay_id: s.barangayId,
            street_id: s.streetId ?? undefined,
            stop_order: s.stopOrder,
          })),
        });
        const mapped = mapRoute(raw);
        setRoutes((prev) => [mapped, ...prev.filter((item) => item.id !== mapped.id)]);
        toast.success(`Route duplicated to ${targetDay}`);
        return mapped;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to duplicate route.",
        );
        return null;
      } finally {
        setSavingAction(null);
      }
    },
    [createRoute, setRoutes],
  );

  // ── Delete ────────────────────────────────────────────────────────────────────

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deleteRoute(id);
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      toast.success("Route deleted");
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete route.",
      );
      return false;
    }
  }, [deleteRoute, setRoutes]);

  return {
    routes,
    isLoading,
    isSaving: savingAction !== null,
    isSavingRoute: savingAction === "route",
    isDuplicating: savingAction === "duplicate",
    error,
    isRefreshing,
    hasLoadedData: dataUpdatedAt > 0,
    loadRoutes,
    createNew,
    updateExisting,
    toggleActive,
    duplicate,
    remove,
  };
};
