import { AnalyticsDashboardSkeleton, PageHeaderSkeleton } from "@/components/PageLoadingSkeletons";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminQuery } from "@/lib/adminQuery";
import { fetchBarangaysAdmin } from "@/services/barangaysService";
import { MapPin } from "lucide-react";
import React, { useMemo, useState } from "react";
import { AnalyticsDataProvider } from "./AnalyticsDataContext";
import AnalyticsSectionNav, { sections } from "./AnalyticsSectionNav";
import AnalyticsSummaryKPIs from "./AnalyticsSummaryKPIs";
import SectionBarangayCompliance from "./SectionBarangayCompliance";
import SectionCollectionPerformance from "./SectionCollectionPerformance";
import SectionMissedCollections from "./SectionMissedCollections";
import SectionOverview from "./SectionOverview";
import SectionResidentEngagement from "./SectionResidentEngagement";
import SectionTruckDriver from "./SectionTruckDriver";
import SectionWasteReports from "./SectionWasteReports";
import { useAnalyticsDashboard } from "./useAnalyticsDashboard";

type DatePreset = "this-month" | "last-8-weeks" | "last-3-months";

const sectionComponents: Record<string, { component: React.FC; title: string; subtitle: string }> = {
  overview: { component: SectionOverview, title: "Operations overview", subtitle: "Collection coverage, open reports, missed stops, and fleet readiness." },
  "collection-performance": { component: SectionCollectionPerformance, title: "Collection efficiency", subtitle: "Completed route stops as a share of scheduled route stops." },
  "missed-collections": { component: SectionMissedCollections, title: "Missed collections", subtitle: "Weekly missed route stops, affected areas, and recorded reasons." },
  "barangay-compliance": { component: SectionBarangayCompliance, title: "Barangay coverage", subtitle: "Scheduled, completed, and missed collection stops by barangay." },
  "waste-reports": { component: SectionWasteReports, title: "Incident resolution report", subtitle: "Resident reports by status, category, location, and resolution time." },
  "resident-engagement": { component: SectionResidentEngagement, title: "Resident engagement", subtitle: "Resident registration and participation in reporting and announcements." },
  "truck-driver": { component: SectionTruckDriver, title: "Driver operations", subtitle: "Assigned trucks, route outcomes, stop completion, and missed stops." },
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateRangeFor = (preset: DatePreset) => {
  const today = new Date();
  const from = new Date(today);
  if (preset === "this-month") from.setDate(1);
  if (preset === "last-8-weeks") from.setDate(today.getDate() - 55);
  if (preset === "last-3-months") from.setMonth(today.getMonth() - 3);
  return { from: toIsoDate(from), to: toIsoDate(today) };
};

const formatRange = (from: string, to: string) => {
  const dateOptions: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${new Date(`${from}T12:00:00`).toLocaleDateString("en-PH", dateOptions)} – ${new Date(`${to}T12:00:00`).toLocaleDateString("en-PH", dateOptions)}`;
};

const AdminAnalyticsDashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState(sections[0].id);
  const [datePreset, setDatePreset] = useState<DatePreset>("last-8-weeks");
  const [barangayId, setBarangayId] = useState("all");
  const { data: barangayRows = [] } = useAdminQuery("barangays", ["admin-options"], fetchBarangaysAdmin);
  const barangays = useMemo(() => barangayRows.filter((row) => row.status === "ACTIVE").sort((a, b) => a.name.localeCompare(b.name)), [barangayRows]);
  const barangayOptions = useMemo(
    () => [
      { value: "all", label: "All barangays" },
      ...barangays.map((barangay) => ({ value: barangay.id, label: barangay.name })),
    ],
    [barangays],
  );
  const filters = useMemo(() => ({ ...dateRangeFor(datePreset), ...(barangayId === "all" ? {} : { barangayId }) }), [datePreset, barangayId]);
  const { data, error, isLoading, isFetching, refetch } = useAnalyticsDashboard(filters);

  if (isLoading) {
    return <div className="mx-auto w-full max-w-[1600px] space-y-6"><PageHeaderSkeleton showButton={false} /><AnalyticsDashboardSkeleton /></div>;
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[360px] w-full max-w-[1600px] items-center justify-center rounded-2xl border border-destructive/20 bg-card p-6 text-center">
        <div><h1 className="text-lg font-bold text-foreground">Analytics could not load</h1><p className="mt-1 max-w-md text-sm text-muted-foreground">{error instanceof Error ? error.message : "Please try again."}</p><Button className="mt-4" onClick={() => refetch()}>Try again</Button></div>
      </div>
    );
  }

  const config = sectionComponents[activeSection] || sectionComponents.overview;
  const SectionComp = config.component;

  return (
    <AnalyticsDataProvider value={data}>
      <main className="mx-auto w-full max-w-[1600px] space-y-5 pb-12 sm:space-y-6">
        <header className="pb-1">
          <div><h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Analytics dashboard</h1><p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">A single view of collection operations, resident reports, and fleet activity.</p></div>
        </header>

        <section aria-label="Analytics filters" className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-xs text-muted-foreground">Showing <span className="font-semibold text-foreground">{formatRange(data.range.from, data.range.to)}</span></p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={datePreset} onValueChange={(value) => setDatePreset(value as DatePreset)}><SelectTrigger className="min-w-[168px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="this-month">This month</SelectItem><SelectItem value="last-8-weeks">Last 8 weeks</SelectItem><SelectItem value="last-3-months">Last 3 months</SelectItem></SelectContent></Select>
            <SearchableSelect
              value={barangayId}
              onValueChange={setBarangayId}
              options={barangayOptions}
              placeholder="All barangays"
              searchPlaceholder="Search barangays..."
              emptyMessage="No barangays found."
              className="min-w-[190px] sm:w-[190px]"
              leadingIcon={<MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            />
          </div>
        </section>

        <AnalyticsSummaryKPIs />
        <nav aria-label="Analytics sections" className="rounded-2xl border border-border/80 bg-card/60 p-4 shadow-2xs sm:p-5"><AnalyticsSectionNav activeSection={activeSection} onSectionChange={setActiveSection} /></nav>
        <section className="space-y-4" aria-live="polite">
          <div className="flex flex-col gap-1 pb-1 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">{config.title}</h2><p className="text-xs text-muted-foreground">{config.subtitle}</p></div>{isFetching && <span className="text-xs text-muted-foreground">Updating…</span>}</div>
          <SectionComp />
        </section>
      </main>
    </AnalyticsDataProvider>
  );
};

export default AdminAnalyticsDashboard;
