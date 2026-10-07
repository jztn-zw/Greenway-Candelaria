import {
  DashboardHeaderSkeleton,
  KPICardsSkeleton,
  TrendChartsSkeleton,
  CalendarSkeleton,
  OperationsAndAttentionSkeleton,
  ReportsTableSkeleton,
  ActivityFeedSkeleton,
} from "@/components/loading/PageLoadingSkeletons";
import DashboardHeader from "./components/DashboardHeader";
import KPICards from "./components/KPICards";
import TrendCharts from "./components/TrendCharts";
import AdminCollectionCalendar from "./components/AdminCollectionCalendar";
import TodaysOperations from "./components/TodaysOperations";
import NeedsAttention from "./components/NeedsAttention";
import RecentReportsTable from "./components/RecentReportsTable";
import ActivityFeed from "./components/ActivityFeed";
import { useAdminDashboard } from "./components/useAdminDashboard";
import PageErrorState from "@/components/feedback/PageErrorState";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { PageRetryContext } from "@/components/feedback/pageRetryContext";
import { useAdminQuery } from "@/lib/adminQuery";
import { fetchCalendarEvents } from "@/services/scheduleService";
import { adminDashboardStyles as styles } from "./dashboardStyles";

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
  const calendarQuery = useAdminQuery("schedule", ["calendar", overview?.as_of_date], () => fetchCalendarEvents(), { enabled: !!overview });
  const retryDashboard = () => { if (error) void refetch(); if (calendarQuery.isError) void calendarQuery.refetch(); };

  if (isLoading || (!overview && !error)) {
    return (
      <div role="status" aria-busy="true" className={styles.page}>
        <div aria-hidden="true" className="admin-dashboard-loading space-y-4">
          <DashboardHeaderSkeleton />
          <KPICardsSkeleton />
          <TrendChartsSkeleton />
          <OperationsAndAttentionSkeleton />
          <CalendarSkeleton />
          <div className={styles.recent}>
            <ReportsTableSkeleton />
            <ActivityFeedSkeleton />
          </div>
        </div>
        <span className="sr-only">Loading dashboard data…</span>
      </div>
    );
  }

  if (error && !overview) {
    return <PageErrorState kind="unavailable" title="Dashboard Data Couldn't Load" description="We couldn't load the current figures. Check your connection and try again." onRetry={() => void refetch()} retrying={isRefreshing} />;
  }

  return (
    <PageRetryContext.Provider value={true}>
    <div aria-busy={isRefreshing} className={styles.page}>
      {/* ── 1. Executive Hero Header ── */}
      <DashboardHeader />

      {(error || calendarQuery.isError) && <DataRefreshNotice primary message="Some dashboard information couldn't load or refresh. Available information is still shown; previously loaded data may be outdated." onRetry={retryDashboard} retrying={isRefreshing || calendarQuery.isFetching} />}

      {/* ── 2. Executive 4-Card KPI Metric Strip ── */}
      <KPICards overview={overview} reportsAnalytics={reportsAnalytics} />

      {/* ── 3. Performance & Analytics Trends ── */}
      <TrendCharts
        reportsAnalytics={reportsAnalytics}
        usersAnalytics={usersAnalytics}
          asOfDate={overview?.as_of_date}
      />

      {/* ── 4. Live Operations & Actionable Triage ── */}
      <div className={styles.operations}>
        <TodaysOperations trucks={trucks} barangays={barangays} />
        <NeedsAttention
          attention={attention}
        />
      </div>

      {/* ── 5. Municipal Collection Schedule Calendar ── */}
      <AdminCollectionCalendar asOfDate={overview?.as_of_date} />

      {/* ── 6. Recent Reports & Live Activity Stream ── */}
      <div className={styles.recent}>
        <RecentReportsTable
          reports={recentReports}
        />
        <ActivityFeed
          activityLogs={activityLogs}
        />
      </div>
    </div>
    </PageRetryContext.Provider>
  );
};

export default AdminDashboard;
