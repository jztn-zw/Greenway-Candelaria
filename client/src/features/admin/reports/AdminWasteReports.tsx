import { WasteReportsPageSkeleton } from "@/components/PageLoadingSkeletons";
import { Button } from "@/components/ui/button";
import {
Sheet,
SheetContent,
SheetDescription,
SheetTitle,
} from "@/components/ui/sheet";
import { useAdminFetch, useAdminMutation, useAdminQuery } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import {
addAdminReportNote as apiaddAdminReportNote,
deleteReport as apideleteReport,
flagAdminReport as apiflagAdminReport,
updateAdminReportStatus as apiupdateAdminReportStatus,
fetchAdminReportById,
fetchAdminReports,
type AdminReportItem,
type AdminReportsKPIs,
type AdminReportsParams,
} from "@/services/reportsService";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ReportDetailPanel from "./ReportDetailPanel";
import ReportFilters from "./ReportFilters";
import ReportKPIs from "./ReportKPIs";
import ReportListTable from "./ReportListTable";
import {
STATUS_LABEL_TO_BACKEND,
STATUS_TO_LABEL,
VIOLATION_LABEL_TO_BACKEND,
VIOLATION_TYPE_TO_LABEL,
WasteReport,
} from "./types";
const mapAdminReport = (r: AdminReportItem): WasteReport => ({
  id: r.id,
  referenceNumber: r.reference_number,
  violationType: VIOLATION_TYPE_TO_LABEL[r.violation_type] || "Other",
  violationTypeRaw: r.violation_type,
  barangay: r.barangay_name,
  barangayId: r.barangay_id,
  street: r.landmark || undefined,
  description: r.description,
  submittedAt: r.created_at,
  submitterName: r.reporter_name || "Resident",
  submitterEmail: r.reporter_email || undefined,
  photos: (r.photos || []).map((p) => ({
    id: p.id,
    url: p.url,
  })),
  status: STATUS_TO_LABEL[r.status] || "Submitted",
  statusHistory: (r.status_history || []).map((h) => ({
    id: h.id,
    status: STATUS_TO_LABEL[h.status] || "Submitted",
    timestamp: h.created_at,
    adminName: h.changed_by_name || "System",
  })),
  officialResponse: r.admin_response || undefined,
  internalNotes: (r.internal_notes || []).map((n) => ({
    id: n.id,
    text: n.note,
    timestamp: n.created_at,
    adminName: n.created_by_name || "Admin",
  })),
  isDuplicate: Boolean(r.is_duplicate),
  duplicateOfId: r.duplicate_of_id || undefined,
  duplicateOfReference: r.duplicate_of_reference || undefined,
  duplicateReason: r.duplicate_reason || undefined,
  falseReason: r.false_reason || undefined,
  isFalseReport: Boolean(r.is_false),
});

const pageTitle = "Waste Reports";
const pageDescription = "Monitor, manage, and dispatch waste collection and incident reports across Candelaria.";

