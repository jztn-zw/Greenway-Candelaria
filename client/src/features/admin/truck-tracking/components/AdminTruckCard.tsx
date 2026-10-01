import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Truck,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Route as RouteIcon,
} from "lucide-react";
import AnimatedList from "@/components/AnimatedList";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { AdminTruck, TruckStatus } from "../types";
import { cn } from "@/lib/utils";

/** Convert time strings like "6:05 AM", "7:45 PM", or "18:30" -> "6:05am" / "7:45pm" */
const formatTime12h = (raw: string): string => {
  const ampmMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (ampmMatch) {
    const [, h, m, period] = ampmMatch;
    return `${h}:${m}${period.toLowerCase()}`;
  }
  const h24Match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    let hour = parseInt(h24Match[1], 10);
    const min = h24Match[2];
    const period = hour >= 12 ? "pm" : "am";
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return `${hour}:${min}${period}`;
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    let hour = d.getHours();
    const min = String(d.getMinutes()).padStart(2, "0");
    const period = hour >= 12 ? "pm" : "am";
    if (hour === 0) hour = 12;
    else if (hour > 12) hour -= 12;
    return `${hour}:${min}${period}`;
  }
  return raw;
};

interface AdminTruckCardProps {
  truck: AdminTruck;
  unreadMessageCount: number;
  isSelected: boolean;
  onClick: () => void;
  onRouteChange: (routeId: string) => void;
}

const statusConfig: Record<TruckStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: getStatusBadgeStyle("Scheduled").className },
  "on-the-way": { label: "On The Way", className: getStatusBadgeStyle("On The Way").className },
  paused: { label: "Paused", className: getStatusBadgeStyle("Paused").className },
  done: { label: "Offline", className: getStatusBadgeStyle("Offline").className },
  offline: { label: "Offline", className: getStatusBadgeStyle("Offline").className },
};

const MessageThread = ({ truck, unreadMessageCount }: { truck: AdminTruck; unreadMessageCount: number }) => <div className="border-t border-border/60 p-3" onClick={(event) => event.stopPropagation()}>
  <Button type="button" variant={unreadMessageCount > 0 ? "primary-outline" : "outline"} size="sm" disabled={!truck.driverId} onClick={() => window.dispatchEvent(new CustomEvent("admin:open-messages", { detail: { driverId: truck.driverId } }))} className={"gap-1.5"}>
    <MessageSquare className="size-4" />Messages
    {unreadMessageCount > 0 && <span aria-label={`${unreadMessageCount} new collector message${unreadMessageCount === 1 ? "" : "s"}`} className="ml-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-primary px-1 text-ui-overline font-bold leading-none text-primary-foreground">{unreadMessageCount > 9 ? "9+" : unreadMessageCount}</span>}
  </Button>
</div>;

