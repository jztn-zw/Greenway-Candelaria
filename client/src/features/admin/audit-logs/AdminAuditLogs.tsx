import { useAdminQuery } from "@/lib/adminQuery";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";


import { AuditLogsSkeleton } from "@/components/PageLoadingSkeletons";
import PageErrorState from "@/components/PageErrorState";
import { toast } from "@/lib/toast";
import auditService from "@/services/auditService";
import { formatAuditEntry } from "./auditFormatter";
import AuditLogFilters from "./AuditLogFilters";
import AuditLogKPIs from "./AuditLogKPIs";
import AuditLogTable from "./AuditLogTable";

const PAGE_SIZE = 10;
const pageTitle = "Audit Logs";
const pageDescription = "Track, investigate, and audit all administrative actions, system modifications, and security events across GreenWay.";

const AdminAuditLogs = () => {
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [currentPage, setCurrentPage] = useState(1);

  const query = useAdminQuery("audit", [currentPage, search.trim(), moduleFilter, dateRange], () => auditService.fetchAuditLogs({
    page: currentPage, limit: PAGE_SIZE, search: search.trim() || undefined,
    module: moduleFilter !== "all" ? moduleFilter : undefined,
    from: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    to: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined, sort: "newest",
  }));
  const lastDataRef = useRef(query.data);
  if (query.data) lastDataRef.current = query.data;
  const visibleData = query.data ?? lastDataRef.current;
  const isInitialLoading = !visibleData && !query.isError;
  const isTableLoading = query.isLoading;
  const logs = (visibleData?.logs ?? []).map(formatAuditEntry);
  const totalEntries = visibleData?.total ?? 0;
  const totalPages = Math.max(1, visibleData?.totalPages ?? 1);
  const kpiData = visibleData?.kpis ?? { totalActions: 0, deletions: 0, criticalActions: 0, failedLogins: 0, modifications: 0 };
  useEffect(() => { if (query.data && currentPage > totalPages) setCurrentPage(totalPages); }, [query.data, currentPage, totalPages]);
  useEffect(() => { if (query.error) toast.error(query.error.message); }, [query.error]);

  if (isInitialLoading) {
    return <AuditLogsSkeleton title={pageTitle} description={pageDescription} />;
  }

  if (!visibleData && query.error) {
    return <PageErrorState kind="unavailable" title="Audit logs couldn't load" description="We couldn't load the audit records right now. Please try again." onRetry={() => void query.refetch()} homeHref="/admin" />;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 sm:space-y-7 pb-10">
      {/* ── Executive Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
              {pageTitle}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {pageDescription}
          </p>
        </div>


      </div>

      {query.error && !query.data && visibleData && (
        <p role="alert" className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
          Could not update audit logs. Showing the previous results.
        </p>
      )}

      {/* ── Executive Security Metric Strip ── */}
      <AuditLogKPIs kpiData={kpiData} />

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
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={totalEntries}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default AdminAuditLogs;