const AdminWasteReports = () => {
  const updateAdminReportStatus = useAdminMutation(apiupdateAdminReportStatus, "reports", "residents", "notifications");
  const addAdminReportNote = useAdminMutation(apiaddAdminReportNote, "reports", "residents", "notifications");
  const flagAdminReport = useAdminMutation(apiflagAdminReport, "reports", "residents", "notifications");
  const deleteReport = useAdminMutation(apideleteReport, "reports", "residents", "notifications");
  const [searchParams] = useSearchParams();

  // List data
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [kpis, setKpis] = useState<AdminReportsKPIs | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);


  // Filter state
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [appliedSearch, setAppliedSearch] = useState(() => searchParams.get("search") ?? "");
  const [violationFilter, setViolationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Selection & Detail state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<WasteReport | null>(null);
  const [isFlagDialogOpen, setIsFlagDialogOpen] = useState(false);
  const notificationReportId = searchParams.get("report");

  const detailVersionRef = useRef(0);
  const openedNotificationIdRef = useRef<string | null>(null);

  const closeReport = () => {
    detailVersionRef.current += 1;
    setSelectedId(null);
    setSelectedReport(null);
  };

  const buildReportParams = useCallback((requestedPage: number, limit: number): AdminReportsParams => {
    const params: AdminReportsParams = {
      page: requestedPage,
      limit,
      sort: sortBy,
    };

    if (appliedSearch.trim()) params.search = appliedSearch.trim();
    if (statusFilter !== "all") params.status = STATUS_LABEL_TO_BACKEND[statusFilter] || statusFilter;
    if (violationFilter !== "all") {
      params.violation_type = VIOLATION_LABEL_TO_BACKEND[violationFilter] || violationFilter;
    }
    if (barangayFilter !== "all") params.barangay = barangayFilter;
    if (dateRange.from) params.date_from = dateRange.from.toISOString();
    if (dateRange.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      params.date_to = to.toISOString();
    }
    return params;
  }, [appliedSearch, statusFilter, violationFilter, barangayFilter, sortBy, dateRange]);

  const fetchAdmin = useAdminFetch();
  const reportParams = buildReportParams(page, 10);
  const listQuery = useAdminQuery("reports", ["list", reportParams], () => fetchAdminReports(reportParams));
  const hasLoadedRef = useRef(false);
  if (listQuery.isSuccess) hasLoadedRef.current = true;
  const isInitialLoading = !hasLoadedRef.current && !listQuery.isError;
  // Background live-sync refreshes retain the loaded table. Only a filter
  // without cached data needs row skeletons after the first page load.
  const isTableLoading = listQuery.isLoading;
  const error = listQuery.error?.message ?? null;
  const loadReports = listQuery.refetch;
  useLayoutEffect(() => {
    const data = listQuery.data;
    if (!data) return;
    setReports(data.reports.map(mapAdminReport)); setTotal(data.total);
    setTotalPages(data.totalPages || 1); setKpis(data.kpis);
    if (data.page !== page) setPage(data.page);
  }, [listQuery.data, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setAppliedSearch(search.trim());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const handleSearchChange = (value: string) => setSearch(value);

  // The selected detail observes the same invalidation events as the list.
  const detailQuery = useAdminQuery("reports", ["detail", selectedId],
    () => fetchAdminReportById(selectedId!), { enabled: !!selectedId });
  const isLoadingDetail = detailQuery.isLoading;
  useEffect(() => {
    if (selectedId && detailQuery.data?.id === selectedId) setSelectedReport(mapAdminReport(detailQuery.data));
  }, [selectedId, detailQuery.data]);
  useEffect(() => {
    if (detailQuery.error) toast.error(detailQuery.error.message);
  }, [detailQuery.error]);
  const handleSelectReport = useCallback((id: string) => {
    detailVersionRef.current += 1;
    setSelectedId(id);
    setSelectedReport(reports.find((report) => report.id === id) ?? null);
  }, [reports]);

  // A report notification links directly to this detail panel. If the report
  // was deleted or is otherwise unavailable, keep the user on the valid
  // reports page rather than leaving an empty or broken detail target.
  useEffect(() => {
    if (!notificationReportId || openedNotificationIdRef.current === notificationReportId) return;
    openedNotificationIdRef.current = notificationReportId;
    void handleSelectReport(notificationReportId);
  }, [notificationReportId, handleSelectReport]);

  const selectedReportIndex = reports.findIndex((report) => report.id === selectedId);
  const selectPreviousReport = () => {
    if (selectedReportIndex > 0) handleSelectReport(reports[selectedReportIndex - 1].id);
  };
  const selectNextReport = () => {
    if (selectedReportIndex >= 0 && selectedReportIndex < reports.length - 1) {
      handleSelectReport(reports[selectedReportIndex + 1].id);
    }
  };

  // Status & Official Response update
  const handleUpdateStatus = async (
    status: string,
    officialResponse?: string,
  ) => {
    if (!selectedId) return;
    const reportId = selectedId;
    const detailVersion = detailVersionRef.current;
    try {
      const updated = await updateAdminReportStatus(reportId, {
        status,
        admin_response: officialResponse,
      });
      const mapped = mapAdminReport(updated);
      if (detailVersion === detailVersionRef.current) setSelectedReport(mapped);
      toast.success(`Report status updated to ${mapped.status}`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update report status",
      );
      throw err;
    }
  };

  // Quick status change from table dropdown
  const handleQuickStatusChange = async (id: string, newStatus: string) => {
    const detailVersion = detailVersionRef.current;
    try {
      const updated = await updateAdminReportStatus(id, { status: newStatus });
      const mapped = mapAdminReport(updated);
      toast.success(`Report ${mapped.referenceNumber} status updated to ${mapped.status}`);
      if (selectedId === id && detailVersion === detailVersionRef.current) {
        setSelectedReport(mapped);
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  };

  // Internal Note add
  const handleAddNote = async (note: string) => {
    if (!selectedId) return;
    const reportId = selectedId;
    const detailVersion = detailVersionRef.current;
    try {
      await addAdminReportNote(reportId, note);
      // Re-fetch detail to get full populated note list
      if (detailVersion === detailVersionRef.current) {
        const full = await fetchAdmin("reports", ["detail", reportId], () => fetchAdminReportById(reportId));
        if (detailVersion === detailVersionRef.current) {
          setSelectedReport(mapAdminReport(full));
        }
      }
      toast.success("Internal note added successfully");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add internal note",
      );
      throw err;
    }
  };

  // Flag duplicate / false report
  const handleFlagReport = async (payload: {
    is_false?: boolean;
    is_duplicate?: boolean;
    duplicate_of_reference?: string;
    duplicate_reason?: string;
    false_reason?: string;
    resolve?: boolean;
  }) => {
    if (!selectedId) return;
    const reportId = selectedId;
    const detailVersion = detailVersionRef.current;
    const updated = await flagAdminReport(reportId, payload);
    const mapped = mapAdminReport(updated);
    if (detailVersion === detailVersionRef.current) setSelectedReport(mapped);
  };

  // Quick flag from table dropdown
  const handleQuickFlag = async (
    id: string,
    payload: { is_false?: boolean; is_duplicate?: boolean },
  ) => {
    const detailVersion = detailVersionRef.current;
    try {
      const updated = await flagAdminReport(id, payload);
      const mapped = mapAdminReport(updated);
      toast.success(`Report ${mapped.referenceNumber} flagged`);
      if (selectedId === id && detailVersion === detailVersionRef.current) {
        setSelectedReport(mapped);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to flag report");
    }
  };

  // Delete report
  const handleDeleteReport = async (id: string) => {
    const detailVersion = detailVersionRef.current;
    try {
      const res = await deleteReport(id);
      toast.success(`Report ${res.reference_number || "item"} removed from active lists`);
      if (selectedId === id && detailVersion === detailVersionRef.current) {
        closeReport();
      }
      if (reports.length === 1 && reports[0].id === id && page > 1) {
        setPage(page - 1);
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete report",
      );
      throw err;
    }
  };

  if (isInitialLoading) {
    return <WasteReportsPageSkeleton title={pageTitle} description={pageDescription} />;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 sm:space-y-6 pb-10">
      {/* ── Executive Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
            {pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {pageDescription}
          </p>
        </div>


      </div>

      {/* ── Error State Banner ── */}
      {error && (
        <div className="border border-destructive/20 bg-destructive/5 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-destructive">
                  Failed to load waste reports
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadReports()}
              className="h-9 px-3 text-xs rounded-xl gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </Button>
          </div>
        </div>
      )}

      {/* ── Executive 4-Card KPI Strip ── */}
      <ReportKPIs kpis={kpis} reports={reports} />

      {/* ── Modernized Filter Toolbar (Directly on Canvas) ── */}
      <ReportFilters
        search={search}
        onSearchChange={handleSearchChange}
        violationFilter={violationFilter}
        onViolationFilterChange={(v) => {
          setViolationFilter(v);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(s) => {
          setStatusFilter(s);
          setPage(1);
          closeReport();
        }}
        barangayFilter={barangayFilter}
        onBarangayFilterChange={(b) => {
          setBarangayFilter(b);
          setPage(1);
        }}
        sortBy={sortBy}
        onSortByChange={(s) => {
          setSortBy(s);
          setPage(1);
        }}
        dateRange={dateRange}
        onDateRangeChange={(range) => {
          setDateRange(range);
          setPage(1);
        }}
        kpis={kpis}
        total={total}
      />

      {/* ── Waste Reports Table (100% Full Width) ── */}
      <div className="w-full">
        <ReportListTable
          reports={reports}
          selectedId={selectedId}
          onSelect={handleSelectReport}
          isLoading={isTableLoading}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          onQuickStatusChange={handleQuickStatusChange}
          onFlagReport={handleQuickFlag}
        />
      </div>

      {/* ── Slide-Over Inspector Drawer (Right Sheet) ── */}
      <Sheet
        open={Boolean(selectedReport)}
        onOpenChange={(open) => {
          if (!open) closeReport();
        }}
      >
        <SheetContent
          side="right"
          className={`w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-card border-l border-border/80 shadow-2xl z-[100] focus:outline-none [&>button:last-child]:hidden transition-transform duration-300 ${isFlagDialogOpen ? "translate-x-full pointer-events-none" : ""}`}
        >
          <SheetTitle className="sr-only">Waste Report Details</SheetTitle>
          <SheetDescription className="sr-only">
            Inspect details, evidence photos, and admin actions for waste report
          </SheetDescription>
          {selectedReport && (
            <ReportDetailPanel
              key={selectedReport.id}
              report={selectedReport}
              isLoading={isLoadingDetail}
              onClose={closeReport}
              onUpdateStatus={handleUpdateStatus}
              onAddNote={handleAddNote}
              onFlagReport={handleFlagReport}
              onFlagDialogOpenChange={setIsFlagDialogOpen}
              onDeleteReport={handleDeleteReport}
              onPrevious={selectPreviousReport}
              onNext={selectNextReport}
              hasPrevious={selectedReportIndex > 0}
              hasNext={selectedReportIndex >= 0 && selectedReportIndex < reports.length - 1}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminWasteReports;
