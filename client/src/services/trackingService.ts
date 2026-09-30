/**
 * trackingService.ts
 *
 * All API calls related to tracking and collector route management.
 * Uses the shared `api` axios instance (handles auth token + error normalisation).
 */

import api from "@/lib/api";
import authService from "@/services/authService";

// ─── Types returned by the backend ───────────────────────────────────────────

export interface LiveRow {
  truck_id: string;
  truck_name: string;
  truck_plate?: string;
  truck_status: string; // "ON_THE_WAY" | "OFFLINE" | "SCHEDULED" | "DONE"
  driver_name?: string;
  latitude: number;
  longitude: number;
  last_ping: string; // ISO datetime
}

export interface TruckRow {
  id: string;
  name: string;
  plate_number?: string;
  status: string;
  waste_type?: string;
}

export interface DriverRow {
  account_status?: string;
  id: string;
  user_id: string;
  full_name: string;
  truck_id?: string;
  status_msg?: string | null;
  status_msg_created_at?: string | null;
}

export interface RouteStopRow {
  id: string;
  barangay_id: string;
  barangay_name: string;
  street_id?: string | null;
  stop_name?: string | null;
  coverage_path?: [number, number][] | string | null;
  stops_before?: number;
  order_index: number;
  status: string; // "DONE" | "IN_PROGRESS" | "NOT_STARTED" | "SKIPPED"
  completed_at?: string | null;
  skipped_reason?: string | null;
  latitude?: number;
  longitude?: number;
  distance_km?: number;
}

export interface TruckRouteRow {
  route_id: string;
  template_route_id?: string | null;
  route_status?: string | null;
  truck_id: string;
  truck_name: string;
  driver_id?: string | null;
  driver_user_id?: string | null;
  waste_type?: string;
  driver_name?: string;
  route_name?: string;
  started_at?: string;
  collection_started_at?: string | null;
  paused_at?: string | null;
  total_paused_seconds?: number;
  stops: RouteStopRow[];
  completed_stops: number;
  total_stops: number;
}

export interface HistoryRow {
  id: string;
  truck_id: string;
  latitude: number;
  longitude: number;
  created_at: string;
  truck_name: string;
  truck_plate: string;
  driver_name: string;
}

export interface RouteStopHistoryItem {
  stop_id: string;
  route_id: string;
  route_started_at?: string | null;
  stop_order: number;
  stop_status: string;
  completed_at?: string | null;
  skipped_reason?: string | null;
  barangay_id: string;
  barangay_name: string;
  street_id?: string | null;
  stop_name?: string | null;
  coverage_path?: [number, number][] | string | null;
  latitude: number | string;
  longitude: number | string;
}

export interface TruckHistoryData {
  logs: HistoryRow[];
  stops: RouteStopHistoryItem[];
}

export interface MissedCollectionRow {
  id: string;
  status: "MISSED";
  event_at?: string | null;
  run_date: string;
  reason?: string | null;
  barangay_id: string;
  barangay: string;
  route_id: string;
  truck_id: string;
  truck: string;
  driver: string;
  resident_report_link?: string | null;
}

