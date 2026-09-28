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
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const {
    isLoading,
    isRefreshing,
    error,
    refetch,
    overview,
    reportsAnalytics,
    usersAnalytics,
    recentReports,
    activityLogs,
    trucks,
    barangays,
    attention,
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

  if (error) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-12">
        <DashboardHeader />
        <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-amber-500/25 bg-card px-6 py-12 text-center">
          <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-bold text-foreground">Dashboard data is unavailable</h2>
          <p className="max-w-lg text-sm text-muted-foreground">The current figures could not be loaded. {error}</p>
          <Button onClick={refetch} disabled={isRefreshing}> {isRefreshing ? "Retrying…" : "Retry"} </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-12">
      {/* ── 1. Executive Hero Header ── */}
      <DashboardHeader />

      {/* ── 2. Executive 4-Card KPI Metric Strip ── */}
      <KPICards overview={overview} reportsAnalytics={reportsAnalytics} />

      {/* ── 3. Performance & Analytics Trends ── */}
      <TrendCharts
        reportsAnalytics={reportsAnalytics}
        usersAnalytics={usersAnalytics}
          asOfDate={overview?.as_of_date}
      />

      {/* ── 4. Live Operations & Actionable Triage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
        <TodaysOperations trucks={trucks} barangays={barangays} />
        <NeedsAttention
          attention={attention}
        />
      </div>

      {/* ── 5. Municipal Collection Schedule Calendar ── */}
      <AdminCollectionCalendar asOfDate={overview?.as_of_date} />

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
