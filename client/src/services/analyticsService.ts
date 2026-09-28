import api from "@/lib/api";
import type { AnalyticsDashboardData, AnalyticsDateRange } from "@/features/admin/analytics/analytics.types";

export interface AnalyticsDashboardFilters extends AnalyticsDateRange {
  barangayId?: string;
}

const analyticsService = {
  getDashboard: async (filters: AnalyticsDashboardFilters): Promise<AnalyticsDashboardData> => {
    const { data } = await api.get<{ data: AnalyticsDashboardData }>("/analytics/dashboard", {
      params: filters,
    });
    return data.data;
  },
};

export default analyticsService;