export interface DriverMessageRow {
  id: string;
  driver_id: string;
  route_id?: string | null;
  sender_user_id: string;
  sender_role: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AdminTrackingOverview {
  trucks: TruckRow[];
  routes: TruckRouteRow[];
  live: LiveRow[];
  drivers: DriverRow[];
  messages: DriverMessageRow[];
}

// ─── Existing API calls ───────────────────────────────────────────────────────

/**
 * GET /tracking/live
 * Returns latest GPS ping per truck for authenticated system roles.
 */
export const fetchLiveTrucks = async (): Promise<LiveRow[]> => {
  const res = await api.get<{ data: LiveRow[] } | LiveRow[]>("/tracking/live");
  return Array.isArray(res.data) ? res.data : (res.data.data ?? []);
};

export const fetchAdminTrackingOverview = async (): Promise<AdminTrackingOverview> => {
  const res = await api.get<{ data: AdminTrackingOverview }>(
    "/tracking/admin/overview",
  );
  return res.data.data;
};

/**
 * GET /trucks
 * Returns the authenticated role's truck list (id, name, plate, status, waste_type).
 */
export const fetchAllTrucks = async (): Promise<TruckRow[]> => {
  const res = await api.get<{ data: TruckRow[] }>("/trucks");
  return res.data.data ?? [];
};

/**
 * GET /drivers
 * Returns the admin-visible driver list including user ids and assigned trucks.
 */
export const fetchAllDrivers = async (): Promise<DriverRow[]> => {
  const res = await api.get<{ data: DriverRow[] }>("/drivers");
  return res.data.data ?? [];
};

/**
 * GET /tracking/:truckId/history
 * Returns all GPS pings for a specific truck.
 * Requires ADMIN role.
 */
export const fetchTruckHistory = async (truckId: string, date?: string): Promise<TruckHistoryData> => {
  const logs: HistoryRow[] = [];
  let stops: RouteStopHistoryItem[] = [];
  let cursor: string | undefined;
  const seen = new Set<string>();
  do {
    const res = await api.get(`/tracking/${truckId}/history`, { params: { date, limit: 5000, cursor } });
    const data = res.data?.data;
    logs.push(...(data?.logs ?? []));
    stops = data?.stops ?? stops;
    cursor = data?.next_cursor || undefined;
    if (cursor && seen.has(cursor)) throw new Error("History pagination did not advance.");
    if (cursor) seen.add(cursor);
  } while (cursor);
  return { logs, stops };
};

/**
 * GET /routes/missed-collections
 * Returns missed/skipped route stops for admin tracking log.
 */
export const fetchMissedCollections = async (
  params?: {
    truck_id?: string;
    barangay_id?: string;
    days?: number;
  },
): Promise<MissedCollectionRow[]> => {
  const res = await api.get<{ data: MissedCollectionRow[] }>(
    "/routes/missed-collections",
    { params },
  );
  return res.data.data ?? [];
};

/**
 * GET /routes/today
 * Returns today's route plan per truck including stops and waste type.
 * The driver sees only their own route; the backend filters by auth token.
 */
export const fetchTodayRoutes = async (): Promise<TruckRouteRow[]> => {
  const res = await api.get<{ data: TruckRouteRow[] }>("/routes/today");
  return res.data.data ?? [];
};

/**
 * GET /routes/today/mine
 * Returns the authenticated driver's current route for today, or null when none exists.
 */
export const fetchMyRoute = async (): Promise<TruckRouteRow | null> => {
  const currentUser = authService.getCurrentUser();
  const role = String(currentUser?.role ?? "").toUpperCase();
  if (role !== "DRIVER") {
    return null;
  }

  const res = await api.get<{ data: TruckRouteRow | null }>("/routes/today/mine");
  return res.data.data;
};

// ─── New: Driver-facing API calls ─────────────────────────────────────────────

/**
 * POST /tracking/ping
 * Driver sends their current GPS location.
 * Backend accepts fresh samples only for the active, started run.
 *
 * @param truckId   - The truck assigned to this driver
 * @param latitude  - Current GPS latitude
 * @param longitude - Current GPS longitude
 */
export const pingLocation = async (
  truckId: string,
  latitude: number,
  longitude: number,
  sample?: { route_run_id: string; sample_id: string; captured_at: string },
  signal?: AbortSignal,
): Promise<void> => {
  const currentUser = authService.getCurrentUser();
  const role = String(currentUser?.role ?? "").toUpperCase();
  if (role !== "DRIVER") {
    return;
  }

  await api.post("/tracking/ping", { truck_id: truckId, latitude, longitude, ...sample }, { signal });
};

/** Pause or resume the authenticated collector's current route. */
export const setMyRoutePaused = async (
  routeId: string,
  paused: boolean,
): Promise<{ routeId: string; status: "PAUSED" | "ACTIVE" }> => {
  const res = await api.put<{ data: { routeId: string; status: "PAUSED" | "ACTIVE" } }>(
    `/routes/${routeId}/pause`,
    { paused },
  );
  return res.data.data;
};

export const startMyRoute = async (routeId: string): Promise<void> => {
  await api.put(`/routes/${routeId}/start`);
};

/**
 * PUT /drivers/me/status
 * Driver updates a short status/reply message visible in admin truck tracking.
 */
export const updateMyDriverStatusMessage = async (
  statusMsg: string,
  routeId?: string,
): Promise<void> => {
  await api.put("/drivers/me/status", { status_msg: statusMsg, route_id: routeId });
};

export const fetchMyDriverMessages = async (
  routeId?: string,
  limit = 100,
  options?: { view: "collector"; message_id?: string },
): Promise<DriverMessageRow[]> => {
  const res = await api.get<{ data: DriverMessageRow[] }>("/drivers/me/messages", {
    params: { limit, route_id: routeId, ...options },
  });
  return res.data.data ?? [];
};

export const fetchDriverMessagesForAdmin = async (
  driverId: string,
  routeId?: string,
  limit = 100,
): Promise<DriverMessageRow[]> => {
  const res = await api.get<{ data: DriverMessageRow[] }>(
    `/drivers/${driverId}/messages`,
    {
      params: { limit, route_id: routeId, view: "web" },
    },
  );
  return res.data.data ?? [];
};

export const markMyDriverMessagesAsRead = async (
  routeId?: string,
  ids?: string[],
): Promise<void> => {
  await api.put("/drivers/me/messages/read", { route_id: routeId, ids });
};
/**
 * POST /drivers/messages
 * Admin sends a persisted message to a specific driver.
 */
export const sendAdminMessageToDriver = async (
  driverUserId: string,
  routeId: string,
  message: string,
): Promise<void> => {
  await api.post("/drivers/messages", {
    driver_user_id: driverUserId,
    route_id: routeId,
    message,
  });
};

/**
 * PATCH /routes/:routeId/stops/:stopId/complete
 * Mark a stop as DONE. Backend records completed_at timestamp.
 *
 * @param routeId - The current route's ID
 * @param stopId  - The stop to mark complete
 */
export const completeStop = async (
  routeId: string,
  stopId: string,
): Promise<void> => {
  await api.put(`/routes/${routeId}/stops/${stopId}/status`, {
    status: "DONE",
  });
};

/**
 * PATCH /routes/:routeId/stops/:stopId/skip
 * Mark a stop as SKIPPED with a reason.
 *
 * @param routeId - The current route's ID
 * @param stopId  - The stop to skip
 * @param reason  - Why the stop is being skipped
 */
export const skipStop = async (
  routeId: string,
  stopId: string,
  reason?: string,
): Promise<void> => {
  await api.put(`/routes/${routeId}/stops/${stopId}/status`, {
    status: "MISSED",
    skipped_reason: reason,
  });
};

/**
 * PATCH /routes/:routeId/end
 * End the current route. Backend finalizes stop outcomes and derives COMPLETED or PARTIAL.
 *
 * @param routeId - The route to end
 */
export const endRoute = async (routeId: string): Promise<void> => {
  await api.put(`/routes/${routeId}/end`);
};

/**
 * PATCH /trucks/:truckId/status
 * Manually override a truck's status (admin action).
 */
export const updateTruckStatus = async (
  truckId: string,
  status: string,
): Promise<void> => {
  await api.put(`/trucks/${truckId}`, { status });
};


