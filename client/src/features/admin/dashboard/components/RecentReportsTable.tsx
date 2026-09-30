import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardReport } from "./useAdminDashboard";
import { formatRelativeTime } from "@/utils/date";

const statusStyles: Record<string, { badge: string; dot: string }> = {
  Pending: {
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
  },
  "Under Review": {
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
  },
  Dispatched: {
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    dot: "bg-purple-500",
  },
  Resolved: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
};

const violationStyles: Record<string, string> = {
  "Illegal Dumping": "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  "Missed Collection": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  "Overflowing Bin": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  "Improper Segregation": "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  "Open Burning": "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  Littering: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  Other: "bg-muted text-muted-foreground border-border/80",
};

const formatViolationType = (t: string) => {
  if (!t) return "Incident";
  const upper = t.toUpperCase().trim();
  if (upper === "ILLEGAL_DUMPING") return "Illegal Dumping";
  if (upper === "MISSED_COLLECTION") return "Missed Collection";
  if (upper === "OVERFLOWING_BIN") return "Overflowing Bin";
  if (upper === "IMPROPER_SEGREGATION") return "Improper Segregation";
  if (upper === "OPEN_BURNING") return "Open Burning";
  if (upper === "LITTERING") return "Littering";
  if (upper === "OTHER") return "Other";
  return t
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatStatusLabel = (s: string) => {
  if (!s) return "Pending";
  const upper = s.toUpperCase();
  if (upper === "SUBMITTED") return "Pending";
  if (upper === "UNDER_REVIEW") return "Under Review";
  if (upper === "DISPATCHED") return "Dispatched";
  if (upper === "RESOLVED") return "Resolved";
  return s;
};

interface RecentReportsTableProps {
  reports?: DashboardReport[];
  className?: string;
}

const RecentReportsTable = ({ reports: liveReports, className = "" }: RecentReportsTableProps) => {
  const navigate = useNavigate();

  const displayReports = (liveReports ?? []).map((r) => ({
    id: r.id,
    ref: r.reference_number || r.id?.slice(0, 8)?.toUpperCase() || "WR-REF",
    type: formatViolationType(r.violation_type),
    barangay: r.barangay_name || "Location unavailable",
    date: formatRelativeTime(r.created_at, { emptyLabel: "Time unavailable" }),
    status: formatStatusLabel(r.status),
    reporter: r.reporter_name || "Resident",
  }));

  return (
    <div
      className={`bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs flex flex-col min-w-0 h-full ${className}`}
    >
      <div className="min-w-0">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 sm:mb-4 sm:pb-4">
          <h3 className="text-base sm:text-lg font-bold text-foreground font-display tracking-tight">
            Recent Incident Reports
          </h3>

          <Button
            variant="ghost"
            size="sm"
            className="group inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-primary transition-all hover:bg-primary/10 hover:text-primary active:scale-95 cursor-pointer"
            onClick={() => navigate("/admin/reports")}
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Button>
        </div>

        {/* Table Container */}
        <div className="border border-border/60 rounded-xl overflow-hidden bg-muted/20">
          <div className="overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader className="bg-muted/30 border-b border-border/60">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-10 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 sm:px-4">
                    Ref ID
                  </TableHead>
                  <TableHead className="h-10 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 sm:px-4">
                    Type
                  </TableHead>
                  <TableHead className="h-10 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 sm:px-4">
                    Barangay
                  </TableHead>
                  <TableHead className="hidden sm:table-cell h-10 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 sm:px-4">
                    Time
                  </TableHead>
                  <TableHead className="h-10 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2.5 px-3 sm:px-4 text-right sm:text-left">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayReports.length === 0 ? (
                  <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center">
                      <Inbox className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-foreground">
                        No recent reports submitted
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        New community waste reports appear after the next refresh.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayReports.map((r) => {
                    const statusMeta = statusStyles[r.status] || statusStyles.Pending;
                    const violationStyle = violationStyles[r.type] || violationStyles.Other;

                    return (
                      <TableRow
                        key={r.id}
                        onClick={() => navigate(r.id ? `/admin/reports?report=${r.id}` : "/admin/reports")}
                        className="border-border/60 cursor-pointer hover:bg-muted/40 transition-colors group"
                      >
                        {/* Ref ID */}
                        <TableCell className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                          <span className="text-xs font-mono font-medium tabular-nums text-foreground group-hover:text-primary transition-colors">
                            {r.ref}
                          </span>
                        </TableCell>

                        {/* Violation Type — Clean formatted badge matching the reports manager */}
                        <TableCell className="py-3.5 px-3 sm:px-4">
                          <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${violationStyle}`}>
                            {r.type}
                          </span>
                        </TableCell>

                        {/* Barangay */}
                        <TableCell className="py-3.5 px-3 sm:px-4 text-xs text-muted-foreground font-medium whitespace-nowrap">
                          <span className="text-foreground font-medium">{r.barangay}</span>
                        </TableCell>

                        {/* Time */}
                        <TableCell className="hidden sm:table-cell py-3.5 px-3 sm:px-4 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                          {r.date}
                        </TableCell>

                        {/* Status with colored indicator dot */}
                        <TableCell className="py-3.5 px-3 sm:px-4 text-right sm:text-left">
                          <Badge
                            variant="outline"
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 whitespace-nowrap ${statusMeta.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                            <span>{r.status}</span>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentReportsTable;
