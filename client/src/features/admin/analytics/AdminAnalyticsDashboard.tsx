import React, { useState, useEffect } from "react";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import {
  PageHeaderSkeleton,
  AnalyticsDashboardSkeleton,
} from "@/components/PageLoadingSkeletons";
import AnalyticsFilterBar from "./AnalyticsFilterBar";
import AnalyticsSummaryKPIs from "./AnalyticsSummaryKPIs";
import AnalyticsSectionNav, { sections } from "./AnalyticsSectionNav";
import SectionOverview from "./SectionOverview";
import SectionCollectionPerformance from "./SectionCollectionPerformance";
import SectionBarangayCompliance from "./SectionBarangayCompliance";
import SectionWasteReports from "./SectionWasteReports";
import SectionResidentEngagement from "./SectionResidentEngagement";
import SectionTruckDriver from "./SectionTruckDriver";
import { barangayCompliance, reportStatusBreakdown } from "./mockData";

const sectionComponents: Record<
  string,
  { component: React.FC; title: string; subtitle: string }
> = {
  overview: {
    component: SectionOverview,
    title: "Municipal Operations Overview",
    subtitle: "High-level summary of collection efficiency, compliance highlights, and fleet readiness",
  },
  "collection-performance": {
    component: SectionCollectionPerformance,
    title: "Collection Operations Performance",
    subtitle: "Historical collection completion rates, weekly schedules, and waste volume trends",
  },
  "barangay-compliance": {
    component: SectionBarangayCompliance,
    title: "Barangay Compliance & Segregation",
    subtitle: "Compliance rates across Candelaria's 25 barangays with ranking and historical trends",
  },
  "waste-reports": {
    component: SectionWasteReports,
    title: "Waste Reports & Incident Resolution",
    subtitle: "Resident incident report volume, resolution speed, and common violation categories",
  },
  "resident-engagement": {
    component: SectionResidentEngagement,
    title: "Resident Adoption & Engagement",
    subtitle: "Municipal user growth, active resident metrics, and platform adoption rates",
  },
  "truck-driver": {
    component: SectionTruckDriver,
    title: "Fleet Utilization & Crew Efficiency",
    subtitle: "Active vs idle truck operation, driver route completion, and on-time performance",
  },
};

const AdminAnalyticsDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleExportReport = () => {
    try {
      const csvHeader = "Category,Item / Name,Value,Unit\n";
      const summaryRows = [
        "Summary KPI,Total Collections,648,routes",
        "Summary KPI,Completion Rate,87,%",
        "Summary KPI,Reports Resolved,42,reports",
        "Summary KPI,Avg Resolution Time,2.9,days",
      ].join("\n");
      const complianceRows = barangayCompliance
        .map((b) => `Barangay Compliance,${b.name},${b.rate},%`)
        .join("\n");
      const reportRows = reportStatusBreakdown
        .map((r) => `Report Lifecycle,${r.name},${r.value},count`)
        .join("\n");

      const csvContent = `${csvHeader}${summaryRows}\n${complianceRows}\n${reportRows}`;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.setAttribute("href", url);
      link.setAttribute("download", `GreenWay_Analytics_Candelaria_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Municipal analytics report downloaded successfully");
    } catch {
      toast.error("Failed to export municipal analytics report");
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        <PageHeaderSkeleton showButton={false} />
        <AnalyticsDashboardSkeleton />
      </div>
    );
  }

  const config = sectionComponents[activeSection] || sectionComponents.overview;
  const SectionComp = config.component;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 sm:space-y-6 pb-12 animate-in fade-in duration-300">
      {/* ── 1. Executive Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Historical insights, compliance tracking, and operational performance across Candelaria.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportReport}
            variant="outline"
            size="sm"
            className="h-10 px-4 rounded-xl border border-border/80 bg-card hover:bg-muted/60 font-semibold text-xs shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4 text-primary" />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      {/* ── 2. Executive 4-Card Summary KPI Strip (Immediately Below Header) ── */}
      <AnalyticsSummaryKPIs />

      {/* ── 3. Standardized 2-Tier Toolbar Across Admin Modules ── */}
      <section className="rounded-2xl border border-border/80 bg-card/60 shadow-2xs overflow-hidden">
        {/* Tier 1: Section Navigation Tabs */}
        <div className="p-4 sm:p-5">
          <AnalyticsSectionNav
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </div>

        {/* Tier 2: Secondary Filter Strip */}
        <AnalyticsFilterBar />
      </section>

      {/* ── 4. Active Section Visualizations ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground font-display tracking-tight">
              {config.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {config.subtitle}
            </p>
          </div>
        </div>

        <SectionComp />
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard;
