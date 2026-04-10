import api from "../lib/api";

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

const analyticsService = {
  getOverview: async (): Promise<AnalyticsOverview> => {
    const { data } = await api.get("/analytics/overview");
    return data.data;
  },
};

export default analyticsService;
