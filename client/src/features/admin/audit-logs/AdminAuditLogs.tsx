import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { useAdminQuery } from "@/lib/adminQuery";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";


import { AuditLogsSkeleton } from "@/components/PageLoadingSkeletons";
import { adminAuditLogStyles as styles } from "@/components/communityContentStyles";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { toast } from "@/lib/toast";
import auditService from "@/services/auditService";
import { formatAuditEntry } from "./auditFormatter";
import AuditLogFilters from "./AuditLogFilters";
import AuditLogKPIs from "./AuditLogKPIs";
import AuditLogTable from "./AuditLogTable";

const PAGE_SIZE = 10;
const pageTitle = "Audit Logs";
const pageDescription = "Audit admin actions, system changes, and security events.";

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
  const totalPages = Math.max(1, visibleData?.totalPages ?? 1);
  const kpiData = visibleData?.kpis ?? { totalActions: 0, deletions: 0, criticalActions: 0, failedLogins: 0, modifications: 0 };
  useEffect(() => { if (query.data && currentPage > totalPages) setCurrentPage(totalPages); }, [query.data, currentPage, totalPages]);

  if (isInitialLoading) {
    return <AuditLogsSkeleton title={pageTitle} description={pageDescription} />;
  }

  if (!visibleData && query.error) {
    return <PageErrorState kind="unavailable" description="We couldn't load the audit records right now. Please try again." onRetry={() => void query.refetch()} retrying={query.isFetching} homeHref="/admin" />;
  }

  return (
    <div className={styles.page}>
      {/* ── Executive Page Header ── */}
      <ResidentPageHeader
        className="admin-module-header"
        title={pageTitle}
        description={pageDescription}
      />

      {query.error && <DataRefreshNotice message="Couldn't update audit logs. Showing the previous results, which may be outdated or differ from your filters." onRetry={() => void query.refetch()} retrying={query.isFetching} />}

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
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default AdminAuditLogs;
