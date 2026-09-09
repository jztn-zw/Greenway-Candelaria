import {
  useState,
  useEffect,
  useCallback,
  useRef,
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
  ChevronLeft,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  MapPin,
  Camera,
  EyeOff,
  MessageSquare,
  RefreshCw,
  SortAsc,
  Loader2,
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react";
import { BackButton } from "@/components/common";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MyReportsPageSkeleton } from "@/components/PageLoadingSkeletons";
import type { SubmittedReport, ReportStatus } from "./types";
import {
  VIOLATION_OPTIONS,
  VIOLATION_TYPE_REVERSE_MAP,
  STATUS_REVERSE_MAP,
} from "./types";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/lib/toast";
import { MyReportsSkeleton } from "@/components/PageLoadingSkeletons";
import {
  fetchMyReports,
  fetchMyReportById,
  fetchMyReportStats,
  deleteReport,
  type MyReportsParams,
  type ReportStats,
} from "@/services/reportsService";
import {
  mapMyReport,
  REPORT_FILTER_TABS,
  REPORT_STATUS_CONFIG,
  type ReportFilterTab,
  type ReportSortOption,
} from "./myReports.utils";

// ─── Constants ─────────────────────────────────────────────

// ─── Main Component ────────────────────────────────────────

const MyReports = () => {
  const navigate = useNavigate();

  // List state
  const [reports, setReports]       = useState<SubmittedReport[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage]             = useState(1);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);

  // Filters
  const [search, setSearch]       = useState("");
  const [activeTab, setActiveTab] = useState<ReportFilterTab>("all");
  const [sortBy, setSortBy]       = useState<ReportSortOption>("newest");
  const [stats, setStats]         = useState<ReportStats | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const reportParam = searchParams.get("report");

  // Load live statistics from /reports/my/stats
  const loadStats = useCallback(async () => {
    try {
      const data = await fetchMyReportStats();
      setStats(data);
    } catch {
      // stats failure is non-fatal
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // Detail state
  const [selectedReport, setSelectedReport]       = useState<SubmittedReport | null>(null);
  const [isLoadingDetail, setIsLoadingDetail]     = useState(false);
  const [detailError, setDetailError]             = useState<string | null>(null);

  // Debounce ref for search
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  // ─── Load reports ─────────────────────────────────────────

  const loadReports = useCallback(
    async (params: MyReportsParams & { page: number }) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchMyReports(params);
        setReports(result.reports.map(mapMyReport));
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load reports.",
        );
      } finally {
        setIsLoading(false);
        isInitialLoadRef.current = false;
      }
    },
    [],
  );

  // Re-fetch whenever filters or page change
  useEffect(() => {
    loadReports({ page, search, status: activeTab, sort: sortBy });
  }, [page, activeTab, sortBy, loadReports]);

  // Debounced search — waits 400ms after typing stops, resets to page 1
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      loadReports({ page: 1, search: value, status: activeTab, sort: sortBy });
    }, 400);
  };

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tabsContainerRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - tabsContainerRef.current.offsetLeft;
    scrollLeftRef.current = tabsContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !tabsContainerRef.current) return;
    const x = e.pageX - tabsContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    tabsContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTabClick = (tab: ReportFilterTab, e: React.MouseEvent<HTMLButtonElement>) => {
    if (hasDraggedRef.current) return;
    handleTabChange(tab);
    e.currentTarget.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
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

  const openDetail = async (report: SubmittedReport) => {
    setSearchParams({ report: report.id, ref: report.referenceNumber });
    setSelectedReport(report); // show cached data immediately
    setDetailError(null);
    setIsLoadingDetail(true);
    try {
      const fresh = await fetchMyReportById(report.id);
      setSelectedReport(mapMyReport(fresh));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load report.";
      if (msg.includes("403") || msg.toLowerCase().includes("access")) {
        setDetailError("You do not have access to this report.");
      } else {
        setDetailError(msg);
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    setSearchParams({});
    setSelectedReport(null);
    setDetailError(null);
    setIsLoadingDetail(false);
  };

  // Sync URL search param with selectedReport
  useEffect(() => {
    if (!reportParam) {
      if (selectedReport) {
        setSelectedReport(null);
      }
      return;
    }
    if (selectedReport?.id === reportParam) return;

    let active = true;
    setIsLoadingDetail(true);
    setDetailError(null);
    fetchMyReportById(reportParam)
      .then((fresh) => {
        if (active) {
          setSelectedReport(mapMyReport(fresh));
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg = err instanceof Error ? err.message : "Failed to load report.";
          setDetailError(msg);
        }
      })
      .finally(() => {
        if (active) setIsLoadingDetail(false);
      });

    return () => {
      active = false;
    };
  }, [reportParam]);

  // ─── Stats mapping & Tab counts ───────────────────────────

  const getTabCount = (tabValue: ReportFilterTab): number => {
    if (!stats) return tabValue === "all" ? total : 0;
    switch (tabValue) {
      case "all":
        return stats.total;
      case "submitted":
        return stats.pending;
      case "under-review":
        return stats.under_review;
      case "dispatched":
        return stats.in_progress;
      case "resolved":
        return stats.resolved;
      default:
        return 0;
    }
  };

  const getViolationLabel = (type: string) =>
    VIOLATION_OPTIONS.find((v) => v.value === type)?.label ?? type;

  const getViolationIcon = (type: string) => {
    const Icon = VIOLATION_OPTIONS.find((v) => v.value === type)?.icon;
    return Icon ? <Icon className="w-5 h-5 text-primary" /> : null;
  };

  const handleCancelReport = async (id: string) => {
    try {
      await deleteReport(id);
      toast.success("Report cancelled successfully");
      closeDetail();
      void loadStats();
      loadReports({ page: 1, search, status: activeTab, sort: sortBy });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel report",
      );
      throw err;
    }
  };

  // ─── Detail view ──────────────────────────────────────────

  if (selectedReport) {
    return (
      <ReportDetail
        report={selectedReport}
        isLoading={isLoadingDetail}
        error={detailError}
        onBack={closeDetail}
        onCancelReport={handleCancelReport}
        onResubmit={() => {
          navigate("/resident/report");
          toast.info("Navigate to Submit a Report to file a new report.");
        }}
      />
    );
  }

  // ─── Initial Page Loading Skeleton (only on true initial boot) ─────────
  if (isLoading && isInitialLoadRef.current) {
    return <MyReportsPageSkeleton />;
  }

  // ─── Error state ──────────────────────────────────────────

  if (error && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">
            Failed to load reports
          </p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            loadReports({ page, search, status: activeTab, sort: sortBy })
          }
          className="gap-2 rounded-xl"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // ─── Main list view ────────────────────────────────────────

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-sm">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">
              My Reports
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              View and track your submitted waste violation reports.
            </p>
          </div>
        </div>

        <Button
          onClick={() => navigate("/resident/report")}
          className="w-full sm:w-auto h-10 rounded-xl text-xs sm:text-sm font-bold gap-1.5 shadow-md shadow-primary/25 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Submit New Report</span>
        </Button>
      </div>

      {/* Stats — from live API stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard icon={FileText}     label="Total"     value={stats?.total ?? total}          color="primary" />
        <StatCard icon={CheckCircle}  label="Resolved"  value={stats?.resolved ?? 0}  color="green" />
        <StatCard icon={AlertCircle}  label="Pending"   value={stats?.pending ?? 0}   color="amber" />
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
            className="pl-10 h-11 bg-card/90 border-border rounded-2xl text-xs sm:text-sm shadow-xs focus-visible:ring-primary/30"
          />
          {isLoading && search !== "" ? (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          ) : search ? (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        {/* Filter Chips on Left + Sort Dropdown on Right (Single Aligned Row) */}
        <div className="flex items-center justify-between gap-2.5">
          {/* Status Filter Tabs (Smooth native mobile scroll + slide drag) */}
          <div
            ref={tabsContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1 min-w-0 pr-2 -mr-1 touch-pan-x select-none cursor-grab active:cursor-grabbing scroll-smooth"
          >
            {REPORT_FILTER_TABS.map((tab) => {
              const count = getTabCount(tab.value);
              const isActive = activeTab === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={(e) => handleTabClick(tab.value, e)}
                  className={cn(
                    "group flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs whitespace-nowrap transition-all duration-200 border shrink-0 active:scale-95 cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25 font-bold"
                      : "bg-card border-border/80 text-muted-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-foreground font-semibold",
                  )}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] font-bold leading-none rounded-full flex items-center justify-center shrink-0 transition-colors",
                        count > 9 ? "h-5 min-w-5 px-1.5" : "w-5 h-5",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sort Select */}
          <div className="shrink-0">
            <Select
              value={sortBy}
              onValueChange={(v) => handleSortChange(v as ReportSortOption)}
            >
              <SelectTrigger className="h-9 rounded-xl bg-card/90 border-border text-xs min-w-[105px] sm:min-w-[130px]">
                <SortAsc className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Report List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="border border-border animate-pulse">
              <CardContent className="p-4 sm:p-5">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
            return (
              <Card
                key={report.id}
                onClick={() => openDetail(report)}
                className="border border-border hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer group"
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      {getViolationIcon(report.violationType)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">
                          {getViolationLabel(report.violationType)}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-semibold border-0 rounded-lg",
                            statusConf.className,
                          )}
                        >
                          {statusConf.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {report.barangayName}
                        {report.streetOrLandmark
                          ? ` · ${report.streetOrLandmark}`
                          : ""}
                      </p>
                      <p className="text-xs text-muted-foreground/80 line-clamp-1">
                        {report.description}
                      </p>

                      {report.adminResponse && (
                        <div className="flex items-start gap-1.5 mt-1 p-2 rounded-lg bg-primary/5 border border-primary/10">
                          <MessageSquare className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-primary">
                              MENRO Response
                            </p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1">
                              {report.adminResponse}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1 flex-wrap">
                        <span className="text-[11px] font-mono text-primary font-semibold">
                          {report.referenceNumber}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {report.submittedAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                  </div>

                  {/* Status progress bar */}
                  <div className="mt-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-1">
                      {(
                        [
                          "submitted",
                          "under-review",
                          "dispatched",
                          "resolved",
                        ] as ReportStatus[]
                      ).map((step, i) => {
                        const steps: ReportStatus[] = [
                          "submitted",
                          "under-review",
                          "dispatched",
                          "resolved",
                        ];
                        const currentIdx = steps.indexOf(report.status);
                        return (
                          <div key={step} className="flex-1">
                            <div
                              className={cn(
                                "h-1.5 rounded-full transition-all",
                                i <= currentIdx ? "bg-primary" : "bg-border",
                              )}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-1.5">
                      {["Submitted", "Review", "Dispatched", "Resolved"].map(
                        (l) => (
                          <span
                            key={l}
                            className="text-[9px] text-muted-foreground"
                          >
                            {l}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} report{total !== 1 ? "s" : ""}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl gap-1 h-9"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl gap-1 h-9"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Stat card ─────────────────────────────────────────────

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    primary: {
      bg: "bg-primary/10",
      text: "text-primary",
      border: "border-primary/20",
    },
    green: {
      bg: "bg-emerald-500/15",
      text: "text-emerald-800 dark:text-emerald-300",
      border: "border-emerald-500/30",
    },
    amber: {
      bg: "bg-amber-500/15",
      text: "text-amber-800 dark:text-amber-300",
      border: "border-amber-500/30",
    },
  };
  const current = colorMap[color] || colorMap.primary;

  return (
    <Card className="border border-border/80 bg-card shadow-xs hover:shadow-md transition-shadow">
      <CardContent className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3.5">
        <div
          className={cn(
            "w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border",
            current.bg,
            current.text,
            current.border,
          )}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-base sm:text-2xl font-bold font-display text-foreground leading-none">
            {value}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1 truncate">
            {label}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Report Detail ─────────────────────────────────────────

const ReportDetail = ({
  report,
  isLoading,
  error,
  onBack,
  onCancelReport,
  onResubmit,
}: {
  report: SubmittedReport;
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
  onCancelReport?: (id: string) => Promise<void>;
  onResubmit: () => void;
}) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const violation = VIOLATION_OPTIONS.find(
    (v) => v.value === report.violationType,
  );
  const statusConf = REPORT_STATUS_CONFIG[report.status];

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      {/* Header */}
      <div className="space-y-3">
        {/* Back pill */}
        <BackButton label="My Waste Reports" onClick={onBack} />

        {/* Title row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold font-display text-foreground truncate font-mono">
              {report.referenceNumber}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Report Details</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isLoading && (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            )}
            <span
              className={cn(
                "inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg border",
                statusConf.className,
              )}
            >
              {statusConf.label}
            </span>
          </div>
        </div>
      </div>

      {/* Detail error */}
      {error && (
        <Card className="border border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Violation Type */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Violation Type
          </p>
          {violation && (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <violation.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {violation.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {violation.description}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location + Description */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
              Location
            </p>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {report.barangayName}
                </p>
                {report.streetOrLandmark && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {report.streetOrLandmark}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
              Description
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {report.description}
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              {report.photoCount} photo{report.photoCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {report.submittedAt.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Photo Evidence */}
      {report.photos && report.photos.length > 0 && (
        <Card className="border border-border shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
              Photo Evidence
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {report.photos.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl overflow-hidden border border-border block hover:opacity-90 transition-opacity"
                >
                  <img
                    src={url}
                    alt={`Evidence ${i + 1}`}
                    className="w-full h-24 sm:h-28 object-cover"
                  />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Progress */}
      <Card className="border border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-4">
            Status Progress
          </p>
          <div className="flex items-center gap-1 mb-3">
            {(
              [
                "submitted",
                "under-review",
                "dispatched",
                "resolved",
              ] as ReportStatus[]
            ).map((step, i) => {
              const steps: ReportStatus[] = [
                "submitted",
                "under-review",
                "dispatched",
                "resolved",
              ];
              const currentIdx = steps.indexOf(report.status);
              return (
                <div key={step} className="flex-1">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all",
                      i <= currentIdx ? "bg-primary" : "bg-border",
                    )}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mb-5">
            {["Submitted", "Review", "Dispatched", "Resolved"].map((l) => (
              <span
                key={l}
                className="text-[9px] sm:text-[10px] text-muted-foreground font-medium"
              >
                {l}
              </span>
            ))}
          </div>

          {/* Status History timeline */}
          {report.statusHistory && report.statusHistory.length > 0 && (
            <div className="border-t border-border pt-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
                Activity History
              </p>
              <div className="space-y-0">
                {report.statusHistory.map((entry, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full mt-1.5 ring-2 ring-card",
                          idx === report.statusHistory!.length - 1
                            ? "bg-primary"
                            : "bg-border",
                        )}
                      />
                      {idx < report.statusHistory!.length - 1 && (
                        <div className="w-px flex-1 bg-border my-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="text-xs font-semibold text-foreground">
                        {entry.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {entry.timestamp.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        at{" "}
                        {entry.timestamp.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Response */}
      {report.adminResponse && (
        <Card className="border border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-primary" />
              <p className="text-[10px] uppercase tracking-widest text-primary font-semibold">
                MENRO Official Response
              </p>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {report.adminResponse}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="space-y-3 pt-2">
        {report.status === "submitted" && onCancelReport && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            disabled={isCancelling}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:bg-destructive/5 hover:border-destructive/25 transition-all duration-200 group active:scale-[0.99] cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-destructive/10 group-hover:text-destructive transition-colors shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <span className="block font-bold text-foreground group-hover:text-destructive transition-colors text-sm">
                  Cancel & Withdraw Report
                </span>
                <span className="block text-xs text-muted-foreground font-normal">
                  Remove this pending submission from MENRO's review queue
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
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 group active:scale-[0.99] cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-primary transition-colors shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <span className="block font-bold text-foreground group-hover:text-primary transition-colors text-sm">
                  Report This Issue Again
                </span>
                <span className="block text-xs text-muted-foreground font-normal">
                  Submit a new report with this location and details
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-primary/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Cancel Report Submission
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel and withdraw report{" "}
              <strong className="text-foreground">{report.referenceNumber}</strong>?
              This will remove the report from MENRO's queue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={isCancelling}
            >
              Keep Report
            </Button>
            <Button
              variant="destructive"
              disabled={isCancelling}
              onClick={async () => {
                if (!onCancelReport) return;
                try {
                  setIsCancelling(true);
                  await onCancelReport(report.id);
                  setShowCancelModal(false);
                } finally {
                  setIsCancelling(false);
                }
              }}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyReports;
