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
import { FileText, ArrowRight, Eye, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardReport } from "./useAdminDashboard";
import { formatRelativeTime } from "@/utils/date";

const statusStyles: Record<string, string> = {
  Pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  "Under Review": "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
  Dispatched: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
  Resolved: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  SUBMITTED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  UNDER_REVIEW: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
  DISPATCHED: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
  RESOLVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
};

const priorityStyles: Record<string, string> = {
  High: "bg-destructive/10 text-destructive border-destructive/25 font-bold",
  Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 font-semibold",
  Low: "bg-muted text-muted-foreground border-border/60",
  HIGH: "bg-destructive/10 text-destructive border-destructive/25 font-bold",
  MEDIUM: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 font-semibold",
  LOW: "bg-muted text-muted-foreground border-border/60",
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

const formatPriorityLabel = (p: string) => {
  if (!p) return "Low";
  const upper = p.toUpperCase();
  if (upper === "HIGH") return "High";
  if (upper === "MEDIUM") return "Medium";
  return "Low";
};

interface RecentReportsTableProps {
  reports?: DashboardReport[];
  className?: string;
}

const RecentReportsTable = ({ reports: liveReports, className = "" }: RecentReportsTableProps) => {
  const navigate = useNavigate();

  const displayReports = (liveReports ?? []).map((r) => ({
        ref: r.reference_number || r.id?.slice(0, 8)?.toUpperCase() || "WR-REF",
        type: r.violation_type || "Waste Incident",
        barangay: r.barangay_name || "Candelaria",
        date: formatRelativeTime(r.created_at, { emptyLabel: "Recently" }),
        priority: formatPriorityLabel(r.priority),
        status: formatStatusLabel(r.status),
        reporter: r.reporter_name || "Resident",
      }));

  return (
    <div
      className={`bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between h-full ${className}`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground font-display">
                Recent Incident Reports
              </h3>
              <p className="text-xs text-muted-foreground">
                Live community submissions & waste reports
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary font-semibold h-8 px-3 gap-1.5 hover:bg-primary/10 hover:text-primary rounded-xl cursor-pointer group active:scale-95 transition-all"
            onClick={() => navigate("/admin/reports")}
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Button>
        </div>

        {/* Table Container */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-background">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40 border-b border-border/80">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3 pl-4">
                    Ref ID
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">
                    Barangay
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">
                    Time
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">
                    Priority
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-3">
                    Status
                  </TableHead>
                  <TableHead className="w-10 text-right pr-4 py-3"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center">
                      <Inbox className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-foreground">No incident reports yet</p>
                      <p className="text-[11px] text-muted-foreground mt-1">New resident submissions will appear here.</p>
                    </TableCell>
                  </TableRow>
                ) : displayReports.map((r) => (
                  <TableRow
                    key={r.ref}
                    className="border-b border-border/60 hover:bg-muted/30 transition-colors group cursor-pointer"
                    onClick={() => navigate("/admin/reports")}
                  >
                    <TableCell className="py-2.5 pl-4">
                      <span className="font-mono text-xs font-semibold text-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/60">
                        {r.ref}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs font-medium text-foreground">
                      {r.type}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-muted-foreground">
                      {r.barangay}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-2.5 text-xs text-muted-foreground">
                      {r.date}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 rounded-full border shadow-2xs ${priorityStyles[r.priority] || priorityStyles.Low}`}
                      >
                        {r.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs ${statusStyles[r.status] || statusStyles.Pending}`}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-right pr-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 text-muted-foreground group-hover:text-foreground rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentReportsTable;
