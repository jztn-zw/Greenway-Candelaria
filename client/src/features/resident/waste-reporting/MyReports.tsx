import { FilterPillTabs, type FilterPillItem } from "@/components/common/FilterPillTabs";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import PaginationControls from "@/components/common/PaginationControls";
import { useResidentQuery, useResidentMutation } from "@/lib/residentQuery";
import {
  useState,
  useEffect,
} from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ChevronRight,
  Clock,
  FileText,
  AlertCircle,
  MapPin,
  Camera,
  EyeOff,
  MessageSquare,
  RefreshCw,
  SortAsc,
  Loader2,
  Trash2,
  X,
  Plus,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MyReportDetailSkeleton, MyReportsListSkeleton, MyReportsPageSkeleton } from "@/components/PageLoadingSkeletons";
import type { SubmittedReport, ReportStatus } from "./types";
import {
  VIOLATION_OPTIONS,
  VIOLATION_TYPE_REVERSE_MAP,
  STATUS_REVERSE_MAP,
} from "./types";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/lib/toast";
import {
  fetchMyReports,
  fetchMyReportById,
  fetchMyReportStats,
  deleteReport,
} from "@/services/reportsService";
import {
  mapMyReport,
  REPORT_FILTER_TABS,
  REPORT_STATUS_CONFIG,
  getViolationStyle,
  type ReportFilterTab,
  type ReportSortOption,
} from "./myReports.utils";

const REPORT_FILTER_ITEMS: FilterPillItem<ReportFilterTab>[] =
  REPORT_FILTER_TABS.map(({ value, label }) => ({ id: value, label }));

// ─── Helpers ───────────────────────────────────────────────

const cleanDescriptionPreview = (rawDesc: string): string => {
  if (!rawDesc) return "";
  const blocks = rawDesc
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const cleaned: string[] = [];
  const seenQuestions = new Set<string>();

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const qMatch = block.match(/^([^\n?]+\?)\s*([\s\S]*)$/);
    if (qMatch) {
      const q = qMatch[1].trim();
      const inlineAnswer = qMatch[2].trim();

      if (seenQuestions.has(q) && !inlineAnswer) {
        continue;
      }

      if (inlineAnswer) {
        seenQuestions.add(q);
        cleaned.push(`${q} ${inlineAnswer}`);
      } else {
        const nextBlock = blocks[i + 1];
        if (nextBlock && !nextBlock.includes("?")) {
          seenQuestions.add(q);
          cleaned.push(`${q} ${nextBlock}`);
          i++;
        } else {
          seenQuestions.add(q);
          if (blocks.length === 1) {
            cleaned.push(q);
          }
        }
      }
    } else {
      cleaned.push(block);
    }
  }

  if (cleaned.length === 0 && rawDesc.trim()) {
    return rawDesc.trim();
  }

  return cleaned.join(" · ");
};

// ─── Main Component ────────────────────────────────────────

