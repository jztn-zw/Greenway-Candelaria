import api from "@/lib/api";

export type ResidentAccountStatus = "ACTIVE" | "DEACTIVATED" | "BANNED";

export interface ResidentListRow {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string | null;
  status: ResidentAccountStatus;
  ban_reason: string | null;
  created_at: string;
  last_login_at: string | null;
  barangay_name: string | null;
}

export interface ResidentListPagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ResidentListResponse {
  data: ResidentListRow[];
  pagination: ResidentListPagination;
}

export interface ResidentDetailsRow {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string | null;
  role: string;
  status: ResidentAccountStatus;
  ban_reason: string | null;
  avatar_url: string | null;
  two_factor: boolean;
  created_at: string;
  last_login_at: string | null;
  barangay_name: string | null;
  barangay_id: string | null;
}

export interface ResidentReportRow {
  id: string;
  reference_number: string;
  violation_type: string;
  status: string;
  priority: string;
  created_at: string;
  barangay_name: string | null;
}

export interface FetchResidentsParams {
  search?: string;
  barangay_id?: string;
  status?: ResidentAccountStatus;
  role?: string;
  page?: number;
  limit?: number;
}

export const fetchResidents = async (
  params: FetchResidentsParams,
): Promise<ResidentListResponse> => {
  const { data } = await api.get<{ data: ResidentListResponse }>("/users", {
    params: {
      role: "RESIDENT",
      ...params,
    },
  });

  return data.data ?? { data: [], pagination: { total: 0, page: 1, limit: 12, total_pages: 1 } };
};

export const fetchResidentById = async (
  id: string,
): Promise<ResidentDetailsRow> => {
  const { data } = await api.get<{ data: ResidentDetailsRow }>(`/users/${id}`);
  return data.data;
};

export const updateResidentStatus = async (
  id: string,
  status: ResidentAccountStatus,
  ban_reason?: string,
): Promise<ResidentDetailsRow> => {
  const { data } = await api.put<{ data: ResidentDetailsRow }>(`/users/${id}/status`, {
    status,
    ban_reason,
  });
  return data.data;
};

export const deleteResident = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};

export const fetchResidentReports = async (
  id: string,
): Promise<ResidentReportRow[]> => {
  const { data } = await api.get<{ data: ResidentReportRow[] }>(
    `/users/${id}/reports`,
  );
  return data.data ?? [];
};
