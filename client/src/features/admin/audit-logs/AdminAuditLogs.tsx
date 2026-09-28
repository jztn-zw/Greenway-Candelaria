import { useAdminQuery } from "@/lib/adminQuery";
import { format } from "date-fns";
import { useEffect, useState } from "react";


import {
KPIRowSkeleton,
PageHeaderSkeleton,
TableSkeleton,
ToolbarSkeleton,
} from "@/components/PageLoadingSkeletons";
import { toast } from "@/lib/toast";
import auditService from "@/services/auditService";
import { formatAuditEntry } from "./auditFormatter";
import AuditLogFilters from "./AuditLogFilters";
import AuditLogKPIs from "./AuditLogKPIs";
import AuditLogTable from "./AuditLogTable";

const PAGE_SIZE = 10;

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
  const isInitialLoading = query.isLoading;
  const isTableLoading = query.isFetching;
  const logs = (query.data?.logs ?? []).map(formatAuditEntry);
  const totalEntries = query.data?.total ?? 0;
  const totalPages = Math.max(1, query.data?.totalPages ?? 1);
  const kpiData = query.data?.kpis ?? { totalActions: 0, deletions: 0, criticalActions: 0, failedLogins: 0, modifications: 0 };
  useEffect(() => { if (query.data && currentPage > totalPages) setCurrentPage(totalPages); }, [query.data, currentPage, totalPages]);
  useEffect(() => { if (query.error) toast.error(query.error.message); }, [query.error]);

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
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-foreground tracking-tight">
              Audit Logs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Track, investigate, and audit all administrative actions, system modifications, and security events across GreenWay.
          </p>
        </div>


      </div>

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
