import { AdminKpiCard,AdminKpiGrid } from "@/components/admin/AdminKpiCards";
import { CheckCircle2,SkipForward,Timer } from "lucide-react";
import type { AssignmentData } from "./types";

const TodayStatsCards = ({ data }: { data: AssignmentData }) => {
  const { completedStops: completed, totalStops: total, skippedStops: skipped,
    remainingStops: remaining, completionPct, durationLabel, statusLabel } = data;
  const active = data.routeState === "in-progress";

  return (
    <AdminKpiGrid>
      <AdminKpiCard label="Stops cleared" icon={CheckCircle2} tone="success"
        value={total > 0 ? `${completed}/${total}` : "—"}
        description={<>{total > 0 && <span className="font-semibold text-success-foreground">{completionPct}% · </span>}
          {total > 0 ? completed === total ? "All completed" : `${remaining} remaining` : "No stops"}</>} />
      <AdminKpiCard label="Skipped stops" icon={SkipForward} tone={skipped > 0 ? "danger" : "neutral"}
        value={total > 0 ? skipped : "—"}
        description={skipped > 0 ? "Requires re-run" : "Zero missed"} />
      <AdminKpiCard label="Shift duration" icon={Timer} tone={active ? "info" : "neutral"}
        value={durationLabel}
        description={<span className="inline-flex items-center gap-1.5">
          {active && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-info" />}
          {statusLabel}
        </span>} />
    </AdminKpiGrid>
  );
};

export default TodayStatsCards;
