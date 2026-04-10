import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import AuditLogKPIs from "./AuditLogKPIs";
import AuditLogFilters from "./AuditLogFilters";
import AuditLogTable from "./AuditLogTable";
import { mockAuditLogs } from "./mockData";
import { toast } from "sonner";
import {
  PageHeaderSkeleton, AuditLogsSkeleton,
} from "@/components/PageLoadingSkeletons";

const PAGE_SIZE = 50;

const AdminAuditLogs = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [currentPage, setCurrentPage] = useState(1);

  const filteredLogs = useMemo(() => {
    let result = [...mockAuditLogs];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.adminName.toLowerCase().includes(q) ||
          l.affectedRecord.toLowerCase().includes(q) ||
          l.summary.toLowerCase().includes(q)
      );
    }

    if (moduleFilter !== "all")
      result = result.filter((l) => l.module === moduleFilter);
    if (actionFilter !== "all")
      result = result.filter((l) => l.actionType === actionFilter);
    if (adminFilter !== "all")
      result = result.filter((l) => l.adminName === adminFilter);

    if (dateRange.from) {
      result = result.filter(
        (l) => new Date(l.timestamp) >= dateRange.from!
      );
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59);
      result = result.filter((l) => new Date(l.timestamp) <= to);
    }

    // Newest first
    result.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return result;
  }, [search, moduleFilter, actionFilter, adminFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));

  const handleExport = () => {
    toast.success("CSV exported successfully", {
      description: `${filteredLogs.length} log entries exported`,
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-5">
        <PageHeaderSkeleton />
        <AuditLogsSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground font-display">Audit Logs</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                  Super Admin Only
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {mockAuditLogs.length} total entries • {filteredLogs.length} shown • Tamper-proof system log
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-2" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <AuditLogKPIs logs={filteredLogs} />

      {/* Filters */}
      <Card className="p-4">
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
          actionFilter={actionFilter}
          onActionFilterChange={(v) => {
            setActionFilter(v);
            setCurrentPage(1);
          }}
          adminFilter={adminFilter}
          onAdminFilterChange={(v) => {
            setAdminFilter(v);
            setCurrentPage(1);
          }}
          dateRange={dateRange}
          onDateRangeChange={(v) => {
            setDateRange(v);
            setCurrentPage(1);
          }}
        />
      </Card>

      {/* Log Table */}
      <Card className="overflow-hidden">
        <AuditLogTable
          logs={filteredLogs}
          currentPage={currentPage}
          pageSize={PAGE_SIZE}
        />

        {/* Pagination */}
        {filteredLogs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              Showing{" "}
              {Math.min(
                (currentPage - 1) * PAGE_SIZE + 1,
                filteredLogs.length
              )}
              –{Math.min(currentPage * PAGE_SIZE, filteredLogs.length)} of{" "}
              {filteredLogs.length} entries
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminAuditLogs;
