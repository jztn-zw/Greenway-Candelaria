import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileText, RefreshCw, AlertTriangle } from "lucide-react";
import ReportKPIs from "./ReportKPIs";
import ReportFilters from "./ReportFilters";
import ReportListTable from "./ReportListTable";
import ReportDetailPanel from "./ReportDetailPanel";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  WasteReport,
  ReportPriority,
  VIOLATION_TYPE_TO_LABEL,
  VIOLATION_LABEL_TO_BACKEND,
  STATUS_TO_LABEL,
  STATUS_LABEL_TO_BACKEND,
  PRIORITY_TO_LABEL,
  PRIORITY_LABEL_TO_BACKEND,
} from "./types";
import { toast } from "sonner";
import {
  PageHeaderSkeleton,
  KPIRowSkeleton,
  ToolbarSkeleton,
  SplitPanelSkeleton,
} from "@/components/PageLoadingSkeletons";
import {
  fetchAdminReports,
  fetchAdminReportById,
  updateAdminReportStatus,
  updateAdminReportPriority,
  flagAdminReport,
  addAdminReportNote,
  deleteReport,
  type AdminReportItem,
  type AdminReportsKPIs,
} from "@/services/reportsService";
import { format } from "date-fns";

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
  priority: PRIORITY_TO_LABEL[r.priority] || "Medium",
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
  isFalseReport: Boolean(r.is_false),
});

