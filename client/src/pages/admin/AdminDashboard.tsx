import { useState, useEffect } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import {
  DashboardHeaderSkeleton,
  KPICardsSkeleton,
  TrendChartsSkeleton,
  CalendarSkeleton,
  OperationsAndAttentionSkeleton,
  ReportsTableSkeleton,
  ActivityFeedSkeleton,
} from "@/components/PageLoadingSkeletons";
import DashboardHeader from "./components/dashboard/DashboardHeader";
import KPICards from "./components/dashboard/KPICards";
import TrendCharts from "./components/dashboard/TrendCharts";
import AdminCollectionCalendar from "./components/dashboard/AdminCollectionCalendar";
import TodaysOperations from "./components/dashboard/TodaysOperations";
import NeedsAttention from "./components/dashboard/NeedsAttention";
import RecentReportsTable from "./components/dashboard/RecentReportsTable";
import ActivityFeed from "./components/dashboard/ActivityFeed";

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto">
        <div className="flex gap-6">
          <div className="flex-1 min-w-0 space-y-6">
            <DashboardHeaderSkeleton />
            <KPICardsSkeleton />
            <TrendChartsSkeleton />
            <CalendarSkeleton />
            <OperationsAndAttentionSkeleton />
            <ReportsTableSkeleton />
          </div>
          <div className="hidden lg:block w-72 shrink-0">
            <ActivityFeedSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <div className="flex gap-6">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          <AnimatedSection delay={0}>
            <DashboardHeader />
          </AnimatedSection>
          <AnimatedSection delay={80}>
            <KPICards />
          </AnimatedSection>
          <AnimatedSection delay={160}>
            <TrendCharts />
          </AnimatedSection>
          <AnimatedSection delay={240}>
            <AdminCollectionCalendar />
          </AnimatedSection>

          <AnimatedSection delay={320}>
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <TodaysOperations />
              <NeedsAttention />
            </div>
          </AnimatedSection>

          <AnimatedSection delay={400}>
            <RecentReportsTable />
          </AnimatedSection>
        </div>

        {/* Activity Feed sidebar */}
        <div className="hidden lg:block w-72 shrink-0">
          <AnimatedSection delay={200} animation="slide-right">
            <ActivityFeed />
          </AnimatedSection>
        </div>
      </div>

      {/* Mobile activity feed toggle */}
      <div className="lg:hidden">
        <AnimatedSection delay={480}>
          <ActivityFeed />
        </AnimatedSection>
      </div>
    </div>
  );
};

export default AdminDashboard;
