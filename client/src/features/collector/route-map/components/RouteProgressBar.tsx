import { CheckCircle2, Clock, MapPin, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWasteBadgeClass } from "../../dashboard/dashboard.utils";

interface RouteProgressBarProps {
  completed: number;
  total: number;
  routeName: string;
  wasteType?: string;
  elapsed: string;
  isScheduled?: boolean;
  isPaused?: boolean;
  hasStarted?: boolean;
}

const RouteProgressBar = ({
  completed,
  total,
  routeName,
  wasteType,
  elapsed,
  isScheduled,
  isPaused,
  hasStarted,
}: RouteProgressBarProps) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (!hasStarted) {
    return (
      <section aria-label="Collection route summary" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3.5 shadow-xs sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="mr-1 truncate font-display text-base font-bold tracking-tight text-foreground sm:text-lg">{routeName}</h2>
          {wasteType && <span className={cn("inline-flex shrink-0 items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold", getWasteBadgeClass(wasteType))}>{wasteType}</span>}
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" /> {total} {total === 1 ? "stop" : "stops"}
          </span>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold", isScheduled ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-primary/20 bg-primary/10 text-primary")}>
          <Clock className="h-3.5 w-3.5" /> {isScheduled ? "Scheduled" : "Ready to start"}
        </span>
      </section>
    );
  }

  return (
    <div className="bg-card border border-border/80 shadow-xs rounded-2xl p-3.5 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Route Title, Waste Type & Total Stops */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2 className="text-sm sm:text-base font-display font-bold text-foreground tracking-tight truncate">
            {routeName}
          </h2>

          {wasteType && (
            <span
              className={cn(
                "text-xs font-semibold px-2.5 py-0.5 rounded-lg border shrink-0 inline-flex items-center",
                getWasteBadgeClass(wasteType)
              )}
            >
              {wasteType}
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-lg border border-border/60">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
            <span>{total} collection stops</span>
          </span>

          {isScheduled && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25">
              Scheduled
            </span>
          )}
        </div>

        {/* Right: Elapsed Timer + Progress Counter */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-medium transition-colors",
              isPaused
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                : !hasStarted && !isScheduled
                ? "bg-muted/40 border-border/60 text-muted-foreground"
                : "bg-muted/60 border-border/70 text-foreground"
            )}
          >
            {isPaused ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-mono font-bold tabular-nums">{elapsed}</span>
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Paused
                </span>
              </>
            ) : !hasStarted && !isScheduled ? (
              <>
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>Ready to start</span>
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="tabular-nums font-bold text-foreground font-mono">{elapsed}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary tabular-nums font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>
              {completed} of {total}
            </span>
            <span className="text-primary/40">·</span>
            <span>{pct}%</span>
          </div>
        </div>
      </div>

      {/* Integrated Progress Bar */}
      <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden border border-border/40">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default RouteProgressBar;
