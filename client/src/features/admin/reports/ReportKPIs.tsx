import { FileText, Clock, Truck, CheckCircle2 } from "lucide-react";
import type { AdminReportsKPIs } from "@/services/reportsService";
import type { WasteReport } from "./types";

interface ReportKPIsProps {
  reports?: WasteReport[];
  kpis?: AdminReportsKPIs;
}

const ReportKPIs = ({ reports = [], kpis }: ReportKPIsProps) => {
  const total = kpis ? kpis.total : reports.length;
  const pending = kpis
    ? kpis.pending
    : reports.filter((r) => r.status === "Submitted" || r.status === "Under Review").length;
  const dispatched = kpis
    ? kpis.dispatched
    : reports.filter((r) => r.status === "Dispatched").length;
  const resolved = kpis
    ? kpis.resolved
    : reports.filter((r) => r.status === "Resolved").length;

  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Total Reports */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Total Reports
          </span>
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          {total}
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {resolved} Resolved
          </span>
          <span>·</span>
          <span>{resolutionRate}% Rate</span>
        </div>
      </div>

      {/* Pending Review */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Pending Review
          </span>
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          {pending}
        </div>
        <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
          Requires verification
        </div>
      </div>

      {/* In Dispatch */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">
            In Dispatch
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          {dispatched}
        </div>
        <div className="text-[11px] text-muted-foreground">
          Crew assigned to site
        </div>
      </div>

      {/* Resolved Cases */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">
            Resolved
          </span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          {resolved}
        </div>
        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
          Closed & remediated
        </div>
      </div>
    </div>
  );
};

export default ReportKPIs;
