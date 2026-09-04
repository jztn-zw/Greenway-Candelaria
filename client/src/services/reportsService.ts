import api from "@/lib/api";

// ─── Shared types ──────────────────────────────────────────

export interface ReportListRow {
  id: string;
  reference_number: string;
  barangay_id: string;
  violation_type: string;
  status: string;
  created_at: string;
}

export interface MyReportPhoto {
  id: string;
  report_id: string;
  url: string;
  created_at: string;
}

export interface MyReportStatusHistory {
  id: string;
  report_id: string;
  status: string;
  changed_by: string;
  changed_by_name: string;
  created_at: string;
}

export interface MyReportRow {
  id: string;
  reference_number: string;
  barangay_id: string;
  barangay_name: string;
  barangay_zone: string | null;
  violation_type: string;
  landmark: string | null;
  description: string;
  priority: string;
  status: string;
  admin_response: string | null;
  pin_lat: number | null;
  pin_lng: number | null;
  created_at: string;
  updated_at: string;
  photos: MyReportPhoto[];
  status_history: MyReportStatusHistory[];
}

export interface SubmitReportPayload {
  barangay_id: string;
  violation_type: string;
  landmark?: string;
  description: string;
  pin_lat?: number;
  pin_lng?: number;
  photos: string[]; // Cloudinary URLs
}

// ─── Upload photos to Cloudinary via backend ───────────────

export const uploadReportPhotos = async (files: File[]): Promise<string[]> => {
  const form = new FormData();
  for (const file of files) {
    form.append("photos", file);
  }
  const { data } = await api.post<{ data: { urls: string[] } }>(
    "/reports/upload-photos",
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.data.urls;
};

// ─── Submit a new report ───────────────────────────────────

export const submitReport = async (
  payload: SubmitReportPayload,
): Promise<MyReportRow> => {
  const { data } = await api.post<{ data: MyReportRow }>("/reports", payload);
  return data.data;
};

// ─── Fetch current resident's reports (paginated) ─────────

export interface MyReportsParams {
  page?: number;
  limit?: number;
  status?: string; // "all" | "submitted" | "under-review" | "dispatched" | "resolved"
  search?: string;
  sort?: "newest" | "oldest";
}

export interface MyReportsPaginated {
  reports: MyReportRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const fetchMyReports = async (
  params: MyReportsParams = {},
): Promise<MyReportsPaginated> => {
  // Convert frontend status values to backend enum
  const statusMap: Record<string, string> = {
    submitted: "SUBMITTED",
    "under-review": "UNDER_REVIEW",
    dispatched: "DISPATCHED",
    resolved: "RESOLVED",
    all: "all",
  };
  const backendParams: Record<string, string | number> = {
    page: params.page ?? 1,
    limit: params.limit ?? 10,
    sort: params.sort ?? "newest",
  };
  if (params.status && params.status !== "all") {
    backendParams.status = statusMap[params.status] ?? params.status;
  }
  if (params.search && params.search.trim() !== "") {
    backendParams.search = params.search.trim();
  }

  const { data } = await api.get<{ data: MyReportsPaginated }>("/reports/my", {
    params: backendParams,
  });
  return data.data;
};

// ─── Fetch a single owned report by ID ────────────────────

export const fetchMyReportById = async (id: string): Promise<MyReportRow> => {
  const { data } = await api.get<{ data: MyReportRow }>(`/reports/my/${id}`);
  return data.data;
};

// ─── Fetch report stats for current user ───────────────────

export interface ReportStats {
  total: number;
  resolved: number;
  pending: number;
  under_review: number;
  in_progress: number;
}

export const fetchMyReportStats = async (): Promise<ReportStats> => {
  const { data } = await api.get<{ data: ReportStats }>("/reports/my/stats");
  return data.data;
};

// ─── Admin types & API ──────────────────────────────────────

export interface AdminReportPhoto {
  id: string;
  report_id: string;
  url: string;
  created_at: string;
}

export interface AdminReportStatusHistory {
  id: string;
  report_id: string;
  status: string;
  changed_by: string;
  changed_by_name?: string;
  created_at: string;
}

export interface AdminReportNote {
  id: string;
  report_id: string;
  note: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface AdminReportItem {
  id: string;
  reference_number: string;
  user_id: string | null;
  barangay_id: string;
  barangay_name: string;
  barangay_zone: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  violation_type: string;
  landmark: string | null;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "SUBMITTED" | "UNDER_REVIEW" | "DISPATCHED" | "RESOLVED";
  admin_response: string | null;
  is_false: boolean;
  is_duplicate: boolean;
  duplicate_of_id: string | null;
  pin_lat: number | null;
  pin_lng: number | null;
  created_at: string;
  updated_at: string;
  photos: AdminReportPhoto[];
  status_history?: AdminReportStatusHistory[];
  internal_notes?: AdminReportNote[];
}

export interface AdminReportsKPIs {
  total: number;
  submitted: number;
  under_review: number;
  dispatched: number;
  resolved: number;
  pending: number;
}

export interface AdminReportsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  barangay_id?: string;
  barangay?: string;
  violation_type?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
}

export interface AdminReportsResponse {
  reports: AdminReportItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  kpis: AdminReportsKPIs;
}

// ─── Admin: fetch reports with filters, search, pagination ─

export const fetchAdminReports = async (
  params: AdminReportsParams = {},
): Promise<AdminReportsResponse> => {
  const { data } = await api.get<{ data: AdminReportsResponse }>("/reports", {
    params,
  });
  return data.data;
};

// ─── Admin: fetch single report details ────────────────────

export const fetchAdminReportById = async (
  id: string,
): Promise<AdminReportItem> => {
  const { data } = await api.get<{ data: AdminReportItem }>(`/reports/${id}`);
  return data.data;
};

// ─── Admin: update report status and official response ─────

export const updateAdminReportStatus = async (
  id: string,
  payload: { status: string; admin_response?: string },
): Promise<AdminReportItem> => {
  const { data } = await api.put<{ data: AdminReportItem }>(
    `/reports/${id}/status`,
    payload,
  );
  return data.data;
};

// ─── Admin: update report priority ─────────────────────────

export const updateAdminReportPriority = async (
  id: string,
  priority: "LOW" | "MEDIUM" | "HIGH",
): Promise<AdminReportItem> => {
  const { data } = await api.put<{ data: AdminReportItem }>(
    `/reports/${id}/priority`,
    { priority },
  );
  return data.data;
};

// ─── Admin: flag as false / duplicate ──────────────────────

export const flagAdminReport = async (
  id: string,
  payload: {
    is_false?: boolean;
    is_duplicate?: boolean;
    duplicate_of_id?: string;
  },
): Promise<AdminReportItem> => {
  const { data } = await api.put<{ data: AdminReportItem }>(
    `/reports/${id}/flag`,
    payload,
  );
  return data.data;
};

// ─── Admin: add internal note ──────────────────────────────

export const addAdminReportNote = async (
  id: string,
  note: string,
): Promise<AdminReportNote> => {
  const { data } = await api.post<{ data: AdminReportNote }>(
    `/reports/${id}/notes`,
    { note },
  );
  return data.data;
};

// ─── Admin / Resident: delete (or cancel) report ──────────

export const deleteReport = async (id: string): Promise<{ id: string; reference_number: string }> => {
  const { data } = await api.delete<{ data: { id: string; reference_number: string } }>(
    `/reports/${id}`,
  );
  return data.data;
};


