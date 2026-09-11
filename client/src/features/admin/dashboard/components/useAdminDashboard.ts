import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export interface AnalyticsOverview {
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
  by_priority: Array<{ priority: string; count: number }>;
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
  priority: "HIGH" | "MEDIUM" | "LOW";
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
  status?: "OFFLINE" | "SCHEDULED" | "ON_THE_WAY" | "DONE";
  availability_status?: "ACTIVE" | "UNDER_MAINTENANCE";
  driver_name?: string;
  current_route?: string;
  completed_barangays?: number;
  total_barangays?: number;
}

export interface DashboardBarangay {
  id: string;
  name: string;
  zone: string;
  truck_name?: string;
  status?: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "MISSED";
}

export interface DashboardRouteStop {
  id: string;
  barangay_id: string;
  barangay_name: string;
  stop_order: number;
  status: "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "MISSED";
}

export interface DashboardRoute {
  id: string;
  day_of_week: string;
  truck_id: string;
  truck_name: string;
  truck_plate: string;
  driver_name: string | null;
  start_time: string;
  status: "ACTIVE" | "INACTIVE";
  name?: string | null;
  waste_type?: string | null;
  stops: DashboardRouteStop[];
}

export interface DashboardAttention {
  awaiting_triage: number;
  high_priority_awaiting_triage: number;
  standard_priority_awaiting_triage: number;
  maintenance_trucks: number;
}

interface DashboardPayload {
  overview: AnalyticsOverview;
  reportsAnalytics: ReportsAnalytics;
  usersAnalytics: UsersAnalytics;
  recentReports: DashboardReport[];
  activityLogs: DashboardAuditLog[];
  trucks: DashboardTruck[];
  barangays: DashboardBarangay[];
  routes: DashboardRoute[];
  attention: DashboardAttention;
}

export const useAdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [reportsAnalytics, setReportsAnalytics] = useState<ReportsAnalytics | null>(null);
  const [usersAnalytics, setUsersAnalytics] = useState<UsersAnalytics | null>(null);
  const [recentReports, setRecentReports] = useState<DashboardReport[]>([]);
  const [activityLogs, setActivityLogs] = useState<DashboardAuditLog[]>([]);
  const [trucks, setTrucks] = useState<DashboardTruck[]>([]);
  const [barangays, setBarangays] = useState<DashboardBarangay[]>([]);
  const [routes, setRoutes] = useState<DashboardRoute[]>([]);
  const [attention, setAttention] = useState<DashboardAttention | null>(null);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const response = await api.get<{ data: DashboardPayload }>("/dashboard");
      const dashboard = response.data.data;

      setOverview(dashboard.overview);
      setReportsAnalytics(dashboard.reportsAnalytics);
      setUsersAnalytics(dashboard.usersAnalytics);
      setRecentReports(dashboard.recentReports ?? []);
      setActivityLogs(dashboard.activityLogs ?? []);
      setTrucks(dashboard.trucks ?? []);
      setBarangays(dashboard.barangays ?? []);
      setRoutes(dashboard.routes ?? []);
      setAttention(dashboard.attention ?? null);
    } catch (err: unknown) {
      console.error("[useAdminDashboard] Error loading dashboard data:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    isLoading,
    isRefreshing,
    error,
    overview,
    reportsAnalytics,
    usersAnalytics,
    recentReports,
    activityLogs,
    trucks,
    barangays,
    routes,
    attention,
    refetch: () => fetchDashboardData(true),
  };
};
