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
