import { Truck, MapPin, Clock, Play, ArrowRight, Eye, CheckCircle2, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AssignmentData } from "./types";

interface Props {
  data: AssignmentData;
  onAction: () => void;
  className?: string;
}

const getWasteBadge = (wasteType?: string | null) => {
  if (!wasteType) return null;
  const lower = wasteType.toLowerCase();
  let color = "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/30";
  if (lower.includes("bio") || lower.includes("organic")) {
    color = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  } else if (lower.includes("recycle") || lower.includes("plastic")) {
    color = "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30";
  } else if (lower.includes("hazardous") || lower.includes("special")) {
    color = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${color}`}>
      {wasteType}
    </span>
  );
};

const AssignmentCard = ({ data, onAction, className }: Props) => {
  const {
    routeState,
    routeName,
    totalStops,
    completedStops,
    skippedStops,
    estimatedStart,
    wasteType,
    timeElapsedMinutes,
    nextStopName,
    nextStopZone,
    nextStopOrder,
  } = data;

  const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;
  const remainingStops = Math.max(0, totalStops - completedStops - skippedStops);
  const hours = Math.floor(timeElapsedMinutes / 60);
  const mins = timeElapsedMinutes % 60;

  if (routeState === "unassigned") {
    return (
      <div className={`rounded-2xl border border-dashed border-border/80 bg-card p-6 sm:p-8 text-center shadow-xs ${className || ""}`}>
        <div className="w-14 h-14 rounded-2xl bg-muted/60 text-muted-foreground mx-auto mb-3 flex items-center justify-center border border-border/50">
          <Truck className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-foreground font-bold font-display text-base">No Truck Assigned Yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          You currently do not have a vehicle assignment. Contact MENRO dispatch to assign your vehicle.
        </p>
      </div>
    );
  }

  if (routeState === "no-schedule") {
    return (
      <div className={`rounded-2xl border border-border/80 bg-card p-6 sm:p-8 text-center shadow-xs ${className || ""}`}>
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary mx-auto mb-3 flex items-center justify-center border border-primary/20">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <p className="text-foreground font-bold font-display text-base">No Collection Scheduled Today</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          No scheduled collection run found for your assigned truck today. Check back later or view past route history.
        </p>
      </div>
    );
  }

  const isCompleted = routeState === "completed";
  const isInProgress = routeState === "in-progress";

  return (
    <div
      className={`rounded-2xl border overflow-hidden shadow-xs transition-all flex flex-col justify-between ${
        isCompleted
          ? "border-emerald-500/30 bg-card"
          : "border-border/80 bg-card"
      } ${className || ""}`}
    >
      {/* Header strip */}
      <div
        className={`px-4 sm:px-5 py-3 flex items-center justify-between border-b shrink-0 ${
          isCompleted
            ? "bg-emerald-500/10 border-emerald-500/20"
            : "bg-muted/30 border-border/60"
        }`}
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground font-display tracking-tight uppercase">
            Today's Assignment
          </span>
        </div>

        {isInProgress ? (
          <span className="text-xs font-mono font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full tabular-nums">
            {hours > 0 ? `${hours}h ` : ""}{mins}m on route
          </span>
        ) : isCompleted ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> Run Completed
          </span>
        ) : (
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Starts {estimatedStart}
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Route info */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg sm:text-xl font-bold text-foreground font-display tracking-tight">
                {routeName}
              </h3>
              {getWasteBadge(wasteType)}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground/85">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Shift Window: {estimatedStart}</span>
              </span>
              <span className="hidden sm:inline text-border">•</span>
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                <span>{totalStops} Planned Stops</span>
              </span>
            </div>
          </div>

          {/* Target Next Stop Banner (only for active or pending routes) */}
          {!isCompleted && nextStopName && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Navigation className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    {isInProgress ? "Current Target Stop" : "Starting Stop"}
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-foreground truncate mt-0.5">
                    {nextStopName} {nextStopZone ? `· ${nextStopZone}` : ""}
                  </p>
                </div>
              </div>
              {nextStopOrder && (
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-card border border-border text-muted-foreground shrink-0">
                  Stop #{nextStopOrder}
                </span>
              )}
            </div>
          )}

          {/* Pending route note when next stop is not specified */}
          {!isCompleted && !isInProgress && !nextStopName && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary shrink-0" />
              <span>Collection route is scheduled for today. Tap below to begin when ready.</span>
            </div>
          )}

          {/* Progress bar for in-progress */}
          {isInProgress && (
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {completedStops} of {totalStops} stops cleared
                  {remainingStops > 0 && ` (${remainingStops} left)`}
                </span>
                <span className="font-bold text-primary font-mono">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 rounded-full" />
            </div>
          )}

          {/* Completion Status & Route Clearance (for completed runs) */}
          {isCompleted && (
            <div className="space-y-2.5">
              <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Shift Collection Concluded
                    </p>
                    <p className="text-xs sm:text-sm font-semibold text-foreground truncate mt-0.5">
                      {completedStops} of {totalStops} stops completed {skippedStops > 0 ? `· ${skippedStops} missed` : ""}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-card border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 shrink-0">
                  {totalStops > 0 ? `${Math.round(progress)}% cleared` : "Finished"}
                </span>
              </div>

              {totalStops > 0 && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      Final Route Clearance
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2 rounded-full [&>div]:bg-emerald-500" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="pt-2 mt-auto">
          <Button
            onClick={onAction}
            className={`w-full h-11 text-xs sm:text-sm font-bold rounded-xl active:scale-[0.99] transition-all cursor-pointer shadow-xs ${
              isCompleted
                ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            variant={isCompleted ? "outline" : "default"}
          >
            {isCompleted ? (
              <>
                <Eye className="w-4 h-4 mr-2" /> View Route History & Summary
              </>
            ) : isInProgress ? (
              <>
                <ArrowRight className="w-4 h-4 mr-2" /> Continue Route Navigation
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" /> Start Today's Collection Route
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentCard;
