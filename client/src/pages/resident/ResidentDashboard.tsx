import { useState, useEffect } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import {
  HeroCardsSkeleton,
  StatsCardsSkeleton,
  NotificationsStripSkeleton,
  AnnouncementSkeleton,
  CalendarSkeleton,
  EngagementSkeleton,
  BannerSkeleton,
} from "@/components/PageLoadingSkeletons";
import DashboardGreeting from "@/pages/resident/components/dashboard/DashboardGreeting";
import HeroCards from "@/pages/resident/components/dashboard/HeroCards";
import NextCollectionBanner from "@/pages/resident/components/dashboard/NextCollectionBanner";
import StatsCards from "@/pages/resident/components/dashboard/StatsCards";
import RecentNotificationsStrip from "@/pages/resident/components/dashboard/RecentNotificationsStrip";
import AnnouncementAndTip from "@/pages/resident/components/dashboard/AnnouncementAndTip";
import CollectionCalendar from "@/pages/resident/components/dashboard/CollectionCalendar";
import QuickActionsAndContact from "@/pages/resident/components/dashboard/QuickActionsAndContact";
import EngagementStreak from "@/pages/resident/components/dashboard/EngagementStreak";

const ResidentDashboard = () => {
  const hasActiveTrucks = true;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
        <BannerSkeleton />
        <HeroCardsSkeleton />
        <BannerSkeleton />
        <StatsCardsSkeleton />
        <NotificationsStripSkeleton />
        <AnnouncementSkeleton />
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2"><CalendarSkeleton /></div>
          <div><BannerSkeleton /></div>
        </div>
        <EngagementSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
      <AnimatedSection delay={0}>
        <DashboardGreeting />
      </AnimatedSection>

      <AnimatedSection delay={80}>
        <HeroCards />
      </AnimatedSection>

      <AnimatedSection delay={120}>
        <NextCollectionBanner hasActiveTrucks={hasActiveTrucks} />
      </AnimatedSection>

      <AnimatedSection delay={160}>
        <StatsCards />
      </AnimatedSection>

      <AnimatedSection delay={200}>
        <RecentNotificationsStrip />
      </AnimatedSection>

      <AnimatedSection delay={240}>
        <AnnouncementAndTip />
      </AnimatedSection>

      <AnimatedSection delay={300}>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <CollectionCalendar />
          </div>
          <div>
            <QuickActionsAndContact />
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection delay={360}>
        <EngagementStreak />
      </AnimatedSection>
    </div>
  );
};

export default ResidentDashboard;
