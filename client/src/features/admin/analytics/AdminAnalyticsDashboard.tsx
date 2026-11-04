import { toManilaCalendarDate } from "@/utils/date";
import { AdminFilterDialog, AdminFilterField } from "@/components/admin/AdminFilterDialog";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { AnalyticsDashboardSkeleton } from "@/components/loading/PageLoadingSkeletons";
import { adminAnalyticsStyles as styles } from "@/components/common/communityContentStyles";
import PageErrorState from "@/components/feedback/PageErrorState";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminQuery } from "@/lib/adminQuery";
import { Button } from "@/components/ui/button";
import { getSystemDate } from "@/lib/serverClock";
import { toast } from "@/lib/toast";
import { fetchBarangaysAdmin } from "@/services/barangaysService";
import { Download, MapPin } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { AnalyticsDataProvider } from "./AnalyticsDataContext";
import AnalyticsSectionNav, { sections, type AnalyticsSectionId } from "./AnalyticsSectionNav";
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
const pageTitle = "Analytics";
const pageDescription = "A single view of collection operations, resident reports, and truck activity.";

const sectionComponents: Record<string, { component: React.FC; title: string; subtitle: string }> = {
  overview: { component: SectionOverview, title: "Operations Overview", subtitle: "Collection coverage, open reports, missed stops, and truck readiness." },
  "collection-performance": { component: SectionCollectionPerformance, title: "Collection Efficiency", subtitle: "Completed route stops as a share of scheduled route stops." },
  "missed-collections": { component: SectionMissedCollections, title: "Missed Collections", subtitle: "Weekly missed route stops, affected areas, and recorded reasons." },
  "barangay-compliance": { component: SectionBarangayCompliance, title: "Barangay Coverage", subtitle: "Scheduled, completed, and missed collection stops by barangay." },
  "waste-reports": { component: SectionWasteReports, title: "Incident Resolution Report", subtitle: "Resident reports by status, category, location, and resolution time." },
  "resident-engagement": { component: SectionResidentEngagement, title: "Resident Engagement", subtitle: "Resident registration and participation in reporting and announcements." },
  "truck-driver": { component: SectionTruckDriver, title: "Driver Operations", subtitle: "Assigned trucks, route outcomes, stop completion, and missed stops." },
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dateRangeFor = (preset: DatePreset) => {
  const today = toManilaCalendarDate();
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
  const [activeSection, setActiveSection] = useState<AnalyticsSectionId>(sections[0].id);
  const [datePreset, setDatePreset] = useState<DatePreset>("last-8-weeks");
  const [barangayId, setBarangayId] = useState("all");
  const [exporting, setExporting] = useState(false);
  const { data: barangayRows = [] } = useAdminQuery("barangays", ["admin-options"], fetchBarangaysAdmin);
  const barangays = useMemo(() => barangayRows.filter((row) => row.status === "ACTIVE").sort((a, b) => a.name.localeCompare(b.name)), [barangayRows]);
  const barangayOptions = useMemo(
    () => [
      { value: "all", label: "All Barangays" },
      ...barangays.map((barangay) => ({ value: barangay.id, label: barangay.name })),
    ],
    [barangays],
  );
  const filters = useMemo(() => ({ ...dateRangeFor(datePreset), ...(barangayId === "all" ? {} : { barangayId }) }), [datePreset, barangayId]);
  const { data, error, isFetching, refetch } = useAnalyticsDashboard(filters);
  const lastDataRef = useRef(data);
  if (data) lastDataRef.current = data;
  const visibleData = data ?? lastDataRef.current;

  const exportReport = async () => {
    if (!data || isFetching || error || exporting) return;
    const snapshot = data;
    const section = activeSection;
    const barangayLabel = barangayOptions.find(option => option.value === barangayId)?.label;
    if (!barangayLabel) return;
    setExporting(true);
    try {
      const generatedAt = getSystemDate();
      const { downloadAnalyticsPdf } = await import("./analytics.pdf");
      await downloadAnalyticsPdf(snapshot, { barangayLabel, generatedAt, section });
      toast.success("Analytics PDF exported");
    } catch {
      toast.error("Could not export analytics", { description: "Please try again. If the problem continues, reload the page." });
    } finally {
      setExporting(false);
    }
  };

  if (!visibleData && !error) {
    return <AnalyticsDashboardSkeleton title={pageTitle} description={pageDescription} />;
  }

  if (!visibleData) {
    return <PageErrorState kind="unavailable" description="We couldn't load the analytics for this period. Try again in a moment." onRetry={() => void refetch()} retrying={isFetching} homeHref="/admin" />;
  }

  const config = sectionComponents[activeSection] || sectionComponents.overview;
  const SectionComp = config.component;

  return (
    <AnalyticsDataProvider value={visibleData}>
      <main className={styles.page}>
        <ResidentPageHeader
        className="admin-module-header"
        title={pageTitle}
        description={pageDescription}
        actionsClassName="w-full sm:w-auto"
        actions={(
          <Button variant="outline" size="sm" className="h-11 w-full sm:h-9 sm:w-auto"
            loading={exporting} loadingLabel="Exporting…"
            disabled={!data || isFetching || Boolean(error) || !barangayOptions.some(option => option.value === barangayId)}
            title={activeSection === "overview" ? "Export all analytics sections for the selected period and barangay" : `Export ${sections.find(section => section.id === activeSection)?.label} for the selected period and barangay`}
            onClick={() => void exportReport()}>
            <Download aria-hidden="true" /> Export PDF
          </Button>
        )}
      />

        {error && <DataRefreshNotice message="Couldn't update analytics. Showing the previous results, which may be outdated or differ from your filters." onRetry={() => void refetch()} retrying={isFetching} />}

        <section aria-label="Analytics filters" className={`${styles.filters} admin-toolbar admin-toolbar-analytics`}>
          <p className="text-xs text-muted-foreground">Showing <span className="font-semibold text-foreground">{formatRange(visibleData.range.from, visibleData.range.to)}
          </span>
          </p>
          <div className={`${styles.fields} admin-toolbar-secondary`}>
            <Select value={datePreset} onValueChange={(value) => setDatePreset(value as DatePreset)}>
              <SelectTrigger className={styles.period} aria-label="Analytics period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-8-weeks">Last 8 Weeks</SelectItem>
                <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
            <SearchableSelect
              value={barangayId}
              onValueChange={setBarangayId}
              options={barangayOptions}
              placeholder="All barangays"
              searchPlaceholder="Search by barangay name…" compactSearchPlaceholder="Barangay name…"
              emptyMessage="No barangays found."
              className={styles.barangay}
              aria-label="Analytics barangay"
              leadingIcon={<MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            />
          </div>
          <AdminFilterDialog title="Filter Analytics" activeCount={Number(datePreset !== "last-8-weeks") + Number(barangayId !== "all")}
            values={{ datePreset, barangayId }}
            onApply={(next) => {
              setDatePreset(next.datePreset);
              setBarangayId(next.barangayId);
            }}
          >
            {(draft, setDraft) => (
              <>
                <AdminFilterField label="Period">
                  <Select value={draft.datePreset} onValueChange={(value) => setDraft({ ...draft, datePreset: value as DatePreset })}>
                    <SelectTrigger aria-label="Analytics period" className="h-9 w-full rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="last-8-weeks">Last 8 Weeks</SelectItem>
                      <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </AdminFilterField>
                <AdminFilterField label="Barangay">
                  <SearchableSelect
                    value={draft.barangayId}
                    onValueChange={(value) => setDraft({ ...draft, barangayId: value })}
                    options={barangayOptions}
                    placeholder="All barangays"
                    searchPlaceholder="Search by barangay name…" compactSearchPlaceholder="Barangay name…"
                    emptyMessage="No barangays found."
                    className={styles.barangay}
                    aria-label="Analytics barangay"
                    leadingIcon={<MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  />
                </AdminFilterField>
              </>
            )}
          </AdminFilterDialog>
        </section>

        <AnalyticsSummaryKPIs />
        <nav aria-label="Analytics sections" className={styles.nav}><AnalyticsSectionNav activeSection={activeSection} onSectionChange={setActiveSection} /></nav>
        <section className={styles.content} aria-live="polite">
          <div className="flex flex-col gap-1 pb-1 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="gw-heading text-base tracking-tight text-foreground sm:text-lg">{config.title}</h2><p className="text-xs text-muted-foreground">{config.subtitle}</p></div>{isFetching && <span className="text-xs text-muted-foreground">Updating…</span>}</div>
          <SectionComp />
        </section>
      </main>
    </AnalyticsDataProvider>
  );
};

export default AdminAnalyticsDashboard;