const MyReports = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [initialListReady, setInitialListReady] = useState(false);

  // Filters
  const [search, setSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ReportFilterTab>("all");
  const [sortBy, setSortBy]       = useState<ReportSortOption>("newest");

  const [searchParams, setSearchParams] = useSearchParams();
  const reportParam = searchParams.get("report");
  const listQuery = useResidentQuery("reports", ["list", page, debouncedSearch, activeTab, sortBy],
    () => fetchMyReports({ page, search: debouncedSearch, status: activeTab, sort: sortBy }), { keepPreviousData: true });
  useEffect(() => {
    if (!listQuery.isPlaceholderData && listQuery.data && listQuery.data.page !== page) setPage(listQuery.data.page);
  }, [listQuery.data, listQuery.isPlaceholderData, page]);
  const reports = (listQuery.data?.reports ?? []).map(mapMyReport);
  const totalPages = listQuery.data?.totalPages ?? 0;
  const isListLoading = !listQuery.isError && (listQuery.isLoading || listQuery.isPlaceholderData);
  const error = listQuery.error?.message ?? null;
  const statsQuery = useResidentQuery("reports", ["stats"], fetchMyReportStats);
  const initialPageLoading = !initialListReady && (listQuery.isLoading || statsQuery.isLoading);
  useEffect(() => {
    if (!listQuery.isLoading && !statsQuery.isLoading) setInitialListReady(true);
  }, [listQuery.isLoading, statsQuery.isLoading]);
  const detailQuery = useResidentQuery("reports", ["detail", reportParam],
    () => fetchMyReportById(reportParam!), { enabled: !!reportParam });
  const inaccessible = [403, 404].includes((detailQuery.error as { response?: { status?: number } } | null)?.response?.status ?? 0);
  const selectedReport = reportParam && !inaccessible && detailQuery.data ? mapMyReport(detailQuery.data) : null;
  const isLoadingDetail = detailQuery.isLoading;
  const detailError = detailQuery.error?.message ?? null;
  const cancelReport = useResidentMutation(deleteReport, "reports");
  const loadReports = () => listQuery.refetch();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Debounced search — waits 400ms after typing stops, resets to page 1
  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleTabChange = (tab: ReportFilterTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSortChange = (sort: ReportSortOption) => {
    setSortBy(sort);
    setPage(1);
  };

  // ─── Open report detail ────────────────────────────────────

  const openDetail = (report: SubmittedReport) => {
    setSearchParams({ report: report.id, ref: report.referenceNumber });
  };
  const closeDetail = () => setSearchParams({});

  const getViolationLabel = (type: string) =>
    VIOLATION_OPTIONS.find((v) => v.value === type)?.label ?? type;

  const getViolationIcon = (type: string) => {
    const Icon = VIOLATION_OPTIONS.find((v) => v.value === type)?.icon;
    const style = getViolationStyle(type);
    return Icon ? <Icon className={cn("w-5 h-5", style.text)} /> : null;
  };

  const handleCancelReport = async (id: string) => {
    try {
      await cancelReport(id);
      toast.success("Report cancelled successfully");
      closeDetail();
      setPage(1);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel report",
      );
      throw err;
    }
  };

  if (reportParam && isLoadingDetail) {
    return <MyReportDetailSkeleton preview={reports.find((report) => report.id === reportParam)} />;
  }

  if (reportParam && detailError && !selectedReport) return (
    <PageErrorState kind={inaccessible ? "not-found" : "unavailable"} title={inaccessible ? "Report not found" : undefined} description={inaccessible ? "This report is unavailable or does not belong to your account." : "We couldn't load this report. Please try again."} onRetry={inaccessible ? undefined : () => void detailQuery.refetch()} retrying={detailQuery.isFetching} homeHref="/resident/my-reports" homeLabel="Back to my reports" />
  );

  // ─── Detail view ──────────────────────────────────────────

  if (selectedReport) {
    return (
      <>
      {detailError && <DataRefreshNotice message="Couldn't refresh this report. Showing the last loaded details, which may be outdated." onRetry={() => void detailQuery.refetch()} retrying={detailQuery.isFetching} />}
      <ReportDetail
        report={selectedReport}
        isLoading={isLoadingDetail}
        onCancelReport={handleCancelReport}
        onResubmit={() => {
          navigate("/resident/report");
          toast.info("Navigate to Submit a Report to file a new report.");
        }}
      />
      </>
    );
  }

  // First load waits for the report list and filter counts. Later list changes
  // keep the header and filters mounted while the result cards refresh.
  if (initialPageLoading) {
    return <MyReportsPageSkeleton />;
  }

  // ─── Error state ──────────────────────────────────────────

  if (error && listQuery.data === undefined) {
    return <PageErrorState kind="unavailable" description="We couldn't load your reports. Check your connection and try again." onRetry={() => void loadReports()} retrying={listQuery.isFetching} homeHref="/resident" />;
  }

  // ─── Main list view ────────────────────────────────────────

  return (
    <div className="space-y-4 md:space-y-5 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div className="hidden md:block">
          <h1 className="gw-page-title sm:text-ui-page-lg text-foreground tracking-tight">
            My Reports
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            View and track your submitted waste violation reports.
          </p>
        </div>

        <Button
          onClick={() => navigate("/resident/report")}
          className="h-10 w-full shrink-0 rounded-xl text-xs font-semibold gap-1.5 shadow-xs transition-all cursor-pointer md:w-auto md:px-4 lg:text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Submit New Report</span>
        </Button>
      </div>

      {/* ── Search & Filter Toolbar ── */}
      <div className="space-y-3">
        {/* Full-width Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by reference number or description…"
            className="pl-10 h-10 bg-card border-border/80 rounded-xl text-xs lg:text-sm shadow-2xs focus-visible:ring-foreground/20"
          />
          {isListLoading && search !== "" ? (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          ) : search ? (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="gw-action-ghost absolute right-3.5 top-1/2 -translate-y-1/2 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Filter Chips on Left + Sort Dropdown on Right (Single Aligned Row) */}
        <div className="flex items-center justify-between gap-2.5">
          {/* Status filters */}
          <FilterPillTabs<ReportFilterTab>
            items={REPORT_FILTER_ITEMS}
            activeId={activeTab}
            onChange={handleTabChange}
            ariaLabel="Report status filters"
            className="flex-1 pr-2"
          />

          {/* Sort Select */}
          <div className="shrink-0">
            <Select
              value={sortBy}
              onValueChange={(v) => handleSortChange(v as ReportSortOption)}
            >
              <SelectTrigger
                aria-label="Sort reports"
                className="h-9 w-9 justify-center rounded-xl border-border/80 bg-card px-0 text-xs shadow-2xs transition-colors hover:border-primary/30 [&>svg]:hidden md:w-auto md:min-w-[125px] md:justify-between md:px-3.5 md:[&>svg]:block"
              >
                <div className="flex md:hidden">
                  <SortAsc className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="hidden items-center gap-1 md:flex">
                  <SortAsc className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {sortBy === "newest" ? "Newest" : "Oldest"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl border-border/80 shadow-md">
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && <DataRefreshNotice message="Couldn't refresh your reports. Showing the last loaded information, which may be outdated." onRetry={() => void loadReports()} retrying={listQuery.isFetching} />}

      <div className="space-y-4">
      {/* Report List */}
      {isListLoading ? (
        <MyReportsListSkeleton />
      ) : reports.length === 0 ? (
        <Card className="border border-border">
          <CardContent className="py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            {search || activeTab !== "all" ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  No reports found
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your search or filters.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setActiveTab("all");
                    setPage(1);
                  }}
                  className="mt-4 rounded-xl gap-2"
                >
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">
                  No reports yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You haven't submitted any reports yet.
                </p>
                <Button
                  onClick={() => navigate("/resident/report")}
                  size="sm"
                  className="mt-4 rounded-xl"
                >
                  Submit Your First Report
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const statusConf = REPORT_STATUS_CONFIG[report.status];
            const vStyle = getViolationStyle(report.violationType);
            const previewText = cleanDescriptionPreview(report.description);
            return (
              <div
                key={report.id}
                onClick={() => openDetail(report)}
                className="group space-y-2.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs transition-all duration-300 cursor-pointer select-none hover:border-primary/30 md:space-y-3 md:p-4.5 lg:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors shadow-2xs",
                        vStyle.bg,
                        vStyle.border,
                        vStyle.text,
                      )}
                    >
                      {getViolationIcon(report.violationType)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm lg:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {getViolationLabel(report.violationType)}
                        </span>
                        <span
                          className={cn(
                            "text-ui-overline font-bold px-2 py-0.5 rounded-md border shadow-2xs inline-flex items-center shrink-0",
                            statusConf.className,
                          )}
                        >
                          {statusConf.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/80" />
                        <span className="truncate">
                          {report.barangayName}
                          {report.streetOrLandmark ? ` · ${report.streetOrLandmark}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors shrink-0 pt-0.5">
                    <span className="hidden md:inline text-xs">View</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {previewText && (
                  <p className="hidden break-words text-xs font-normal leading-relaxed text-muted-foreground line-clamp-2 lg:block">
                    {previewText}
                  </p>
                )}

                {report.adminResponse && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60">
                    <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-ui-overline uppercase tracking-wider font-bold text-foreground/90">
                        MENRO Response
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {report.adminResponse}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs text-muted-foreground lg:gap-2.5 lg:pt-1">
                  <div className="flex flex-wrap items-center gap-2 lg:gap-2.5">
                    <span className="tabular-nums font-semibold text-foreground/90 bg-muted/60 border border-border/70 px-2.5 py-0.5 rounded-lg text-ui-caption">
                      {report.referenceNumber}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-xs">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
                      {report.submittedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "Asia/Manila",
                      })}
                    </span>
                  </div>

                  {report.photoCount > 0 && (
                    <span className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground md:flex">
                      <Camera className="w-3.5 h-3.5 text-muted-foreground/70" />
                      {report.photoCount} photo{report.photoCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isListLoading && totalPages > 1 && (
        <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} variant="floating" />
      )}
      </div>
    </div>
  );
};

// ─── Report Detail ─────────────────────────────────────────

interface DescriptionBlock {
  question?: string;
  answer?: string;
  text?: string;
}

const parseReportDescription = (rawDesc: string): DescriptionBlock[] => {
  if (!rawDesc) return [];
  const blocks = rawDesc
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const items: DescriptionBlock[] = [];
  const seenQuestions = new Set<string>();

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const qMatch = block.match(/^([^\n?]+\?)\s*([\s\S]*)$/);
    if (qMatch) {
      const q = qMatch[1].trim();
      const inlineAnswer = qMatch[2].trim();

      if (seenQuestions.has(q) && !inlineAnswer) {
        continue;
      }

      if (inlineAnswer) {
        seenQuestions.add(q);
        items.push({ question: q, answer: inlineAnswer });
      } else {
        const nextBlock = blocks[i + 1];
        if (nextBlock && !nextBlock.includes("?")) {
          seenQuestions.add(q);
          items.push({ question: q, answer: nextBlock });
          i++;
        } else {
          seenQuestions.add(q);
          if (blocks.length === 1) {
            items.push({ text: q });
          }
        }
      }
    } else {
      items.push({ text: block });
    }
  }

  if (items.length === 0 && blocks.length > 0) {
    return [{ text: rawDesc }];
  }

  return items;
};

const ReportDetail = ({
  report,
  isLoading,
  onCancelReport,
  onResubmit,
}: {
  report: SubmittedReport;
  isLoading: boolean;
  onCancelReport?: (id: string) => Promise<void>;
  onResubmit: () => void;
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyReference = async (refNum: string) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard access is unavailable");
      }
      await navigator.clipboard.writeText(refNum);
      setCopied(true);
      toast.success("Reference number copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Unable to copy reference number");
    }
  };

  const violation = VIOLATION_OPTIONS.find(
    (v) => v.value === report.violationType,
  );
  const vStyle = getViolationStyle(report.violationType);
  const statusConf = REPORT_STATUS_CONFIG[report.status];
  const steps: ReportStatus[] = [
    "submitted",
    "under-review",
    "dispatched",
    "resolved",
  ];
  const currentIdx = steps.indexOf(report.status);
  const descriptionItems = parseReportDescription(report.description);

  return (
    <div className="max-w-3xl mx-auto space-y-0 pb-4 md:space-y-4 md:pb-6 lg:space-y-5 lg:pb-8">
      {isLoading && (
          <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Syncing...</span>
          </div>
      )}

      {/* Unified Main Card */}
      <div className="divide-y divide-border/60 md:overflow-hidden md:rounded-2xl md:border md:border-border/80 md:bg-card md:shadow-2xs">
        {/* Section 1: Header / Executive Overview */}
        <div className="space-y-2.5 py-4 md:space-y-3 md:p-5 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-ui-caption uppercase tracking-wider font-bold text-muted-foreground">
                Reference Number
              </span>
              <div className="flex items-center gap-2">
                <h2 className="gw-heading text-lg tabular-nums tracking-tight text-foreground lg:text-2xl">
                  {report.referenceNumber}
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopyReference(report.referenceNumber)}
                  className="gw-action-ghost inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors cursor-pointer border"
                  title="Copy reference number"
                  aria-label="Copy reference number"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-md border px-2.5 py-0.5 text-ui-overline font-bold shadow-2xs lg:px-3 lg:py-1 lg:text-xs",
                  statusConf.className,
                )}
              >
                {statusConf.label}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-0.5 text-ui-caption text-muted-foreground lg:gap-4 lg:text-xs">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-muted-foreground/80" />
              Submitted on{" "}
              {report.submittedAt.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "Asia/Manila",
              })}{" "}
              at{" "}
              {report.submittedAt.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "Asia/Manila",
              })}
            </span>
          </div>
        </div>

        {/* Section 2: Violation & Location Summary */}
        <div className="space-y-3.5 py-4 md:space-y-4 md:p-5 lg:p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            {/* Violation Details */}
            <div className="space-y-1.5">
              <span className="text-ui-caption uppercase tracking-wider font-bold text-muted-foreground">
                Violation Type
              </span>
              <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3 dark:bg-muted/20 transition-colors hover:border-border lg:gap-3.5 lg:p-4">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
                    vStyle.bg,
                    vStyle.border,
                    vStyle.text,
                  )}
                >
                  {violation?.icon ? (
                    <violation.icon className={cn("w-5 h-5", vStyle.text)} />
                  ) : (
                    <AlertCircle className={cn("w-5 h-5", vStyle.text)} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {violation?.label ?? report.violationType}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {violation?.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div className="space-y-1.5">
              <span className="text-ui-caption uppercase tracking-wider font-bold text-muted-foreground">
                Reported Location
              </span>
              <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3 dark:bg-muted/20 transition-colors hover:border-border lg:gap-3.5 lg:p-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary shadow-2xs">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    {report.barangayName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {report.streetOrLandmark || "No specific street or landmark specified"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5 pt-1.5 md:pt-2">
            <span className="text-ui-caption uppercase tracking-wider font-bold text-muted-foreground">
              Incident Description
            </span>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border/70 bg-muted/30 p-3 text-xs leading-relaxed text-foreground/90 dark:bg-muted/20 md:p-4 md:text-sm">
              {descriptionItems.map((item, idx) =>
                item.question && item.answer ? (
                  <div
                    key={idx}
                    className="mt-3 first:mt-0 p-3 rounded-lg bg-card border border-border/60 shadow-2xs"
                  >
                    <span className="block text-xs font-semibold text-muted-foreground">
                      {item.question}
                    </span>
                    <span className="block text-sm font-medium text-foreground mt-0.5">
                      {item.answer}
                    </span>
                  </div>
                ) : (
                  <p key={idx} className="mt-2.5 first:mt-0 whitespace-pre-wrap">
                    {item.text}
                  </p>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Photo Evidence (if any) */}
        {report.photos && report.photos.length > 0 && (
          <div className="space-y-2.5 py-4 md:p-5 lg:p-6">
            <div className="flex items-center justify-between">
              <span className="text-ui-caption uppercase tracking-wider font-bold text-muted-foreground">
                Photo Evidence
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {report.photos.length} photo{report.photos.length !== 1 ? "s" : ""} attached
              </span>
            </div>
            <div className="flex items-start gap-3 overflow-x-auto pb-1">
              {report.photos.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/80 bg-muted/20 shadow-2xs transition-all hover:border-primary/40 md:size-16 lg:size-20"
                  title="View full image in new tab"
                >
                  <img
                    src={url}
                    alt={`Evidence ${i + 1}`}
                    className="w-full h-full object-cover transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-ui-overline font-bold text-white px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs">
                      Enlarge
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Resolution / Progress Stepper & Timeline */}
        <div className="space-y-4 py-4 md:space-y-4 md:p-5 lg:space-y-5 lg:p-6">
          <div>
            <span className="text-ui-caption uppercase tracking-wider font-bold text-muted-foreground">
              Review & Dispatch Status
            </span>
            <div className="mt-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5">
                {steps.map((step, i) => (
                  <div key={step} className="flex-1">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        i <= currentIdx ? "bg-primary shadow-2xs" : "bg-muted border border-border/50",
                      )}
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 text-center">
                {["Submitted", "Under Review", "Dispatched", "Resolved"].map((label, idx) => (
                  <span
                    key={label}
                    className={cn(
                      "text-ui-overline md:text-xs transition-colors",
                      idx <= currentIdx
                        ? "font-bold text-foreground"
                        : "font-normal text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Activity History timeline */}
          {report.statusHistory && report.statusHistory.length > 0 && (
            <div className="border-t border-border/60 pt-4 space-y-3">
              <span className="text-ui-caption uppercase tracking-wider font-bold text-muted-foreground">
                Activity Milestones
              </span>
              <div className="space-y-0 pl-1">
                {report.statusHistory.map((entry, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full mt-1.5 ring-2 ring-card shrink-0",
                          idx === report.statusHistory!.length - 1
                            ? "bg-primary"
                            : "bg-border",
                        )}
                      />
                      {idx < report.statusHistory!.length - 1 && (
                        <div className="w-px flex-1 bg-border/80 my-1" />
                      )}
                    </div>
                    <div className="pb-3.5 min-w-0">
                      <p className="text-xs font-semibold text-foreground">
                        {entry.label}
                      </p>
                      <p className="text-ui-overline text-muted-foreground mt-0.5">
                        {entry.timestamp.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "Asia/Manila",
                        })}{" "}
                        at{" "}
                        {entry.timestamp.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "Asia/Manila",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Official MENRO Remarks (if present) */}
        {report.adminResponse && (
          <div className="space-y-2 border-t border-border/60 bg-muted/20 py-4 md:p-5 lg:p-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-ui-caption uppercase tracking-wider font-bold text-foreground">
                MENRO Official Response
              </span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed bg-card p-3.5 rounded-xl border border-border/70 shadow-2xs">
              {report.adminResponse}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-3 lg:pt-2">
        {report.status === "submitted" && onCancelReport && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            disabled={isCancelling}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:bg-destructive/5 hover:border-destructive/25 transition-all duration-200 group cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-muted/70 border border-border/70 flex items-center justify-center text-muted-foreground group-hover:bg-destructive/10 group-hover:text-destructive group-hover:border-destructive/20 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <span className="block font-bold text-foreground group-hover:text-destructive transition-colors text-sm">
                  Cancel & Withdraw Report
                </span>
                <span className="block text-xs text-muted-foreground font-normal">
                  Remove this submission from MENRO's review queue
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-destructive group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        )}

        {report.status === "resolved" && (
          <button
            type="button"
            onClick={onResubmit}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:bg-[var(--button-neutral-hover)] hover:border-foreground/20 transition-all duration-200 group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-muted/70 border border-border/70 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="text-left min-w-0">
                <span className="block font-bold text-foreground group-hover:text-foreground transition-colors text-sm">
                  Report This Issue Again
                </span>
                <span className="block text-xs text-muted-foreground font-normal">
                  File a new report with this location and issue category
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <ConfirmationDialog kind="dialog" open={showCancelModal} onOpenChange={setShowCancelModal}
        title="Cancel Report Submission" icon={<Trash2 />} variant="destructive" cancelLabel="Keep Report"
        description={<>Withdraw report <strong className="text-foreground">{report.referenceNumber}</strong> from MENRO's queue?</>}
        confirmLabel="Yes, Cancel Report" isPending={isCancelling} pendingLabel="Cancelling..."
        confirmDisabled={!onCancelReport}
        onConfirm={async () => {
          if (!onCancelReport || isCancelling) return;
          try { setIsCancelling(true); await onCancelReport(report.id); setShowCancelModal(false); }
          catch { /* The parent shows the request error; keep this dialog open for retry. */ }
          finally { setIsCancelling(false); }
        }} />
    </div>
  );
};

export default MyReports;
