import api from "@/lib/api";

export interface BarangayLocationRow {
  id: string;
  name: string;
  zone: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const fetchBarangays = async (): Promise<BarangayLocationRow[]> => {
  const { data } = await api.get<{ data: BarangayLocationRow[] }>("/barangays");
  return data.data ?? [];
};

export interface BarangayAdminRow {
  id: string;
  name: string;
  zone: string | null;
  status: "ACTIVE" | "INACTIVE";
  is_priority: boolean;
  notes?: string | null;
}

export interface BarangayStatsRow {
  total_residents: number;
  total_reports: number;
  resolved_reports: number;
  pending_reports: number;
  total_stops: number;
  completed_stops: number;
  missed_stops: number;
}

export interface UpdateBarangayPayload {
  zone?: string;
  is_priority?: boolean;
  status?: "ACTIVE" | "INACTIVE";
  notes?: string;
}

export interface BarangayOverviewRouteRow {
  route_id: string;
  route_name: string | null;
  day_of_week: string;
  waste_type: string | null;
  route_status: string;
  truck_name: string;
  driver_name: string;
}

export interface BarangayOverviewReportRow {
  id: string;
  reference_number: string;
  violation_type: string;
  status: string;
  created_at: string;
}

export interface BarangayAdminOverviewRow extends BarangayAdminRow {
  stats: BarangayStatsRow;
  assigned_routes: BarangayOverviewRouteRow[];
  recent_reports: BarangayOverviewReportRow[];
}

export const fetchBarangaysAdmin = async (): Promise<BarangayAdminRow[]> => {
  const { data } = await api.get<{ data: BarangayAdminRow[] }>("/barangays");
  return data.data ?? [];
};

export const fetchBarangaysAdminOverview = async (): Promise<
  BarangayAdminOverviewRow[]
> => {
  const { data } = await api.get<{ data: BarangayAdminOverviewRow[] }>(
    "/barangays/admin/overview",
  );
  return data.data ?? [];
};

export const fetchBarangayStats = async (
  id: string,
): Promise<BarangayStatsRow> => {
  const { data } = await api.get<{ data: BarangayStatsRow }>(
    `/barangays/${id}/stats`,
  );
  return data.data;
};

export const updateBarangay = async (
  id: string,
  payload: UpdateBarangayPayload,
): Promise<BarangayAdminRow> => {
  const { data } = await api.put<{ data: BarangayAdminRow }>(
    `/barangays/${id}`,
    payload,
  );
  return data.data;
};
