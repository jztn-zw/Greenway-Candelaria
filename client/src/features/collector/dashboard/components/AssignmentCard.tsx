import { Truck, MapPin, Clock, Play, ArrowRight, Eye, CheckCircle2, Navigation, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { AssignmentData } from "./types";
import { getWasteBadgeClass, isFinishedRoute } from "../dashboard.utils";

interface Props {
  data: AssignmentData;
  onAction: () => void;
  className?: string;
}

const getWasteBadge = (wasteType?: string | null) => {
  if (!wasteType) return null;
  const color = getWasteBadgeClass(wasteType);
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
    statusLabel,
    completionPct: progress,
    remainingStops,
    nextStopName,
    nextStopOrder,
  } = data;


  if (routeState === "unassigned") {
    return (
      <div
        className={`rounded-2xl border border-dashed border-border/80 bg-card overflow-hidden shadow-xs flex flex-col justify-between ${className || ""}`}
      >
        {/* Header strip */}
        <div className="px-4 sm:px-5 py-3 flex items-center justify-between border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground font-display tracking-tight">
              Vehicle assignment status
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/60">
            Unassigned
          </span>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-foreground font-display tracking-tight">
                No truck assigned yet
              </h2>
              <p className="text-xs text-muted-foreground">
                You currently do not have an active municipal collection truck assigned for duty.
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-muted/30 border border-border/70 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-muted/60 text-muted-foreground flex items-center justify-center shrink-0 border border-border/60">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Dispatch pending</p>
                  <p className="text-base font-bold font-display text-foreground tracking-tight leading-tight mt-0.5">
                    Awaiting supervisor assignment
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug break-words">
                    Contact your MENRO dispatch officer to assign your vehicle unit.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Action required:</p>
              <p>Please reach out to Candelaria MENRO administration to link your driver account to an active collection vehicle.</p>
            </div>
          </div>

          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onAction}
              className="w-full h-11 text-xs sm:text-sm font-semibold rounded-xl border-border/80 hover:bg-muted/70 cursor-pointer active:scale-[0.99] transition-all"
            >
              <History className="w-4 h-4 mr-2" /> View past route runs and logs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (routeState === "no-schedule") {
    return (
      <div
        className={`rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs flex flex-col justify-between ${className || ""}`}
      >
        {/* Header strip */}
        <div className="px-4 sm:px-5 py-3 flex items-center justify-between border-b border-border/60 bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground font-display tracking-tight">
              Today's route assignment
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Standby shift
          </span>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-3.5">
            {/* Title & Metadata */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground font-display tracking-tight">
                  No collection scheduled today
                </h2>
                {getWasteBadge(wasteType)}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  Truck {data.plateNumber ? <span className="font-mono font-semibold text-foreground">{data.plateNumber}</span> : "assigned"}
                </span>
                <span>·</span>
                <span>Candelaria MENRO reserve</span>
              </div>
            </div>

            {/* Standby Operational Status Tile */}
            <div className="p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-2xs">
              <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs mt-0.5 sm:mt-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>Municipal standby status</span>
                    </div>
                    <span className="sm:hidden inline-flex items-center px-2 py-0.5 rounded-md bg-background border border-border/80 text-[10px] font-semibold text-muted-foreground shrink-0 shadow-2xs">
                      Reserve
                    </span>
                  </div>
                  <p className="text-sm sm:text-base md:text-lg font-bold font-display text-foreground tracking-tight leading-tight mt-0.5">
                    Municipal fleet reserve
                  </p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-snug break-words">
                    Check notifications and open your route map for new dispatches from MENRO.
                  </p>
                </div>
              </div>
              <div className="hidden sm:block text-right shrink-0">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-background border border-border/80 text-xs font-semibold text-muted-foreground shadow-2xs">
                  Reserve
                </span>
              </div>
            </div>

            {/* Standby Protocol Steps Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Standby shift guidelines</span>
                <span className="text-xs font-semibold text-muted-foreground/90">Ready</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2">
                <div className="p-2 sm:p-2.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col justify-between min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 bg-muted/90 text-muted-foreground border border-border/70">
                      1
                    </span>
                    <span className="text-xs font-bold text-foreground leading-tight truncate">Truck check</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 leading-snug break-words">
                    Fluids & road readiness
                  </p>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col justify-between min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 bg-muted/90 text-muted-foreground border border-border/70">
                      2
                    </span>
                    <span className="text-xs font-bold text-foreground leading-tight truncate">Dispatch monitor</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 leading-snug break-words">
                    Check live notifications
                  </p>
                </div>

                <div className="p-2 sm:p-2.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col justify-between min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 bg-muted/90 text-muted-foreground border border-border/70">
                      3
                    </span>
                    <span className="text-xs font-bold text-foreground leading-tight truncate">View schedule</span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 leading-snug break-words">
                    Check monthly calendar
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onAction}
              className="w-full h-11 text-xs sm:text-sm font-semibold rounded-xl border-border/80 hover:bg-muted/70 cursor-pointer active:scale-[0.99] transition-all"
            >
              <History className="w-4 h-4 mr-2" /> View past route runs and logs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isFinished = isFinishedRoute(routeState);
  const isInProgress = routeState === "in-progress";

  return (
    <div
      className={`rounded-2xl border overflow-hidden shadow-xs transition-all flex flex-col justify-between ${
        routeState === "completed"
          ? "border-emerald-500/30 bg-card"
          : "border-border/80 bg-card"
      } ${className || ""}`}
    >
      {/* Header strip */}
      <div
        className={`px-4 sm:px-5 py-3 flex items-center justify-between border-b shrink-0 ${
          routeState === "completed"
            ? "bg-emerald-500/10 border-emerald-500/20"
            : "bg-muted/30 border-border/60"
        }`}
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-foreground font-display tracking-tight">
            Today's route assignment
          </span>
        </div>

        {isInProgress || routeState === "paused" ? (
          <span className="text-xs font-mono font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full tabular-nums">
            {statusLabel}
          </span>
        ) : isFinished ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground bg-muted border border-border px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> {statusLabel}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Starts {estimatedStart}
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3.5">
          {/* Route info */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold text-foreground font-display tracking-tight">
                {routeName}
              </h2>
              {getWasteBadge(wasteType)}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">
                {totalStops} planned collection stops
              </span>
              <span>·</span>
              <span>Candelaria municipal sector</span>
            </div>
          </div>

          {/* Primary Mission Focus: Next Checkpoint Spotlight */}
          {!isFinished && nextStopName && (
            <div className="p-3 sm:p-4 rounded-xl bg-muted/30 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
                  <Navigation className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span>{isInProgress || routeState === "paused" ? "Current target checkpoint" : "Initial route checkpoint"}</span>
                  </div>
                  <p className="text-sm sm:text-base md:text-lg font-bold font-display text-foreground tracking-tight truncate mt-0.5">
                    {nextStopName}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-background border border-border/80 text-xs font-semibold text-foreground shadow-2xs tabular-nums">
                  Stop {nextStopOrder || 1} of {totalStops}
                </span>
              </div>
            </div>
          )}

          {/* Upcoming Stops Sequence */}
          {!isFinished && data.upcomingStops && data.upcomingStops.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>Upcoming checkpoint sequence</span>
                <span className="text-xs font-semibold text-foreground/80 tabular-nums">
                  {completedStops} of {totalStops} cleared
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {data.upcomingStops.slice(0, 3).map((st, idx) => {
                  const isNext = idx === 0;
                  return (
                    <div
                      key={st.id || idx}
                      className={`px-3 py-2.5 rounded-xl border flex items-center gap-2.5 min-w-0 transition-all ${
                        isNext
                          ? "bg-primary/10 border-primary/40 shadow-2xs"
                          : "bg-muted/30 border-border/60"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 tabular-nums ${
                          isNext
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "bg-muted/80 text-muted-foreground border border-border/70"
                        }`}
                      >
                        {st.order}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {st.name}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending route note when next stop is not specified */}
          {!isFinished && !isInProgress && !nextStopName && (
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground flex items-center gap-2.5">
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
                  {remainingStops > 0 && ` (${remainingStops} remaining)`}
                </span>
                <span className="font-semibold text-primary font-mono tabular-nums">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2 rounded-full" />
            </div>
          )}

          {isFinished && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-semibold">{statusLabel}</p>
              <p className="text-xs text-muted-foreground">
                {completedStops} of {totalStops} stops completed · {skippedStops} missed
              </p>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="pt-2">
          <Button
            onClick={onAction}
            className={`w-full h-11 text-xs sm:text-sm font-semibold rounded-xl active:scale-[0.99] transition-all cursor-pointer shadow-xs ${
              isFinished
                ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
            variant={isFinished ? "outline" : "default"}
          >
            {isFinished ? (
              <>
                <Eye className="w-4 h-4 mr-2" /> View route history
              </>
            ) : isInProgress || routeState === "paused" ? (
              <>
                <ArrowRight className="w-4 h-4 mr-2" /> Continue route navigation
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" /> Start today's collection route
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentCard;
