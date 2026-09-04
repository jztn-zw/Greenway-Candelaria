// src/services/routesService.ts
import api from "@/lib/api";

// ─── API shape (raw data from backend) ───────────────────────────────────────

export interface ApiRouteStop {
  id: string;
  barangay_id: string;
  barangay_name: string;
  zone: string;
  stop_order: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "MISSED";
  completed_at?: string | null;
  skipped_reason?: string | null;
}

export interface ApiRoute {
  id: string;
  day_of_week: string; // "MONDAY", "TUESDAY", etc.
  truck_id: string;
  truck_name: string;
  truck_plate: string;
  driver_id: string | null;
  driver_name: string | null;
  start_time: string; // "06:00:00"
  status: "ACTIVE" | "INACTIVE";
  name?: string | null;
  waste_type?: string | null;
  created_at?: string;
  updated_at?: string;
  stops: ApiRouteStop[];
}

// ─── Payload types ────────────────────────────────────────────────────────────

export interface CreateRoutePayload {
  truck_id: string;
  driver_id?: string;
  day_of_week: string;
  start_time: string;
  status?: string;
  waste_type?: string;
  stops: {
    barangay_id: string;
    stop_order: number;
  }[];
}

export type UpdateRoutePayload = Partial<CreateRoutePayload>;

// ─── API Functions ────────────────────────────────────────────────────────────

export const fetchRoutes = async (): Promise<ApiRoute[]> => {
  const { data } = await api.get<{ data: ApiRoute[] }>("/routes");
  return data.data;
};

export const fetchRouteById = async (id: string): Promise<ApiRoute> => {
  const { data } = await api.get<{ data: ApiRoute }>(`/routes/${id}`);
  return data.data;
};

export const createRoute = async (
  payload: CreateRoutePayload,
): Promise<ApiRoute> => {
  const { data } = await api.post<{ data: ApiRoute }>("/routes", payload);
  return data.data;
};

export const updateRoute = async (
  id: string,
  payload: UpdateRoutePayload,
): Promise<ApiRoute> => {
  const { data } = await api.put<{ data: ApiRoute }>(`/routes/${id}`, payload);
  return data.data;
};

export const deleteRoute = async (id: string): Promise<{ message: string }> => {
  const { data } = await api.delete<{ message: string }>(`/routes/${id}`);
  return data;
};

export const fetchMyRouteToday = async (): Promise<any> => {
  try {
    const { data } = await api.get<{ data: any }>("/routes/today/mine");
    return data.data;
  } catch (error) {
    return null;
  }
};
