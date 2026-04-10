import { useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import {
  PageHeaderSkeleton, AnalyticsDashboardSkeleton,
} from "@/components/PageLoadingSkeletons";
import AnalyticsFilterBar from "./AnalyticsFilterBar";
import AnalyticsSummaryKPIs from "./AnalyticsSummaryKPIs";
import AnalyticsSectionNav, { sections } from "./AnalyticsSectionNav";
import SectionCollectionPerformance from "./SectionCollectionPerformance";
import SectionBarangayCompliance from "./SectionBarangayCompliance";
import SectionWasteReports from "./SectionWasteReports";
import SectionResidentEngagement from "./SectionResidentEngagement";
import SectionTruckDriver from "./SectionTruckDriver";

const sectionComponents: Record<string, { component: React.FC; title: string; subtitle: string }> = {
  "collection-performance": {
    component: SectionCollectionPerformance,
    title: "Collection Performance",
    subtitle: "How well is waste collection happening over time?",
  },
  "barangay-compliance": {
    component: SectionBarangayCompliance,
    title: "Barangay Compliance",
    subtitle: "Which barangays are performing well and which need attention?",
  },
  "waste-reports": {
    component: SectionWasteReports,
    title: "Waste Reports Analysis",
    subtitle: "How are resident complaints trending and how well is MENRO responding?",
  },
  "resident-engagement": {
    component: SectionResidentEngagement,
    title: "Resident Engagement",
    subtitle: "How are residents actually using the system over time?",
  },
  "truck-driver": {
    component: SectionTruckDriver,
    title: "Truck & Driver Performance",
    subtitle: "How efficiently are the two trucks operating over time?",
  },
};

const AdminAnalyticsDashboard = () => {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        <PageHeaderSkeleton showButton={false} />
        <AnalyticsDashboardSkeleton />
      </div>
    );
  }

  const config = sectionComponents[activeSection];
  const SectionComp = config.component;

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">Historical insights and strategic performance metrics</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <AnalyticsFilterBar />

      {/* Summary KPIs */}
      <div className="mt-6">
        <AnalyticsSummaryKPIs />
      </div>

      {/* Section tabs */}
      <div className="mt-6">
        <AnalyticsSectionNav activeSection={activeSection} onSectionChange={setActiveSection} />
      </div>

      {/* Active section content */}
      <div className="mt-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground font-display">{config.title}</h2>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        </div>
        <SectionComp />
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard;