const AdminWasteReports = () => {
  const [searchParams] = useSearchParams();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // List data
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [kpis, setKpis] = useState<AdminReportsKPIs | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  // Filter state
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [violationFilter, setViolationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Selection & Detail state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<WasteReport | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Search debounce ref
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load reports from API
  const loadReports = useCallback(
    async (currentPage = page, currentSearch = search) => {
      setIsTableLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {
          page: currentPage,
          limit: 10,
          sort: sortBy,
        };

        if (currentSearch.trim()) {
          params.search = currentSearch.trim();
        }

        if (statusFilter !== "all") {
          params.status = STATUS_LABEL_TO_BACKEND[statusFilter] || statusFilter;
        }

        if (violationFilter !== "all") {
          params.violation_type =
            VIOLATION_LABEL_TO_BACKEND[violationFilter] || violationFilter;
        }

        if (barangayFilter !== "all") {
          params.barangay = barangayFilter;
        }

        if (priorityFilter !== "all") {
          params.priority =
            PRIORITY_LABEL_TO_BACKEND[priorityFilter as ReportPriority] || priorityFilter;
        }

        if (dateRange.from) {
          params.date_from = dateRange.from.toISOString();
        }

        if (dateRange.to) {
          const to = new Date(dateRange.to);
          to.setHours(23, 59, 59, 999);
          params.date_to = to.toISOString();
        }

        const data = await fetchAdminReports(params);
        const mapped = data.reports.map(mapAdminReport);
        setReports(mapped);
        setTotal(data.total);
        setTotalPages(data.totalPages || 1);
        setKpis(data.kpis);

        // Keep selected report updated if it's in the list
        if (selectedId) {
          const found = mapped.find((r) => r.id === selectedId);
          if (found && !selectedReport?.internalNotes?.length) {
            setSelectedReport(found);
          }
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load waste reports.",
        );
      } finally {
        setIsTableLoading(false);
        setIsInitialLoading(false);
      }
    },
    [
      page,
      search,
      statusFilter,
      violationFilter,
      barangayFilter,
      priorityFilter,
      sortBy,
      dateRange,
      selectedId,
      selectedReport?.internalNotes?.length,
    ],
  );

  useEffect(() => {
    loadReports(page, search);
  }, [
    page,
    statusFilter,
    violationFilter,
    barangayFilter,
    priorityFilter,
    sortBy,
    dateRange,
  ]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      loadReports(1, value);
    }, 400);
  };

  // Select report and fetch full detail
  const handleSelectReport = async (id: string) => {
    setSelectedId(id);
    const existing = reports.find((r) => r.id === id);
    if (existing) {
      setSelectedReport(existing);
    }
    setIsLoadingDetail(true);
    try {
      const full = await fetchAdminReportById(id);
      setSelectedReport(mapAdminReport(full));
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load report details",
      );
    } finally {
      setIsLoadingDetail(false);
    }
  };

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
    try {
      const updated = await updateAdminReportStatus(selectedId, {
        status,
        admin_response: officialResponse,
      });
      const mapped = mapAdminReport(updated);
      setSelectedReport(mapped);
      toast.success(`Report status updated to ${mapped.status}`);
      loadReports();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update report status",
      );
      throw err;
    }
  };

  // Quick status change from table dropdown
  const handleQuickStatusChange = async (id: string, newStatus: string) => {
    try {
      const updated = await updateAdminReportStatus(id, { status: newStatus });
      const mapped = mapAdminReport(updated);
      toast.success(`Report ${mapped.referenceNumber} status updated to ${mapped.status}`);
      if (selectedId === id) {
        setSelectedReport(mapped);
      }
      loadReports();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  };

  // Priority update
  const handleUpdatePriority = async (priority: "LOW" | "MEDIUM" | "HIGH") => {
    if (!selectedId) return;
    try {
      const updated = await updateAdminReportPriority(selectedId, priority);
      const mapped = mapAdminReport(updated);
      setSelectedReport(mapped);
      toast.success(`Priority updated to ${mapped.priority}`);
      loadReports();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update priority",
      );
      throw err;
    }
  };

  // Internal Note add
  const handleAddNote = async (note: string) => {
    if (!selectedId) return;
    try {
      await addAdminReportNote(selectedId, note);
      // Re-fetch detail to get full populated note list
      const full = await fetchAdminReportById(selectedId);
      setSelectedReport(mapAdminReport(full));
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
  }) => {
    if (!selectedId) return;
    try {
      const updated = await flagAdminReport(selectedId, payload);
      const mapped = mapAdminReport(updated);
      setSelectedReport(mapped);
      toast.success("Report flag updated");
      loadReports();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update flag",
      );
      throw err;
    }
  };

  // Quick flag from table dropdown
  const handleQuickFlag = async (
    id: string,
    payload: { is_false?: boolean; is_duplicate?: boolean },
  ) => {
    try {
      const updated = await flagAdminReport(id, payload);
      const mapped = mapAdminReport(updated);
      toast.success(`Report ${mapped.referenceNumber} flagged`);
      if (selectedId === id) {
        setSelectedReport(mapped);
      }
      loadReports();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to flag report");
    }
  };

  // Delete report
  const handleDeleteReport = async (id: string) => {
    try {
      const res = await deleteReport(id);
      toast.success(`Report ${res.reference_number || "item"} deleted successfully`);
      setSelectedId(null);
      setSelectedReport(null);
      loadReports(page, search);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete report",
      );
      throw err;
    }
  };

  // Export CSV of loaded reports
  const handleExportCSV = () => {
    if (reports.length === 0) {
      toast.info("No reports to export");
      return;
    }
    const headers = [
      "Reference Number",
      "Violation Type",
      "Barangay",
      "Landmark",
      "Submitter",
      "Priority",
      "Status",
      "Date Submitted",
      "Description",
    ];

    const rows = reports.map((r) => [
      `"${r.referenceNumber}"`,
      `"${r.violationType}"`,
      `"${r.barangay}"`,
      `"${r.street || ""}"`,
      `"${r.submitterName}"`,
      `"${r.priority}"`,
      `"${r.status}"`,
      `"${r.submittedAt ? format(new Date(r.submittedAt), "yyyy-MM-dd HH:mm") : ""}"`,
      `"${r.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `greenway_waste_reports_${format(new Date(), "yyyyMMdd_HHmm")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded");
  };

  if (isInitialLoading && !error) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        <PageHeaderSkeleton />
        <KPIRowSkeleton count={4} />
        <ToolbarSkeleton />
        <SplitPanelSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 sm:space-y-6 pb-10">
      {/* ── Executive Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
              Waste Reports
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Monitor, manage, and dispatch waste collection and incident reports across Candelaria.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 rounded-xl font-semibold shadow-2xs gap-2 cursor-pointer active:scale-95 text-xs bg-card"
            onClick={handleExportCSV}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
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
              onClick={() => loadReports(page, search)}
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
          setSelectedId(null);
          setSelectedReport(null);
        }}
        barangayFilter={barangayFilter}
        onBarangayFilterChange={(b) => {
          setBarangayFilter(b);
          setPage(1);
        }}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={(p) => {
          setPriorityFilter(p);
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
          if (!open) {
            setSelectedId(null);
            setSelectedReport(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-card border-l border-border/80 shadow-2xl z-[100] focus:outline-none [&>button:last-child]:hidden"
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
              onClose={() => {
                setSelectedId(null);
                setSelectedReport(null);
              }}
              onUpdateStatus={handleUpdateStatus}
              onUpdatePriority={handleUpdatePriority}
              onAddNote={handleAddNote}
              onFlagReport={handleFlagReport}
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
