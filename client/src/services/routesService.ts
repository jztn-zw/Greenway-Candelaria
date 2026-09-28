// src/services/routesService.ts
import api from "@/lib/api";

// ─── API shape (raw data from backend) ───────────────────────────────────────

export interface ApiRouteStop {
  id: string;
  barangay_id: string;
  barangay_name: string;
  street_id?: string | null;
  stop_name?: string | null;
  coverage_path?: [number, number][] | string | null;
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
  status: "ACTIVE" | "PAUSED" | "INACTIVE";
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
    barangay_id?: string;
    street_id?: string;
    stop_order: number;
  }[];
}

export type UpdateRoutePayload = Partial<CreateRoutePayload>;

export interface RouteRunToday {
  route_id: string;
  template_route_id?: string | null;
  route_status: "SCHEDULED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "PARTIAL" | "CANCELLED";
  truck_id: string;
  truck_name: string;
  driver_id?: string | null;
  driver_name?: string | null;
  route_name?: string | null;
  waste_type?: string | null;
  started_at?: string;
  collection_started_at?: string | null;
  ended_at?: string | null;
  paused_at?: string | null;
  total_paused_seconds?: number;
  run_date?: string;
  stops: Array<{
    id: string;
    barangay_id: string;
    barangay_name: string;
    stop_name?: string | null;
    order_index: number;
    status: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "MISSED";
  }>;
}

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

export const fetchMyRouteToday = async (includeFinished = false): Promise<RouteRunToday | null> => {
  const { data } = await api.get<{ data: RouteRunToday | null }>("/routes/today/mine", {
    params: includeFinished ? { include_finished: true } : undefined,
  });
  return data.data;
};
