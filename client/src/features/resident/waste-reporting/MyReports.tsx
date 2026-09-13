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
  Plus,
  Copy,
  Check,
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
  getViolationStyle,
  type ReportFilterTab,
  type ReportSortOption,
} from "./myReports.utils";

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
  const firstReportNumber = total === 0 ? 0 : (page - 1) * 10 + 1;
  const lastReportNumber = Math.min(firstReportNumber + reports.length - 1, total);
  const paginationItems: Array<number | "ellipsis"> = (() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items: Array<number | "ellipsis"> = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    if (start > 2) items.push("ellipsis");
    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) items.push(pageNumber);
    if (end < totalPages - 1) items.push("ellipsis");
    items.push(totalPages);
    return items;
  })();

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
  const listRequestIdRef = useRef(0);
  const detailRequestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  // ─── Load reports ─────────────────────────────────────────

  const loadReports = useCallback(
    async (params: MyReportsParams & { page: number }) => {
      const requestId = ++listRequestIdRef.current;
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchMyReports(params);
        if (requestId !== listRequestIdRef.current) return;
        setReports(result.reports.map(mapMyReport));
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (err: unknown) {
        if (requestId !== listRequestIdRef.current) return;
        setError(
          err instanceof Error ? err.message : "Failed to load reports.",
        );
      } finally {
        if (requestId !== listRequestIdRef.current) return;
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
    const requestId = ++detailRequestIdRef.current;
    setSearchParams({ report: report.id, ref: report.referenceNumber });
    setSelectedReport(report); // show cached data immediately
    setDetailError(null);
    setIsLoadingDetail(true);
    try {
      const fresh = await fetchMyReportById(report.id);
      if (requestId !== detailRequestIdRef.current) return;
      setSelectedReport(mapMyReport(fresh));
    } catch (err: unknown) {
      if (requestId !== detailRequestIdRef.current) return;
      const msg = err instanceof Error ? err.message : "Failed to load report.";
      if (msg.includes("403") || msg.toLowerCase().includes("access")) {
        setDetailError("You do not have access to this report.");
      } else {
        setDetailError(msg);
      }
    } finally {
      if (requestId !== detailRequestIdRef.current) return;
      setIsLoadingDetail(false);
    }
  };

  const closeDetail = () => {
    detailRequestIdRef.current += 1;
    setSearchParams({});
    setSelectedReport(null);
    setDetailError(null);
    setIsLoadingDetail(false);
  };

  // Sync URL search param with selectedReport
  useEffect(() => {
    if (!reportParam) {
      detailRequestIdRef.current += 1;
      if (selectedReport) {
        setSelectedReport(null);
      }
      return;
    }
    if (selectedReport?.id === reportParam) return;

    let active = true;
    const requestId = ++detailRequestIdRef.current;
    setIsLoadingDetail(true);
    setDetailError(null);
    fetchMyReportById(reportParam)
      .then((fresh) => {
        if (active && requestId === detailRequestIdRef.current) {
          setSelectedReport(mapMyReport(fresh));
        }
      })
      .catch((err: unknown) => {
        if (active && requestId === detailRequestIdRef.current) {
          const msg = err instanceof Error ? err.message : "Failed to load report.";
          setDetailError(msg);
        }
      })
      .finally(() => {
        if (active && requestId === detailRequestIdRef.current) setIsLoadingDetail(false);
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
    const style = getViolationStyle(type);
    return Icon ? <Icon className={cn("w-5 h-5", style.text)} /> : null;
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
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
            My Reports
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            View and track your submitted waste violation reports.
          </p>
        </div>

        <Button
          onClick={() => navigate("/resident/report")}
          className="w-full sm:w-auto h-10 rounded-xl text-xs sm:text-sm font-bold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition-all shrink-0 cursor-pointer"
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
            className="pl-10 h-10 bg-card border-border/80 rounded-xl text-xs sm:text-sm shadow-2xs focus-visible:ring-foreground/20"
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
                      ? "bg-primary text-primary-foreground border-primary shadow-xs shadow-primary/25 font-bold"
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
              <SelectTrigger className="h-9 rounded-xl bg-card border-border/80 hover:border-primary/30 text-xs min-w-[105px] sm:min-w-[125px] shadow-2xs transition-colors">
                <SortAsc className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl border-border/80 shadow-md">
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
            const vStyle = getViolationStyle(report.violationType);
            const previewText = cleanDescriptionPreview(report.description);
            return (
              <div
                key={report.id}
                onClick={() => openDetail(report)}
                className="rounded-2xl border border-border/80 bg-card hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group p-4 sm:p-5 shadow-2xs space-y-3 select-none active:scale-[0.99]"
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
                        <span className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {getViolationLabel(report.violationType)}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs inline-flex items-center shrink-0",
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
                    <span className="hidden sm:inline text-xs">View</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {previewText && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 font-normal">
                    {previewText}
                  </p>
                )}

                {report.adminResponse && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <MessageSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-foreground/90">
                        MENRO Response
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {report.adminResponse}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border/60 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-semibold text-foreground/90 bg-muted/60 border border-border/70 px-2.5 py-0.5 rounded-lg text-[11px]">
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
                    <span className="flex items-center gap-1 text-muted-foreground font-semibold shrink-0 text-xs">
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
      {!isLoading && total > 0 && (
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{firstReportNumber}–{lastReportNumber}</span> of <span className="font-semibold text-foreground">{total}</span> report{total !== 1 ? "s" : ""}
          </p>
          {totalPages > 1 && (
            <nav className="flex items-center gap-1" aria-label="Report pages">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((currentPage) => currentPage - 1)}
                className="size-9 rounded-xl inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer active:scale-95"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {paginationItems.map((item, index) => item === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="w-7 text-center text-xs text-muted-foreground">…</span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`size-9 rounded-xl text-xs font-semibold transition-all cursor-pointer active:scale-95 ${item === page ? "bg-primary/10 text-primary border border-primary/30 font-bold shadow-2xs" : "text-muted-foreground hover:text-foreground hover:bg-muted/80"}`}
                  aria-current={item === page ? "page" : undefined}
                >
                  {item}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                className="size-9 rounded-xl inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer active:scale-95"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
          )}
        </div>
      )}
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
    <div className="space-y-4 sm:space-y-5 pb-8 max-w-3xl mx-auto">
      {/* Back button & top status bar */}
      <div className="flex items-center justify-between gap-3">
        <BackButton label="Back to My Reports" onClick={onBack} />
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden sm:inline">Syncing...</span>
          </div>
        )}
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Unified Main Card */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-2xs divide-y divide-border/60 overflow-hidden">
        {/* Section 1: Header / Executive Overview */}
        <div className="p-5 sm:p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                Reference Number
              </span>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-mono font-bold text-foreground tracking-tight">
                  {report.referenceNumber}
                </h2>
                <button
                  type="button"
                  onClick={() => handleCopyReference(report.referenceNumber)}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer active:scale-95 border border-transparent hover:border-border/60"
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
                  "text-xs font-bold px-3 py-1 rounded-full border shadow-2xs inline-flex items-center shrink-0",
                  statusConf.className,
                )}
              >
                {statusConf.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground pt-0.5">
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
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Violation Details */}
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                Violation Type
              </span>
              <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/70 hover:border-border transition-colors">
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
              <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                Reported Location
              </span>
              <div className="flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/70 hover:border-border transition-colors">
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
          <div className="space-y-1.5 pt-2">
            <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Incident Description
            </span>
            <div className="max-h-56 overflow-y-auto p-4 rounded-xl bg-muted/30 dark:bg-muted/20 border border-border/70 text-sm text-foreground/90 leading-relaxed">
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
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                Photo Evidence
              </span>
              <span className="text-xs font-mono text-muted-foreground">
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
                  className="group relative size-18 sm:size-20 shrink-0 rounded-xl overflow-hidden border border-border/80 bg-muted/20 block hover:border-primary/40 hover:shadow-sm transition-all shadow-2xs"
                  title="View full image in new tab"
                >
                  <img
                    src={url}
                    alt={`Evidence ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs">
                      Enlarge
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Resolution / Progress Stepper & Timeline */}
        <div className="p-5 sm:p-6 space-y-5">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
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
                      "text-[10px] sm:text-xs transition-colors",
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
              <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
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
                      <p className="text-[10px] text-muted-foreground mt-0.5">
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
          <div className="p-5 sm:p-6 bg-muted/20 space-y-2 border-t border-border/60">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-[11px] uppercase tracking-wider font-bold text-foreground">
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
      <div className="space-y-3 pt-2">
        {report.status === "submitted" && onCancelReport && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            disabled={isCancelling}
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:bg-destructive/5 hover:border-destructive/25 transition-all duration-200 group active:scale-[0.99] cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:bg-muted/40 hover:border-foreground/20 transition-all duration-200 group active:scale-[0.99] cursor-pointer shadow-2xs"
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
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" />
              Cancel Report Submission
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel and withdraw report{" "}
              <strong className="text-foreground">{report.referenceNumber}</strong>?
              This will remove the report from MENRO's queue.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={isCancelling}
              className="rounded-xl"
            >
              Keep Report
            </Button>
            <Button
              variant="destructive"
              disabled={isCancelling}
              className="rounded-xl"
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
