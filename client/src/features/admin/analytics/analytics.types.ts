export interface AnalyticsDateRange {
  from: string;
  to: string;
}

export interface AnalyticsOverviewData {
  scheduledStops: number;
  completedStops: number;
  completionRate: number;
  missedStops: number;
  openReports: number;
  resolvedReports: number;
  activeTrucks: number;
  totalTrucks: number;
}

export interface AnalyticsDashboardData {
  range: AnalyticsDateRange;
  overview: AnalyticsOverviewData;
  collectionCompletionTrend: Array<{ period: string; scheduled: number; completed: number; missed: number; rate: number }>;
  missedCollectionsWeekly: Array<{ period: string; missed: number }>;
  driverOperations: Array<{ id: string; name: string; truck: string; assigned: number; completed: number; incomplete: number; missedRoutes: number; cancelled: number; scheduledStops: number; completedStops: number; missedStops: number; rate: number }>;
  missedByArea: Array<{ name: string; scheduled: number; missed: number }>;
  missedReasons: Array<{ reason: string; count: number }>;
  reportStatusBreakdown: Array<{ name: string; value: number }>;
  reportsPerWeek: Array<{ period: string; reports: number }>;
  resolutionTimeMonthly: Array<{ month: string; days: number }>;
  violationTypes: Array<{ type: string; count: number }>;
  reportsByBarangay: Array<{ name: string; reports: number }>;
  residentRegistrationGrowth: Array<{ month: string; registrations: number }>;
  residentParticipation: Array<{ month: string; residents: number; reports: number }>;
  residentSummary: { total: number; newResidents: number; reportingResidents: number; announcementReads: number };
  fleetStatus: Array<{ id: string; truck: string; plate: string; availability: string; assigned: number; completed: number; incomplete: number; missedRoutes: number; cancelled: number; missedStops: number }>;
  barangayCoverage: Array<{ name: string; scheduled: number; completed: number; missed: number; rate: number }>;
}

export const reportStatusColors: Record<string, string> = {
  Submitted: "hsl(var(--warning))",
  "Under Review": "hsl(var(--info))",
  Dispatched: "hsl(var(--chart-3))",
  Resolved: "hsl(var(--chart-1))",
};
