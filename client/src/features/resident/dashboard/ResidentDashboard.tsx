import { useResidentQuery } from "@/lib/residentQuery";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { PageRetryContext } from "@/components/pageRetryContext";
import { ResidentDashboardSkeleton } from "@/components/PageLoadingSkeletons";
import { fetchLiveTrucks } from "@/services/trackingService";
import { fetchMyReports } from "@/services/reportsService";
import { fetchRoutes } from "@/services/routesService";
import { fetchCalendarEvents } from "@/services/scheduleService";
import { fetchAnnouncements } from "@/services/announcementsService";
import postsService from "@/services/postsService";
import useAuthStore from "@/store/authStore";
import { getManilaNow } from "@/utils/date";
import { normaliseId } from "../truck-tracking/truckTracking.utils";
import type { PostItem } from "../content/types";
import DashboardGreeting from "./components/DashboardGreeting";
import HeroCards from "./components/HeroCards";
import AnnouncementAndTip from "./components/AnnouncementAndTip";
import CollectionCalendar from "./components/CollectionCalendar";
import QuickActionsAndContact from "./components/QuickActionsAndContact";
import DashboardPostCarousel from "./components/DashboardPostCarousel";
import EcoTipCard from "./components/EcoTipCard";

const ResidentDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const today = getManilaNow();
  const monthIndex = today.month - 1;
  const firstDayIndex = new Date(today.year, monthIndex, 1).getDay();
  const dayCount = firstDayIndex + new Date(today.year, monthIndex + 1, 0).getDate();
  const addressMissing = !normaliseId(user?.street_id) && !normaliseId(user?.barangay_id);

  // These are the same cache keys used by the dashboard sections. TanStack shares
  // the requests, so the page can wait for every initial response without a timer.
  const liveQuery = useResidentQuery("tracking", ["live"], fetchLiveTrucks);
  const reportsQuery = useResidentQuery("reports", ["latest"], () => fetchMyReports({ limit: 1, sort: "newest" }));
  const routesQuery = useResidentQuery("routes", ["templates"], fetchRoutes, { enabled: !addressMissing });
  const postsQuery = useResidentQuery("posts", ["dashboard"],
    () => postsService.getPage<PostItem>({ status: "PUBLISHED", page: 1, limit: 12 }));
  const announcementsQuery = useResidentQuery("announcements", ["active"],
    () => fetchAnnouncements({ status: "ACTIVE" }));
  const calendarQuery = useResidentQuery("schedule", ["calendar", today.year, monthIndex],
    () => fetchCalendarEvents({ month: `${today.year}-${String(today.month).padStart(2, "0")}` }));

  const queries = [liveQuery, reportsQuery, ...(!addressMissing ? [routesQuery] : []), postsQuery, announcementsQuery, calendarQuery];
  const retryDashboard = () => { queries.filter((query) => query.isError).forEach((query) => { void query.refetch(); }); };
  // Sections share these queries. Keep them mounted after the first response,
  // including a failed response, so retry-on-mount cannot restart a load loop.
  if (queries
    .some((query) => query.isLoading && !query.isFetched)) {
    return <ResidentDashboardSkeleton dayCount={dayCount} firstDayIndex={firstDayIndex} />;
  }
  if (queries.every((query) => query.isError && query.data === undefined)) return <PageErrorState kind="unavailable" description="We couldn't load your dashboard information. Check your connection and try again." onRetry={retryDashboard} retrying={queries.some((query) => query.isFetching)} />;

  return (
    <PageRetryContext.Provider value={true}>
    <div className="w-full max-w-[1600px] mx-auto space-y-3 md:space-y-5 lg:space-y-6">
      {/* 1. Header */}
      <DashboardGreeting />
      {queries.some((query) => query.isError) && <DataRefreshNotice primary message={queries.some((query) => query.isError && query.data === undefined) ? "Some dashboard information couldn't load. Available information is still shown; previously loaded data may be outdated." : "Couldn't refresh some dashboard information. Showing the last loaded data, which may be outdated."} onRetry={retryDashboard} retrying={queries.some((query) => query.isFetching)} />}

      {/* 2. Hero Cards */}
      <HeroCards />

      {/* 3. Top row: Post Carousel (left) | Announcement (right) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-stretch xl:gap-4">
        <div className="h-full">
          <DashboardPostCarousel />
        </div>
        <div className="h-full">
          <AnnouncementAndTip />
        </div>
      </div>

      {/* 4. Community calendar, followed by supporting resident information */}
      <CollectionCalendar />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-stretch xl:gap-4">
        <EcoTipCard />
        <div>
          <QuickActionsAndContact />
        </div>
      </div>
    </div>
    </PageRetryContext.Provider>
  );
};

export default ResidentDashboard;
