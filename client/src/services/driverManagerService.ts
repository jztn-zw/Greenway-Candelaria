import api from "@/lib/api";

export interface DriverApiRow {
  id: string;
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  phone?: string | null;
  account_status?: string;
  last_login?: string | null;
  truck_id?: string | null;
  created_at?: string;
}

export interface DriverActivityApiRow {
  route_id: string;
  date: string;
  route: string;
  status: "COMPLETED" | "PARTIAL";
  completed_stops: number;
  total_stops: number;
  start_time: string;
  end_time: string;
}

export interface TruckApiRow {
  id: string;
  name: string;
  plate_number: string;
  truck_model?: string | null;
  status?: string;
  availability_status?: string | null;
  driver_id?: string | null;
  created_at?: string;
}

export const fetchDrivers = async (): Promise<DriverApiRow[]> => {
  const res = await api.get<{ data: DriverApiRow[] }>("/drivers");
  if (!Array.isArray(res.data.data)) throw new Error("Invalid collector response from server.");
  return res.data.data;
};

export const createDriver = async (payload: {
  full_name: string;
  username: string;
  email: string;
  phone?: string;
  password: string;
  truck_id?: string | null;
}): Promise<DriverApiRow> => {
  const res = await api.post<{ data: DriverApiRow }>("/drivers", payload);
  return res.data.data;
};

export const updateDriver = async (
  driverId: string,
  payload: {
    full_name?: string;
    phone?: string;
    truck_id?: string | null;
  },
): Promise<DriverApiRow> => {
  const res = await api.put<{ data: DriverApiRow }>(`/drivers/${driverId}`, payload);
  return res.data.data;
};

export const updateDriverAccountStatus = async (
  driverId: string,
  status: "ACTIVE" | "DEACTIVATED",
): Promise<void> => {
  await api.put(`/drivers/${driverId}/account-status`, { status });
};

export const resetDriverPassword = async (driverId: string, password: string): Promise<void> => {
  await api.post(`/drivers/${driverId}/reset-password`, { password });
};

export const deleteDriver = async (driverId: string): Promise<void> => {
  await api.delete(`/drivers/${driverId}`);
};

export const fetchDriverActivity = async (
  driverId: string,
  limit = 30,
): Promise<DriverActivityApiRow[]> => {
  const res = await api.get<{ data: DriverActivityApiRow[] }>(
    `/drivers/${driverId}/activity`,
    { params: { limit } },
  );
  if (!Array.isArray(res.data.data)) throw new Error("Invalid collector activity response from server.");
  return res.data.data;
};

export const fetchTrucks = async (): Promise<TruckApiRow[]> => {
  const res = await api.get<{ data: TruckApiRow[] }>("/trucks");
  if (!Array.isArray(res.data.data)) throw new Error("Invalid truck response from server.");
  return res.data.data;
};

export const createTruck = async (payload: {
  name: string;
  plate_number: string;
  truck_model: string;
  availability_status?: "ACTIVE" | "UNDER_MAINTENANCE";
}): Promise<TruckApiRow> => {
  const res = await api.post<{ data: TruckApiRow }>("/trucks", payload);
  return res.data.data;
};

export const updateTruck = async (
  truckId: string,
  payload: {
    name?: string;
    plate_number?: string;
    truck_model?: string;
    status?: "OFFLINE" | "SCHEDULED" | "ON_THE_WAY" | "DONE";
    availability_status?: "ACTIVE" | "UNDER_MAINTENANCE";
  },
): Promise<TruckApiRow> => {
  const res = await api.put<{ data: TruckApiRow }>(`/trucks/${truckId}`, payload);
  return res.data.data;
};

export const deleteTruck = async (truckId: string): Promise<void> => {
  await api.delete(`/trucks/${truckId}`);
};

export interface DriverMeData {
  id: string;
  created_at?: string;
  status_msg?: string | null;
  user_id: string;
  full_name: string;
  username: string;
  email: string;
  phone?: string | null;
  account_status: string;
  avatar_url?: string | null;
  truck_id?: string | null;
  truck_name?: string | null;
  truck_plate?: string | null;
  truck_status?: string | null;
  truck_availability?: string | null;
  truck_model?: string | null;
  last_login?: string | null;
}

export interface DriverMessageRow {
  id: string;
  driver_id: string;
  sent_by: string;
  sender_name?: string;
  route_id?: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const fetchDriverMe = async (): Promise<DriverMeData> => {
  const res = await api.get<{ data: DriverMeData }>("/drivers/me");
  return res.data.data;
};

export type CollectorDashboardProfile = Pick<DriverMeData,
  "full_name" | "truck_id" | "truck_name" | "truck_plate" | "truck_status" | "truck_availability" | "truck_model"
>;

export const fetchCollectorDashboardProfile = async (): Promise<CollectorDashboardProfile> => {
  const res = await api.get<{ data: CollectorDashboardProfile }>("/drivers/me", {
    params: { view: "dashboard" },
  });
  return res.data.data;
};

export const fetchDriverMyMessages = async (): Promise<DriverMessageRow[]> => {
  try {
    const res = await api.get<{ data: DriverMessageRow[] }>("/drivers/me/messages");
    return res.data.data ?? [];
  } catch (error) {
    return [];
  }
};

export const reportTruckBreakdown = async (report: {
  category: string;
  description: string;
  urgent: boolean;
}): Promise<void> => {
  await api.post("/drivers/me/breakdowns", report);
};

export interface RouteHistoryStop {
  id?: string;
  stopNumber: number;
  barangay: string;
  status: "done" | "skipped" | "pending";
  time: string;
  skipReason?: string | null;
  residentsNotified?: number;
}

export interface RouteHistoryItem {
  id: string;
  date: string;
  dayOfWeek: string;
  routeName: string;
  wasteType: string;
  truckName: string;
  truckPlate: string;
  totalStops: number;
  completedStops: number;
  skippedStops: number;
  completionPct: number;
  timeOnRoute: string | null;
  status: "completed" | "partial" | "no-collection";
  stops: RouteHistoryStop[];
  adminMessages?: { time: string; message: string }[];
}

export const fetchDriverMyHistory = async (limit = 50, throwOnError = false): Promise<RouteHistoryItem[]> => {
  try {
    const res = await api.get<{ data: RouteHistoryItem[] }>("/drivers/me/history", {
      params: { limit },
    });
    return res.data.data ?? [];
  } catch (error) {
    if (throwOnError) throw error;
    return [];
  }
};

export interface CollectorHistoryFilters {
  status?: "all" | "completed" | "partial" | "no-collection";
  waste_type?: "all" | "Biodegradable" | "Non-Biodegradable" | "General";
  cursor?: string;
}
export interface CollectorHistoryPage { items: RouteHistoryItem[]; total: number; nextCursor: string | null }
export const fetchCollectorHistoryPage = async (filters: CollectorHistoryFilters = {}): Promise<CollectorHistoryPage> => {
  const res = await api.get<{ data: CollectorHistoryPage }>("/drivers/me/history", { params: { view: "collector", limit: 15, ...filters } });
  return res.data.data;
};
export const fetchCollectorHistoryRun = async (id: string): Promise<RouteHistoryItem> => {
  const res = await api.get<{ data: CollectorHistoryPage }>("/drivers/me/history", { params: { view: "collector", limit: 1, run_id: id } });
  if (!res.data.data.items[0]) throw new Error("Route history not found");
  return res.data.data.items[0];
};
