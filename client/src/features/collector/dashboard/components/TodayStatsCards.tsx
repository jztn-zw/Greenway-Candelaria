import { CheckCircle2, SkipForward, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssignmentData } from "./types";

interface Props {
  data: AssignmentData;
}

const TodayStatsCards = ({ data }: Props) => {
  const { completedStops: completed, totalStops: total, skippedStops: skipped,
    remainingStops: remaining, completionPct, durationLabel, statusLabel } = data;
  const active = data.routeState === "in-progress";

  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
      <div className="grid grid-cols-3 divide-x divide-border/60">

        {/* ── Metric 1: Stops Cleared ── */}
        <div className="p-2.5 sm:p-4 md:p-5 flex flex-col justify-between gap-2 sm:gap-3 transition-colors hover:bg-muted/10 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="inline-flex items-center justify-center text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 truncate">
              <span className="hidden sm:inline">Stops </span>Cleared
            </span>
            <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-1 sm:gap-2 min-w-0">
              <span className="text-base sm:text-2xl md:text-3xl font-bold font-display text-foreground tabular-nums tracking-tight truncate">
                {total > 0 ? `${completed}/${total}` : "—"}
              </span>
              {total > 0 && (
                <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                  ({completionPct}%)
                </span>
              )}
            </div>
            <p
              className={cn(
                "text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate",
                completed === total && total > 0
                  ? "text-emerald-600 dark:text-emerald-400 font-medium"
                  : "text-muted-foreground"
              )}
            >
              {total > 0
                ? completed === total
                  ? "All completed"
                  : `${remaining} remaining`
                : "No stops"}
            </p>
          </div>
        </div>

        {/* ── Metric 2: Skipped Stops ── */}
        <div className="p-2.5 sm:p-4 md:p-5 flex flex-col justify-between gap-2 sm:gap-3 transition-colors hover:bg-muted/10 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span
              className={cn(
                "inline-flex items-center justify-center text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md border truncate",
                skipped > 0
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-muted/70 text-muted-foreground border-border/80"
              )}
            >
              Skipped<span className="hidden sm:inline"> Stops</span>
            </span>
            <div
              className={cn(
                "w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg border flex items-center justify-center shrink-0",
                skipped > 0
                  ? "bg-destructive/10 border-destructive/20"
                  : "bg-muted/60 border-border/60"
              )}
            >
              <SkipForward
                className={cn(
                  "w-3 h-3 sm:w-3.5 sm:h-3.5",
                  skipped > 0 ? "text-destructive" : "text-muted-foreground"
                )}
              />
            </div>
          </div>

          <div className="min-w-0">
            <span
              className={cn(
                "text-base sm:text-2xl md:text-3xl font-bold font-display tabular-nums tracking-tight block truncate",
                skipped > 0 ? "text-destructive" : "text-foreground"
              )}
            >
              {total > 0 ? skipped : "—"}
            </span>
            <p
              className={cn(
                "text-[10px] sm:text-xs mt-0.5 sm:mt-1 truncate",
                skipped > 0 ? "text-destructive/90 font-medium" : "text-muted-foreground"
              )}
            >
              {skipped > 0 ? "Requires re-run" : "Zero missed"}
            </p>
          </div>
        </div>

        {/* ── Metric 3: Shift Duration ── */}
        <div className="p-2.5 sm:p-4 md:p-5 flex flex-col justify-between gap-2 sm:gap-3 transition-colors hover:bg-muted/10 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span
              className={cn(
                "inline-flex items-center justify-center text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md border truncate",
                active
                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                  : "bg-muted/70 text-muted-foreground border-border/80"
              )}
            >
              <span className="hidden sm:inline">Shift </span>Duration
            </span>
            <div
              className={cn(
                "w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg border flex items-center justify-center shrink-0",
                active
                  ? "bg-sky-500/10 border-sky-500/20"
                  : "bg-muted/60 border-border/60"
              )}
            >
              <Timer
                className={cn(
                  "w-3 h-3 sm:w-3.5 sm:h-3.5",
                  active ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground"
                )}
              />
            </div>
          </div>

          <div className="min-w-0">
            <span className="text-base sm:text-2xl md:text-3xl font-bold font-display text-foreground tabular-nums tracking-tight block truncate">
              {durationLabel}
            </span>
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1 truncate">
              {active && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse shrink-0" />
              )}
              <span className={cn(active ? "text-sky-600 dark:text-sky-400 font-medium" : "")}>
                {statusLabel}
              </span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TodayStatsCards;
