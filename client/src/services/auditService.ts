import api from "@/lib/api";

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  module: string;
  record_id: string | null;
  old_value: any;
  new_value: any;
  ip_address: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
  user_role: string;
  user_avatar: string | null;
}

export interface AuditLogKPIsData {
  totalActions: number;
  deletions: number;
  criticalActions: number;
  failedLogins: number;
}

export interface AuditLogsResponse {
  logs: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  kpis: AuditLogKPIsData;
}

export interface AuditFilterOptions {
  modules: string[];
  actions: string[];
  admins: { id: string; name: string; role: string }[];
}

export interface AuditLogParams {
  page?: number;
  limit?: number;
  search?: string;
  module?: string;
  action?: string;
  user_id?: string;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest";
}

export const auditService = {
  async fetchAuditLogs(params: AuditLogParams = {}): Promise<AuditLogsResponse> {
    const res = await api.get<{ data: AuditLogsResponse }>("/audit", { params });
    return res.data.data;
  },

  async fetchFilterOptions(): Promise<AuditFilterOptions> {
    const res = await api.get<{ data: AuditFilterOptions }>("/audit/filters");
    return res.data.data;
  },

  async fetchAuditLogById(id: string): Promise<AuditLogRow> {
    const res = await api.get<{ data: AuditLogRow }>(`/audit/${id}`);
    return res.data.data;
  },

  async recordExport(filters: {
    module?: string;
    from?: string;
    to?: string;
    entry_count: number;
  }): Promise<void> {
    await api.post("/audit/export", filters);
  },
};

export default auditService;
