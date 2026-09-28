import DashboardGreeting from "./components/DashboardGreeting";
import HeroCards from "./components/HeroCards";
import AnnouncementAndTip from "./components/AnnouncementAndTip";
import CollectionCalendar from "./components/CollectionCalendar";
import QuickActionsAndContact from "./components/QuickActionsAndContact";
import DashboardPostCarousel from "./components/DashboardPostCarousel";
import EcoTipCard from "./components/EcoTipCard";

const ResidentDashboard = () => {
  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-3 md:space-y-5 lg:space-y-6">
      {/* 1. Header */}
      <DashboardGreeting />

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
  );
};

export default ResidentDashboard;

