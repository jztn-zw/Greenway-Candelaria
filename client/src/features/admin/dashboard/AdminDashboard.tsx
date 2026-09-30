import {
  DashboardHeaderSkeleton,
  KPICardsSkeleton,
  TrendChartsSkeleton,
  CalendarSkeleton,
  OperationsAndAttentionSkeleton,
  ReportsTableSkeleton,
  ActivityFeedSkeleton,
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
import PageErrorState from "@/components/PageErrorState";

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

  if (isLoading || (!overview && !error)) {
    return (
      <div role="status" aria-busy="true" className="w-full max-w-[1600px] mx-auto pb-12">
        <span className="sr-only">Loading dashboard data…</span>
        <div aria-hidden="true" className="space-y-6">
          <DashboardHeaderSkeleton />
          <KPICardsSkeleton />
          <TrendChartsSkeleton />
          <OperationsAndAttentionSkeleton />
          <CalendarSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
            <ReportsTableSkeleton />
            <ActivityFeedSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return <PageErrorState kind="unavailable" title="Dashboard data couldn't load" description="We couldn't load the current figures. Check your connection and try again." onRetry={() => void refetch()} retrying={isRefreshing} />;
  }

  return (
    <div aria-busy={isRefreshing} className="w-full max-w-[1600px] mx-auto space-y-6 pb-12">
      {/* ── 1. Executive Hero Header ── */}
      <DashboardHeader />

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 text-foreground"><AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />Dashboard refresh failed. Showing the last loaded figures.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isRefreshing}>{isRefreshing ? "Retrying…" : "Try again"}</Button>
        </div>
      )}

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
