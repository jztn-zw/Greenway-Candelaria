import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import AuditLogKPIs from "./AuditLogKPIs";
import AuditLogFilters from "./AuditLogFilters";
import AuditLogTable from "./AuditLogTable";
import { toast } from "@/lib/toast";
import {
  PageHeaderSkeleton,
  KPIRowSkeleton,
  ToolbarSkeleton,
  TableSkeleton,
} from "@/components/PageLoadingSkeletons";
import auditService, {
  AuditLogKPIsData,
  AuditFilterOptions,
} from "@/services/auditService";
import { AuditLogEntry } from "./types";
import { formatAuditEntry } from "./auditFormatter";

const PAGE_SIZE = 10;

const AdminAuditLogs = () => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [currentPage, setCurrentPage] = useState(1);

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [kpiData, setKpiData] = useState<AuditLogKPIsData>({
    totalActions: 0,
    deletions: 0,
    criticalActions: 0,
    failedLogins: 0,
  });

  // Fetch paginated logs from backend
  const loadLogs = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setIsRefreshing(true);
      else setIsTableLoading(true);

      try {
        const fromStr = dateRange.from
          ? dateRange.from.toISOString().split("T")[0]
          : undefined;
        const toStr = dateRange.to
          ? dateRange.to.toISOString().split("T")[0]
          : undefined;

        const data = await auditService.fetchAuditLogs({
          page: currentPage,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          module: moduleFilter !== "all" ? moduleFilter : undefined,
          from: fromStr,
          to: toStr,
          sort: "newest",
        });

        const formatted = (data.logs || []).map(formatAuditEntry);
        setLogs(formatted);
        setTotalEntries(data.total || 0);
        setTotalPages(Math.max(1, data.totalPages || 1));
        if (data.kpis) {
          setKpiData(data.kpis);
        }
      } catch (err: any) {
        toast.error(err?.response?.data?.message || "Failed to load audit logs");
      } finally {
        setIsTableLoading(false);
        setIsRefreshing(false);
        setIsInitialLoading(false);
      }
    },
    [currentPage, search, moduleFilter, dateRange],
  );

  useEffect(() => {
    loadLogs(false);
  }, [loadLogs]);

  const handleExport = () => {
    if (logs.length === 0) {
      toast.error("No log entries to export");
      return;
    }

    const headers = [
      "Timestamp",
      "Admin Name",
      "Admin Role",
      "Action",
      "Module",
      "Affected Record",
      "Summary",
      "IP Address",
    ];

    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.adminName}"`,
      `"${l.adminRole}"`,
      `"${l.actionType}"`,
      `"${l.module}"`,
      `"${l.affectedRecord}"`,
      `"${l.summary.replace(/"/g, '""')}"`,
      `"${l.ipAddress}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `greenway_audit_logs_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV exported successfully", {
      description: `${logs.length} entries exported to CSV.`,
    });
  };

  // Centered pagination page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  if (isInitialLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        <PageHeaderSkeleton />
        <KPIRowSkeleton count={4} />
        <ToolbarSkeleton />
        <TableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-7 pb-10">
      {/* ── Executive Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
                Audit Logs
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                Tamper-Proof
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Track, investigate, and audit all administrative actions, system modifications, and security events across GreenWay.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 rounded-xl font-semibold shadow-2xs gap-2 cursor-pointer active:scale-95 text-xs bg-card"
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Executive Security Metric Strip ── */}
      <AuditLogKPIs logs={logs} kpiData={kpiData} />

      {/* ── Search, Module, & Date Range Toolbar ── */}
      <AuditLogFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setCurrentPage(1);
        }}
        moduleFilter={moduleFilter}
        onModuleFilterChange={(v) => {
          setModuleFilter(v);
          setCurrentPage(1);
        }}
        dateRange={dateRange}
        onDateRangeChange={(v) => {
          setDateRange(v);
          setCurrentPage(1);
        }}
      />

      {/* ── Audit Logs Directory Table ── */}
      <div className="space-y-4">
        <AuditLogTable
          logs={logs}
          isLoading={isTableLoading}
        />

        {/* ── Centered Numbered Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg cursor-pointer transition-all active:scale-95 focus:outline-none"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {getPageNumbers().map((pageNum, idx) => {
              if (pageNum === "...") {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 text-xs text-muted-foreground">
                    ...
                  </span>
                );
              }
              const isCurrent = pageNum === currentPage;
              return (
                <Button
                  key={pageNum}
                  variant={isCurrent ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs rounded-lg cursor-pointer transition-all active:scale-95 focus:outline-none font-medium"
                  onClick={() => setCurrentPage(pageNum as number)}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg cursor-pointer transition-all active:scale-95 focus:outline-none"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogs;
