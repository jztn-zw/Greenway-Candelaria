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
      {/* 1. Header with Name, Barangay, Date & Action */}
      <DashboardGreeting />

      {/* 2. Core 3 Hero Cards: Today's Schedule, Live Truck Status, Latest Report */}
      <HeroCards />

      {/* 3. Official Announcements & Segregation Tips */}
      <AnnouncementAndTip />

      {/* 4. Collection Calendar & MENRO Support */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CollectionCalendar />
        </div>
        <div>
          <QuickActionsAndContact />
        </div>
      </div>
    </div>
  );
};

export default ResidentDashboard;


