import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";
import ReportKPIs from "./ReportKPIs";
import ReportFilters from "./ReportFilters";
import ReportListTable from "./ReportListTable";
import ReportDetailPanel from "./ReportDetailPanel";
import { mockReports } from "./mockData";
import { WasteReport, ReportPriority } from "./types";
import { toast } from "sonner";
import {
  PageHeaderSkeleton, KPIRowSkeleton, ToolbarSkeleton, SplitPanelSkeleton,
} from "@/components/PageLoadingSkeletons";

const AdminWasteReports = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [violationFilter, setViolationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const filteredReports = useMemo(() => {
    let result = [...mockReports];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.referenceNumber.toLowerCase().includes(q) ||
          r.barangay.toLowerCase().includes(q)
      );
    }

    // Filters
    if (violationFilter !== "all") result = result.filter((r) => r.violationType === violationFilter);
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (barangayFilter !== "all") result = result.filter((r) => r.barangay === barangayFilter);
    if (priorityFilter !== "all") result = result.filter((r) => r.priority === priorityFilter);

    // Date range
    if (dateRange.from) {
      result = result.filter((r) => new Date(r.submittedAt) >= dateRange.from!);
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59);
      result = result.filter((r) => new Date(r.submittedAt) <= to);
    }

    // Sort
    const priorityOrder: Record<ReportPriority, number> = { High: 0, Medium: 1, Low: 2 };
    const statusOrder: Record<string, number> = { Submitted: 0, "Under Review": 1, Dispatched: 2, Resolved: 3 };

    switch (sortBy) {
      case "date-asc":
        result.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
        break;
      case "status":
        result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
        break;
      case "violation":
        result.sort((a, b) => a.violationType.localeCompare(b.violationType));
        break;
      case "priority":
        result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
      default:
        result.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }

    return result;
  }, [search, violationFilter, statusFilter, barangayFilter, priorityFilter, sortBy, dateRange]);

  const selectedReport = selectedId ? mockReports.find((r) => r.id === selectedId) || null : null;

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-5">
        <PageHeaderSkeleton />
        <KPIRowSkeleton count={4} />
        <ToolbarSkeleton />
        <SplitPanelSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Waste Reports</h1>
              <p className="text-sm text-muted-foreground">{mockReports.length} total reports • {filteredReports.length} shown</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-2"
            onClick={() => toast.success("CSV exported successfully")}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <ReportKPIs reports={mockReports} />

      {/* Filters */}
      <Card className="p-4">
        <ReportFilters
          search={search}
          onSearchChange={setSearch}
          violationFilter={violationFilter}
          onViolationFilterChange={setViolationFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          barangayFilter={barangayFilter}
          onBarangayFilterChange={setBarangayFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
        />
      </Card>

      {/* Split panel: Table + Detail */}
      <div className="flex gap-5 items-start">
        {/* Report list */}
        <Card className="flex-1 min-w-0 overflow-hidden">
          <ReportListTable
            reports={filteredReports}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </Card>

        {/* Detail panel — desktop only as side panel */}
        <div className="hidden lg:block w-[420px] shrink-0 sticky top-4">
          <ReportDetailPanel key={selectedId} report={selectedReport} />
        </div>
      </div>

      {/* Mobile detail panel */}
      {selectedReport && (
        <div className="lg:hidden">
          <ReportDetailPanel key={selectedId} report={selectedReport} />
        </div>
      )}
    </div>
  );
};

export default AdminWasteReports;
