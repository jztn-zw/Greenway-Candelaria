import { useState, useEffect } from "react";
import {
  DashboardGreetingSkeleton,
  HeroCardsSkeleton,
  AnnouncementSkeleton,
  CalendarSkeleton,
  QuickActionsAndContactSkeleton,
} from "@/components/PageLoadingSkeletons";
import DashboardGreeting from "./components/DashboardGreeting";
import HeroCards from "./components/HeroCards";
import AnnouncementAndTip from "./components/AnnouncementAndTip";
import CollectionCalendar from "./components/CollectionCalendar";
import QuickActionsAndContact from "./components/QuickActionsAndContact";
import DashboardPostCarousel from "./components/DashboardPostCarousel";
import EcoTipCard from "./components/EcoTipCard";

const ResidentDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
        <DashboardGreetingSkeleton />
        <HeroCardsSkeleton />
        <AnnouncementSkeleton />
        <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2"><CalendarSkeleton /></div>
          <div><QuickActionsAndContactSkeleton /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
      {/* 1. Header */}
      <DashboardGreeting />

      {/* 2. Hero Cards */}
      <HeroCards />

      {/* 3. Top row: Post Carousel (left) | Announcement (right) */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-5 md:items-stretch">
        <div className="md:col-span-3 h-full">
          <DashboardPostCarousel />
        </div>
        <div className="md:col-span-2 h-full">
          <AnnouncementAndTip />
        </div>
      </div>

      {/* 4. Bottom row: Calendar (left, tall) | Did You Know + MENRO (right, stacked) */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-5 md:items-stretch">
        <div className="md:col-span-3 h-full">
          <CollectionCalendar />
        </div>
        <div className="md:col-span-2 flex flex-col gap-3">
          <div className="shrink-0">
            <EcoTipCard />
          </div>
          <div className="flex-1 min-h-0">
            <QuickActionsAndContact />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentDashboard;
