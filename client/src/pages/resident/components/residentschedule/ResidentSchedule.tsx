import { useState, useEffect } from "react";
import CollectionCalendar from "@/pages/resident/components/dashboard/CollectionCalendar";
import { PageHeaderSkeleton, CalendarSkeleton } from "@/components/PageLoadingSkeletons";

const ResidentSchedule = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-[900px] mx-auto space-y-6">
        <PageHeaderSkeleton showButton={false} />
        <CalendarSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[900px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground font-display">Collection Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">View your full waste collection schedule.</p>
      </div>
      <CollectionCalendar />
    </div>
  );
};

export default ResidentSchedule;
