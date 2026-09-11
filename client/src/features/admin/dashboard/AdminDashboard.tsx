import {
  DashboardHeaderSkeleton,
  KPICardsSkeleton,
  TrendChartsSkeleton,
  CalendarSkeleton,
  OperationsAndAttentionSkeleton,
  ReportsTableSkeleton,
} from "@/components/PageLoadingSkeletons";
import DashboardHeader from "./components/DashboardHeader";
import KPICards from "./components/KPICards";
import TrendCharts from "./components/TrendCharts";
import AdminCollectionCalendar from "./components/AdminCollectionCalendar";
import TodaysOperations from "./components/TodaysOperations";
import NeedsAttention from "./components/NeedsAttention";
import RecentReportsTable from "./components/RecentReportsTable";
import ActivityFeed from "./components/ActivityFeed";
import { useAdminDashboard } from "./components/useAdminDashboard";
import { AlertTriangle } from "lucide-react";

const AdminDashboard = () => {
  const {
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
    refetch,
  } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-10">
        <DashboardHeaderSkeleton />
        <KPICardsSkeleton />
        <TrendChartsSkeleton />
        <OperationsAndAttentionSkeleton />
        <CalendarSkeleton />
        <ReportsTableSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-12">
      {/* ── 1. Executive Hero Header ── */}
      <DashboardHeader isRefreshing={isRefreshing} onRefresh={refetch} />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── 2. Executive 4-Card KPI Metric Strip ── */}
      <KPICards overview={overview} reportsAnalytics={reportsAnalytics} />

      {/* ── 3. Performance & Analytics Trends ── */}
      <TrendCharts
        reportsAnalytics={reportsAnalytics}
        usersAnalytics={usersAnalytics}
      />

      {/* ── 4. Live Operations & Actionable Triage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
        <TodaysOperations trucks={trucks} barangays={barangays} />
        <NeedsAttention
          attention={attention}
        />
      </div>

      {/* ── 5. Municipal Collection Schedule Calendar ── */}
      <AdminCollectionCalendar routes={routes} />

      {/* ── 6. Recent Reports & Live Activity Stream ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
        <RecentReportsTable
          reports={recentReports}
          className="lg:col-span-2"
        />
        <ActivityFeed
          activityLogs={activityLogs}
          className="lg:col-span-1"
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
