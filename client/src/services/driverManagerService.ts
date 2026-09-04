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
  barangays_completed: number;
  barangays_total: number;
  start_time: string;
  end_time: string;
  status_messages: string[];
}

export interface TruckApiRow {
  id: string;
  name: string;
  plate_number: string;
  truck_model?: string | null;
  status?: string;
  availability_status?: string | null;
  driver_id?: string | null;
  waste_type?: string | null;
  created_at?: string;
}

export const fetchDrivers = async (): Promise<DriverApiRow[]> => {
  const res = await api.get<{ data: DriverApiRow[] }>("/drivers");
  return res.data.data ?? [];
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
  userId: string,
  status: "ACTIVE" | "DEACTIVATED",
): Promise<void> => {
  await api.put(`/users/${userId}/status`, { status });
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
  return res.data.data ?? [];
};

export const fetchTrucks = async (): Promise<TruckApiRow[]> => {
  const res = await api.get<{ data: TruckApiRow[] }>("/trucks");
  return res.data.data ?? [];
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

export const fetchDriverMe = async (): Promise<DriverMeData | null> => {
  try {
    const res = await api.get<{ data: DriverMeData }>("/drivers/me");
    return res.data.data;
  } catch (error) {
    return null;
  }
};

export const fetchDriverMyMessages = async (): Promise<DriverMessageRow[]> => {
  try {
    const res = await api.get<{ data: DriverMessageRow[] }>("/drivers/me/messages");
    return res.data.data ?? [];
  } catch (error) {
    return [];
  }
};

export const updateMyDriverStatus = async (status_msg: string): Promise<void> => {
  await api.put("/drivers/me/status", { status_msg });
};

export interface RouteHistoryStop {
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
  timeOnRoute: string;
  status: "completed" | "partial" | "no-collection";
  stops: RouteHistoryStop[];
  adminMessages: { time: string; message: string }[];
}

export const fetchDriverMyHistory = async (limit = 50): Promise<RouteHistoryItem[]> => {
  try {
    const res = await api.get<{ data: RouteHistoryItem[] }>("/drivers/me/history", {
      params: { limit },
    });
    return res.data.data ?? [];
  } catch (error) {
    return [];
  }
};
