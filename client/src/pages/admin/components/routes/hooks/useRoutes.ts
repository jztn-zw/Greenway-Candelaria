// src/pages/admin/hooks/useRoutes.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  fetchRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  ApiRoute,
} from "@/services/routesService";
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
}

// ─── Form shape (what the editor works with) ──────────────────────────────────

export interface RouteForm {
  day: Day;
  truckId: string;
  driverId: string;
  startTime: string;
  barangays: { id: string; name: string }[];
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
      zone: s.zone,
      stopOrder: s.stop_order,
      status: s.status,
    })),
    barangays: sortedStops.map((s) => s.barangay_name),
    active: raw.status === "ACTIVE",
  };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useRoutes = () => {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useRef snapshot for optimistic rollback — avoids stale closure in remove()
  const routesRef = useRef<RouteData[]>([]);
  routesRef.current = routes;

  // ── Fetch ─────────────────────────────────────────────────────────────────────

  const loadRoutes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const raw = await fetchRoutes();
      setRoutes(raw.map(mapRoute));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load routes.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  // ── Create ────────────────────────────────────────────────────────────────────

  const createNew = useCallback(
    async (form: RouteForm): Promise<RouteData | null> => {
      try {
        setIsSaving(true);
        const raw = await createRoute({
          truck_id: form.truckId,
          driver_id: form.driverId || undefined,
          day_of_week: DAY_REVERSE[form.day],
          start_time: form.startTime,
          waste_type: WASTE_MAP[form.day].label,
          stops: form.barangays.map((b, i) => ({
            barangay_id: b.id,
            stop_order: i + 1,
          })),
        });
        const mapped = mapRoute(raw);
        setRoutes((prev) => [mapped, ...prev]);
        toast.success("Route created successfully");
        return mapped;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to create route.",
        );
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  // ── Update ────────────────────────────────────────────────────────────────────

  const updateExisting = useCallback(
    async (id: string, form: RouteForm): Promise<RouteData | null> => {
      try {
        setIsSaving(true);
        const raw = await updateRoute(id, {
          truck_id: form.truckId,
          driver_id: form.driverId || undefined,
          day_of_week: DAY_REVERSE[form.day],
          start_time: form.startTime,
          waste_type: WASTE_MAP[form.day].label,
          stops: form.barangays.map((b, i) => ({
            barangay_id: b.id,
            stop_order: i + 1,
          })),
        });
        const mapped = mapRoute(raw);
        setRoutes((prev) => prev.map((r) => (r.id === id ? mapped : r)));
        toast.success("Route updated");
        return mapped;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update route.",
        );
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  // ── Toggle Active (ACTIVE ↔ INACTIVE) ─────────────────────────────────────────

  const toggleActive = useCallback(async (route: RouteData): Promise<void> => {
    const newStatus = route.active ? "INACTIVE" : "ACTIVE";

    // Optimistic update
    setRoutes((prev) =>
      prev.map((r) => (r.id === route.id ? { ...r, active: !r.active } : r)),
    );

    try {
      await updateRoute(route.id, { status: newStatus });
      toast.success(route.active ? "Route deactivated" : "Route reactivated");
    } catch (err) {
      // Rollback
      setRoutes((prev) => prev.map((r) => (r.id === route.id ? route : r)));
      toast.error(
        err instanceof Error ? err.message : "Failed to update route status.",
      );
    }
  }, []);

  // ── Duplicate ─────────────────────────────────────────────────────────────────

  const duplicate = useCallback(
    async (route: RouteData, targetDay: Day): Promise<RouteData | null> => {
      try {
        setIsSaving(true);
        const raw = await createRoute({
          truck_id: route.truckId,
          driver_id: route.driverId ?? undefined,
          day_of_week: DAY_REVERSE[targetDay],
          start_time: route.startTime,
          waste_type: WASTE_MAP[targetDay].label,
          stops: route.stops.map((s) => ({
            barangay_id: s.barangayId,
            stop_order: s.stopOrder,
          })),
        });
        const mapped = mapRoute(raw);
        setRoutes((prev) => [mapped, ...prev]);
        toast.success(`Route duplicated to ${targetDay}`);
        return mapped;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to duplicate route.",
        );
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  // ── Delete ────────────────────────────────────────────────────────────────────

  const remove = useCallback(async (id: string): Promise<boolean> => {
    // Snapshot via ref — no stale closure, no [routes] dependency
    const previous = routesRef.current;
    setRoutes((prev) => prev.filter((r) => r.id !== id)); // optimistic

    try {
      await deleteRoute(id);
      toast.success("Route deleted");
      return true;
    } catch (err) {
      setRoutes(previous); // rollback
      toast.error(
        err instanceof Error ? err.message : "Failed to delete route.",
      );
      return false;
    }
  }, []); // ← no [routes] dependency needed anymore

  return {
    routes,
    isLoading,
    isSaving,
    error,
    loadRoutes,
    createNew,
    updateExisting,
    toggleActive,
    duplicate,
    remove,
  };
};
