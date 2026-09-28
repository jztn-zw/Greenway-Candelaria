import { useAdminQuery } from "@/lib/adminQuery";
import analyticsService, { type AnalyticsDashboardFilters } from "@/services/analyticsService";

export const useAnalyticsDashboard = (filters: AnalyticsDashboardFilters) =>
  useAdminQuery("analytics", [filters], () => analyticsService.getDashboard(filters), {
    staleTime: 60_000, refetchInterval: 60_000,
  });
