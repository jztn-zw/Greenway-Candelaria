import { useAdminQuery } from "@/lib/adminQuery";
import api from "@/lib/api";

export interface AnalyticsOverview {
  as_of_date: string;
  users: {
    total: number;
    residents: number;
    drivers: number;
    admins: number;
  };
  reports: {
    total: number;
    resolved: number;
    pending: number;
  };
  trucks: {
    total: number;
    active: number;
  };
  posts: number;
  announcements: number;
}

export interface ReportsAnalytics {
  by_status: Array<{ status: string; count: number }>;
  by_type: Array<{ violation_type: string; count: number }>;
  by_barangay: Array<{ barangay_name: string; zone: string; count: number }>;
  monthly_trend: Array<{ month: string; count: number }>;
  total: number;
  resolved: number;
  resolution_rate: string;
}

export interface UsersAnalytics {
  by_role: Array<{ role: string; count: number }>;
  by_status: Array<{ status: string; count: number }>;
  monthly_signups: Array<{ month: string; count: number }>;
  per_barangay: Array<{ barangay_name: string; zone: string; user_count: number }>;
}

export interface DashboardReport {
  id: string;
  reference_number: string;
  violation_type: string;
  barangay_name: string;
  landmark?: string;
  reporter_name: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "DISPATCHED" | "RESOLVED" | "REJECTED";
  created_at: string;
}

export interface DashboardAuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  module: string;
  record_id?: string;
  created_at: string;
  ip_address?: string;
}

export interface DashboardTruck {
  id: string;
  name: string;
  plate_number: string;
  run_status?: "SCHEDULED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "PARTIAL" | "CANCELLED" | null;
  availability_status?: "ACTIVE" | "UNDER_MAINTENANCE";
  driver_name?: string;
  current_route?: string;
  completed_stops: number;
  total_stops: number;
}

export interface DashboardBarangay {
  id: string;
  name: string;
  truck_name?: string;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "MISSED";
}

export interface DashboardAttention {
  awaiting_triage: number;
  maintenance_trucks: number;
  missed_stops: number;
  items: Array<{
    id: string;
    kind: "report" | "missed_stop" | "maintenance";
    target_id: string;
    title: string;
    description: string;
    occurred_at: string | null;
  }>;
}

interface DashboardPayload {
  overview: AnalyticsOverview;
  reportsAnalytics: ReportsAnalytics;
  usersAnalytics: UsersAnalytics;
  recentReports: DashboardReport[];
  activityLogs: DashboardAuditLog[];
  trucks: DashboardTruck[];
  barangays: DashboardBarangay[];
  attention: DashboardAttention;
}

export const useAdminDashboard = () => {
  const query = useAdminQuery("dashboard", [], async () => {
    const response = await api.get<{ data: DashboardPayload }>("/dashboard");
    return response.data.data;
  }, { refetchInterval: 60_000 });
  return {
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error?.message ?? null,
    overview: query.data?.overview ?? null,
    reportsAnalytics: query.data?.reportsAnalytics ?? null,
    usersAnalytics: query.data?.usersAnalytics ?? null,
    recentReports: query.data?.recentReports ?? [],
    activityLogs: query.data?.activityLogs ?? [],
    trucks: query.data?.trucks ?? [],
    barangays: query.data?.barangays ?? [],
    attention: query.data?.attention ?? null,
    refetch: () => query.refetch(),
  };
};