const AdminTruckCard = ({
  truck,
  unreadMessageCount,
  isSelected,
  onClick,
  onRouteChange,
}: AdminTruckCardProps) => {
  const [routeExpanded, setRouteExpanded] = useState(false);
  const status = statusConfig[truck.status];
  const isNear = truck.barangaysAway !== null && truck.barangaysAway <= 3 && truck.status === "on-the-way";
  const progressPct = truck.totalBarangays > 0
    ? Math.min(100, Math.max(0, Math.round((truck.completedBarangays / truck.totalBarangays) * 100)))
    : 0;

  const skippedStops = useMemo(
    () => truck.route.filter((s) => s.state === "skipped"),
    [truck.route],
  );

  return (
    <Card
      className={cn(
        "transition-all duration-200 border rounded-2xl overflow-hidden shadow-2xs",
        isSelected
          ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]"
          : "border-border/70 hover:border-primary/40 bg-card"
      )}
    >
      <CardContent className="p-0">
        <div className="p-3.5 sm:p-4 cursor-pointer" onClick={onClick}>
          {/* Card Header: Vehicle Identity + Status & Controls */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-colors border",
                truck.status === "on-the-way"
                  ? "bg-primary/10 text-primary border-primary/25"
                  : truck.status === "done"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-muted/80 text-muted-foreground border-border/80"
              )}>
                <Truck className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="gw-heading text-xs sm:text-sm text-foreground leading-tight truncate">
                    {truck.name}
                  </h4>
                  <span className="text-ui-overline text-muted-foreground/80 tabular-nums font-medium px-1.5 py-0.5 rounded-md bg-muted/60">
                    {truck.plateNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Badge + Quick Override in Header */}
            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {skippedStops.length > 0 && (
                <Badge
                  variant="outline"
                  className={"text-[9px] px-1.5 py-0 h-4 font-bold uppercase tracking-wider " + getStatusBadgeStyle("Skipped").className}
                >
                  {skippedStops.length} Skipped
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "text-ui-overline px-2 py-0.5 font-semibold rounded-lg tracking-wide uppercase",
                  status.className
                )}
              >
                {status.label}
              </Badge>

            </div>
          </div>

          {truck.routeChoices.length > 1 && truck.routeId && (
            <div className="mt-3" onClick={(event) => event.stopPropagation()}>
              <span className="mb-1 block text-ui-overline font-semibold uppercase tracking-wide text-muted-foreground">
                Showing route
              </span>
              <SearchableSelect value={truck.routeId} onValueChange={onRouteChange ?? (() => {})}
                options={truck.routeChoices.map((route) => ({ value: route.id, label: `${route.name} · ${route.status.toLowerCase()}` }))}
                aria-label="Showing route" searchPlaceholder="Search routes..." fieldSize="compact"
                className="h-8 w-full rounded-lg text-xs" />
            </div>
          )}

          {!isSelected && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span className="truncate text-ui-caption font-medium text-muted-foreground">
                  {truck.currentBarangay || "No route assigned"}
                </span>
              </div>
              {truck.totalBarangays > 0 && (
                <span className="shrink-0 text-ui-caption font-semibold tabular-nums text-foreground">
                  {truck.completedBarangays}/{truck.totalBarangays}
                </span>
              )}
            </div>
          )}

          {isSelected && (
            <>
          {/* Essential operational details */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="col-span-2 flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-ui-overline font-medium text-muted-foreground">Current stop</p>
                <p className={cn(
                  "truncate text-xs font-semibold",
                  truck.currentBarangay ? "text-foreground" : "italic text-muted-foreground/60"
                )}>
                  {truck.currentBarangay || "No route assigned"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 min-w-0">
              <p className="flex items-center gap-1 text-ui-overline font-medium text-muted-foreground">
                <User className="w-3 h-3 shrink-0" /> Driver
              </p>
              <p className={cn(
                "mt-0.5 truncate text-xs font-semibold",
                truck.driver ? "text-foreground" : "italic text-muted-foreground/60"
              )}>
                {truck.driver || "Unassigned"}
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 min-w-0">
              <p className="text-ui-overline font-medium text-muted-foreground">Waste type</p>
              <p className={cn(
                "mt-0.5 truncate text-xs font-semibold",
                truck.wasteType && truck.wasteType !== "Not assigned" ? "text-primary" : "italic text-muted-foreground/60"
              )}>
                {truck.wasteType || "Not assigned"}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-ui-overline text-muted-foreground">
            <Clock className="w-3 h-3 shrink-0" />
            <span>Updated {truck.lastGpsUpdate}</span>
          </div>

          {/* Progress Bar */}
          {truck.totalBarangays > 0 && (
            <div className="mt-3 pt-2.5 border-t border-border/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground text-ui-caption font-medium">Route Progress</span>
                <span className="font-semibold text-foreground text-ui-caption tabular-nums">
                  {truck.completedBarangays}/{truck.totalBarangays} stops ({progressPct}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {isNear && (
            <div className="mt-2.5 flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/15">
              <Radio className="w-3.5 h-3.5 text-primary animate-pulse shrink-0" />
              <p className="text-xs font-semibold text-primary">
                {truck.barangaysAway} barangay{truck.barangaysAway! > 1 ? "s" : ""} away from next stop
              </p>
            </div>
          )}

          {/* Missed / Skipped Stops Priority Alert */}
          {skippedStops.length > 0 && (
            <div className="mt-2.5 rounded-lg border border-destructive/25 bg-destructive/10 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {skippedStops.length} Skipped Barangay{skippedStops.length > 1 ? "s" : ""}
                  </span>
                </div>
                <Badge
                  variant="destructive"
                  className={"text-[9px] px-1.5 py-0 h-4 font-bold " + getStatusBadgeStyle("Attention Required").className}
                >
                  Attention Required
                </Badge>
              </div>
              <div className="space-y-1">
                {skippedStops.map((stop) => (
                  <div
                    key={stop.name}
                    className="flex items-start justify-between gap-2 text-ui-caption bg-background/80 rounded-lg px-2 py-1 border border-destructive/15"
                  >
                    <span className="font-semibold text-foreground truncate">
                      {stop.name}
                    </span>
                    <span className="text-ui-overline text-destructive italic truncate max-w-[60%]">
                      {stop.skippedReason
                        ? `"${stop.skippedReason}"`
                        : "Reason not specified"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          )}
        </div>

        {isSelected && truck.routeId && truck.driverUserId && (
          <MessageThread key={truck.driverId} truck={truck} unreadMessageCount={unreadMessageCount} />
        )}

        {/* Route Details Accordion */}
        {isSelected && <div className="border-t border-border/60">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-[var(--button-neutral-hover)] hover:text-foreground transition-colors cursor-pointer select-none"
            onClick={(e) => { e.stopPropagation(); setRouteExpanded(!routeExpanded); }}
          >
            <span className="flex items-center gap-2 font-semibold">
              <RouteIcon className="w-3.5 h-3.5 text-primary" />
              Route Details
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">{truck.route.length}</span>
            </span>
            {routeExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>

          {routeExpanded && (
            <div className="px-4 pb-3.5 max-h-64 overflow-y-auto scrollbar-thin">
              <div className="rounded-xl border border-border/70 bg-muted/15 p-3">
                <div className="relative pl-1">
                  {truck.route.map((stop, idx) => {
                    const isLast = idx === truck.route.length - 1;
                    const isDone = stop.state === "done";
                    const isInProgress = stop.state === "in-progress";
                    const isSkipped = stop.state === "skipped";

                    return (
                      <div key={stop.name} className="relative flex items-start gap-3 pb-3.5 last:pb-0">
                        {/* Vertical Connecting Line */}
                        {!isLast && (
                          <div
                            className={cn(
                              "absolute left-2.5 top-5 bottom-0 w-0.5 -translate-x-1/2",
                              isDone ? "bg-primary/40" : "bg-border/70"
                            )}
                          />
                        )}

                        {/* Stepper Node */}
                        <div
                          className={cn(
                            "relative z-10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border text-[9px] font-semibold tabular-nums transition-all",
                            isDone && "bg-primary text-primary-foreground border-primary shadow-xs",
                            isInProgress && "bg-primary/15 text-primary border-primary ring-2 ring-primary/20",
                            isSkipped && "bg-destructive text-destructive-foreground border-destructive",
                            !isDone && !isInProgress && !isSkipped && "bg-muted text-muted-foreground border-border/80"
                          )}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                          ) : isInProgress ? (
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          ) : isSkipped ? (
                            <AlertTriangle className="w-2.5 h-2.5" />
                          ) : (
                            idx + 1
                          )}
                        </div>

                        {/* Stop Details */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "text-xs font-semibold truncate",
                                isDone && "text-muted-foreground line-through decoration-primary/40",
                                isInProgress && "text-primary font-bold",
                                isSkipped && "text-destructive font-bold",
                                !isDone && !isInProgress && !isSkipped && "text-foreground"
                              )}
                            >
                              {stop.name}
                            </span>

                            {isDone && (
                              <span className="text-ui-overline text-muted-foreground tabular-nums shrink-0 font-medium">
                                {stop.completedAt ? formatTime12h(stop.completedAt) : "Done"}
                              </span>
                            )}
                            {isInProgress && (
                              <Badge
                                variant="outline"
                                className={"text-[9px] px-1.5 py-0 h-4 font-bold animate-pulse " + getStatusBadgeStyle("Current Stop").className}
                              >
                                Current Stop
                              </Badge>
                            )}
                            {isSkipped && (
                              <Badge
                                variant="outline"
                                className={"text-[9px] px-1.5 py-0 h-4 font-bold " + getStatusBadgeStyle("Skipped").className}
                              >
                                Skipped
                              </Badge>
                            )}
                          </div>

                          {isSkipped && stop.skippedReason && (
                            <p className="mt-0.5 text-ui-overline text-destructive/90 italic leading-snug">
                              Reason: {stop.skippedReason}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>}
      </CardContent>
    </Card>
  );
};

export default AdminTruckCard;
