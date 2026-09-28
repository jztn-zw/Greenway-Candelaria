/**
 * CollectorRouteMap.tsx
 *
 * The collector's live route management screen.
 * All data comes from the backend — no static mock data used in production.
 *
 * Data flow:
 *   useRouteData     → fetches today's route + stops from /routes/today/mine
 *   useLiveTracking  → polls /tracking/live for truck GPS + pings driver location
 *
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Clock,
  MapPin,
  SkipForward,
  Flag,
  WifiOff,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Radio,
  Navigation,
  Pause,
  Play,
  ArrowLeft,
  History,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import RouteProgressBar from "./components/RouteProgressBar";
import RouteMapView from "./components/RouteMapView";
import StopListItem from "./components/StopListItem";
import SkipReasonModal from "./components/SkipReasonModal";
import EndRouteModal from "./components/EndRouteModal";
import { useCollectorTracking } from "./useCollectorTracking";
import { useCollectorAction } from "@/lib/collectorQuery";
import { distanceToStopKm } from "./routeMap.utils";
import { useScheduledRouteOrder } from "./hooks/useAutoRoute";
import {
  completeStop,
  skipStop,
  endRoute,
  startMyRoute,
  setMyRoutePaused,
} from "@/services/trackingService";
import type { SkipReason } from "./types";
import { matchesCollectorRouteAlert } from "../notifications/notificationRouting";

const getErrorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Please try again.";

// ─── Skeleton ─────────────────────────────────────────────────────────

const RouteMapSkeleton = () => (
  <div className="w-full max-w-[1600px] mx-auto space-y-3 sm:space-y-4 pb-4 px-1 sm:px-0">
    {/* Page Header Skeleton */}
    <div className="flex items-center gap-3 pb-1">
      <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
      <div className="space-y-1.5 min-w-0 flex-1">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
    </div>
    <Skeleton className="h-20 w-full rounded-2xl" />
    <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Skeleton className="h-[340px] sm:h-[420px] lg:h-[620px] w-full rounded-2xl" />
      </div>
      <div className="lg:col-span-2 space-y-3">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-10 rounded-xl" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

// ─── Standby / No Route State ──────────────────────────────────────────

interface NoScheduledRouteViewProps {
  onRetry: () => void;
  onViewHistory: () => void;
  onBackToDashboard: () => void;
  message?: string;
}

const NoScheduledRouteView = ({
  onRetry,
  onViewHistory,
  onBackToDashboard,
  message = "No route has been assigned to your truck for today. Check back later or review past route runs.",
}: NoScheduledRouteViewProps) => (
  <div className="w-full max-w-[1600px] mx-auto min-h-[75vh] flex flex-col justify-center items-center px-4 py-8">
    <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs text-center space-y-6">
      {/* Municipal Indicator Icon */}
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto shadow-2xs">
        <CalendarClock className="w-7 h-7" />
      </div>

      {/* Copy */}
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
          No collection scheduled today
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          {message}
        </p>
      </div>

      {/* Standby Operational Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-muted/20 border border-border/60 text-left">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Shift status
          </p>
          <p className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Standby reserve</span>
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Dispatch office
          </p>
          <p className="text-xs font-bold text-foreground mt-0.5 truncate">
            Candelaria MENRO
          </p>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Live updates
          </p>
          <p className="text-xs font-bold text-foreground mt-0.5 truncate">
            Awaiting callout
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-1">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Button
            type="button"
            onClick={onViewHistory}
            className="w-full sm:w-auto h-11 px-5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer active:scale-[0.99] transition-all"
          >
            <History className="w-4 h-4 mr-2" /> View route history
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onBackToDashboard}
            className="w-full sm:w-auto h-11 px-5 rounded-xl text-xs sm:text-sm font-semibold border-border/80 hover:bg-muted/70 cursor-pointer active:scale-[0.99] transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to dashboard
          </Button>
        </div>

        <div className="pt-1.5">
          <button
            type="button"
            onClick={onRetry}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Check for newly assigned route
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Error State ──────────────────────────────────────────────────────

const RouteMapError = ({
  message,
  onRetry,
  onBack,
  title = "Could not load route",
  backLabel = "Back to dashboard",
}: {
  message: string;
  onRetry: () => void;
  onBack?: () => void;
  title?: string;
  backLabel?: string;
}) => (
  <div className="w-full max-w-[1600px] mx-auto min-h-[75vh] flex flex-col justify-center items-center px-4 py-8">
    <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs text-center space-y-5">
      {/* Icon */}
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/15 flex items-center justify-center text-destructive mx-auto shadow-2xs">
        <AlertCircle className="w-6 h-6" />
      </div>

      {/* Copy */}
      <div className="space-y-1.5">
        <p className="text-base font-display font-bold text-foreground tracking-tight">
          {title}
        </p>
        <p role="alert" className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">{message}</p>
      </div>

      {/* Action */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
        <Button
          variant="default"
          onClick={onRetry}
          className="w-full sm:w-auto gap-2 rounded-xl h-10 px-5 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try again
        </Button>
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            className="w-full sm:w-auto gap-2 rounded-xl h-10 px-5 text-xs font-semibold border-border cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {backLabel}
          </Button>
        )}
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────

const CollectorRouteMap = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
    const [isPauseUpdating, setIsPauseUpdating] = useState(false);
  const [isStartingRoute, setIsStartingRoute] = useState(false);
  // Tracks which stop is being mutated to show per-button loading states
  const [mutating, setMutating] = useState<"done" | "skip" | "end" | null>(
    null,
  );

  // ─── Data hooks ───────────────────────────────────────────────────────────
  const { stops, routeInfo, isLoading, error, refresh, truckCoords, isOffline, pendingSync, gpsError } = useCollectorTracking();
  const runRouteAction = useCollectorAction("routes", "history", "profile");
  const hasStartedRoute = Boolean(routeInfo?.collectionStartedAt);
  const isScheduledRoute = Boolean(
    !hasStartedRoute &&
      routeInfo?.startedAt &&
      routeInfo.startedAt.getTime() > Date.now(),
  );
  const isPaused = routeInfo?.routeStatus === "PAUSED";


  // ─── Auto-route: sort remaining stops by proximity ─────────────────────────
  // Keep the collector, resident, and admin views on the exact stop order
  // scheduled by the admin. GPS is used for the road path and ETA only; it
  // must never reorder collection barangays by straight-line proximity.
  const autoRoutedStops = useScheduledRouteOrder(stops);

  // ─── Elapsed timer with pause support ─────────────────────────────────────
  const [elapsed, setElapsed] = useState("0h 00m 00s");
  const routeStartMs = routeInfo?.collectionStartedAt?.getTime() ?? null;

  const handleTogglePause = useCallback(async () => {
    if (!routeInfo || isPauseUpdating) return;
    setIsPauseUpdating(true);
    try {
      const nextPaused = !isPaused;
      await runRouteAction(() => setMyRoutePaused(routeInfo.routeId, nextPaused));
      toast.success(nextPaused ? "Route paused" : "Route resumed", {
        description: nextPaused
          ? "GPS updates and collection actions are on hold."
          : "GPS updates and collection actions are active again.",
      });
    } catch (err: unknown) {
      toast.error("Could not update route pause", { description: getErrorMessage(err) });
    } finally {
      setIsPauseUpdating(false);
    }
  }, [isPaused, isPauseUpdating, runRouteAction, routeInfo]);

  const handleStartRoute = useCallback(async () => {
    if (!routeInfo || isStartingRoute) return;
    setIsStartingRoute(true);
    try {
      await runRouteAction(() => startMyRoute(routeInfo.routeId));
      toast.success("Route started", {
        description: "GPS tracking and route timing are now active.",
      });
    } catch (err: unknown) {
      toast.error("Could not start route", { description: getErrorMessage(err) });
    } finally {
      setIsStartingRoute(false);
    }
  }, [isStartingRoute, runRouteAction, routeInfo]);

  useEffect(() => {
    if (!routeStartMs) {
      setElapsed("0h 00m 00s");
      return;
    }

    const tick = () => {
      const now = isPaused && routeInfo?.pausedAt ? routeInfo.pausedAt.getTime() : Date.now();
      const diff = now - routeStartMs - (routeInfo?.totalPausedSeconds ?? 0) * 1000;
      if (diff < 0) {
        setElapsed("0h 00m 00s");
        return;
      }

      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setElapsed(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
    };

    tick();
    if (isPaused) return;

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [routeStartMs, isPaused, routeInfo?.pausedAt, routeInfo?.totalPausedSeconds]);

  // ─── Derived state ──────────────────────────────────────────────────────────
  const completed = useMemo(
    () => autoRoutedStops.filter((s) => s.status === "done").length,
    [autoRoutedStops],
  );
  const skipped = useMemo(
    () => autoRoutedStops.filter((s) => s.status === "skipped").length,
    [autoRoutedStops],
  );
  const activeStop = useMemo(
    () => autoRoutedStops.find((s) => s.status === "in-progress"),
    [autoRoutedStops],
  );
  const remaining = useMemo(
    () =>
      autoRoutedStops.filter((s) => s.status === "not-yet" || s.status === "in-progress")
        .length,
    [autoRoutedStops],
  );
  const nextStops = useMemo(
    () => autoRoutedStops.filter((s) => s.status === "not-yet").slice(0, 2),
    [autoRoutedStops],
  );

  const resolvedTruckCoords = truckCoords;

  // Geofence detection (150 meters = 0.15 km)
  const GEOFENCE_RADIUS_KM = 0.15;
  const isWithinGeofence = useMemo(() => {
    if (!activeStop || activeStop.hasCoordinates === false || !truckCoords) return false;
    const distKm = distanceToStopKm(truckCoords, activeStop);
    return distKm >= 0 && distKm <= GEOFENCE_RADIUS_KM;
  }, [activeStop, truckCoords]);

  // â”€â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleMarkDone = useCallback(async () => {
    if (!activeStop || !routeInfo) return;
    setMutating("done");

    const isFinalOutstandingStop = autoRoutedStops.every(
      (stop) =>
        stop.id === activeStop.id ||
        stop.status === "done" ||
        stop.status === "skipped",
    );


    try {
      await runRouteAction(() => completeStop(routeInfo.routeId, activeStop.id));

      if (isFinalOutstandingStop) {
        toast.success("Collection route completed", {
          description: "The collection summary was sent to the admin.",
        });
        navigate("/collector");
      } else {
        toast.success(`${activeStop.barangay} marked as done`, {
          description: "Residents have been notified.",
        });
      }
    } catch (err: unknown) {
      toast.error("Failed to mark stop as done", {
        description: getErrorMessage(err),
      });
    } finally {
      setMutating(null);
    }
  }, [activeStop, autoRoutedStops, navigate, routeInfo, runRouteAction]);

  const handleSkipConfirm = useCallback(
    async (reason: SkipReason, notes?: string) => {
      if (!activeStop || !routeInfo) return;
      setMutating("skip");

      const isFinalOutstandingStop = autoRoutedStops.every(
        (stop) =>
          stop.id === activeStop.id ||
          stop.status === "done" ||
          stop.status === "skipped",
      );

      const fullReason = reason === "Other" ? (notes ?? reason) : reason;

      setShowSkipModal(false);

      try {
        await runRouteAction(() => skipStop(routeInfo.routeId, activeStop.id, fullReason));

        if (isFinalOutstandingStop) {
              toast.success("Collection route completed", {
            description: "The collection summary was sent to the admin.",
          });
          navigate("/collector");
        } else {
          toast.warning(`${activeStop.barangay} skipped`, {
            description: `Reason: ${reason}`,
          });
        }
      } catch (err: unknown) {
        setShowSkipModal(true); // re-open modal so they can try again
        toast.error("Failed to skip stop", {
          description: getErrorMessage(err),
        });
      } finally {
      setMutating(null);
      }
    },
    [activeStop, autoRoutedStops, navigate, routeInfo, runRouteAction],
  );

  const handleEndRoute = useCallback(async () => {
    if (!routeInfo) return;
    setMutating("end");
    setShowEndModal(false);

    try {
      await runRouteAction(() => endRoute(routeInfo.routeId));
      toast.success("Route ended successfully.");
      navigate("/collector");
    } catch (err: unknown) {
      toast.error("Failed to end route", {
        description: getErrorMessage(err),
      });
    } finally {
      setMutating(null);
    }
  }, [routeInfo, navigate, runRouteAction]);

  // ─── Render guards ──────────────────────────────────────────────────────────
  if (isLoading) return <RouteMapSkeleton />;

  if (error) return <RouteMapError message={error} onRetry={refresh} onBack={() => navigate("/collector")} />;

  if (!matchesCollectorRouteAlert(searchParams, routeInfo)) {
    return <RouteMapError title="Route alert unavailable" backLabel="Back to notifications" message="The route in this notification is no longer your current assignment. Return to notifications to review the alert." onRetry={refresh} onBack={() => navigate("/collector/notifications")} />;
  }

  if (!routeInfo) {
    return <NoScheduledRouteView onRetry={refresh} onViewHistory={() => navigate("/collector/route-history")} onBackToDashboard={() => navigate("/collector")} />;
  }

  // Active Stop Card render function (used both on mobile above the map and desktop in sidebar)
  const renderActiveStopCard = () => {
    if (!hasStartedRoute && isScheduledRoute) {
      return (
        <div className="bg-card border border-border/80 rounded-2xl p-5 text-center space-y-2 shrink-0 shadow-xs">
          <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-sm font-display font-bold text-foreground">
            Route is scheduled
          </p>
          <p className="text-xs text-muted-foreground">
            Start the route when you are ready to depart. Scheduled for{" "}
            {routeInfo.startedAt.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}.
          </p>
        </div>
      );
    }

    if (!hasStartedRoute) {
      return (
        <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 text-center space-y-3.5 shrink-0 shadow-xs">
          <div className="w-11 h-11 mx-auto rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
            <Navigation className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm sm:text-base font-display font-bold text-foreground tracking-tight">
              Ready to begin collection route?
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Start your shift run when you depart for the first stop. This activates live GPS telemetry and resident alerts.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-muted/20 border border-border/60 text-left flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground font-medium">Initial checkpoint:</span>
            <span className="font-bold text-foreground font-display truncate">
              {autoRoutedStops[0]?.barangay || "First Stop"}
            </span>
          </div>

          <Button
            type="button"
            onClick={handleStartRoute}
            disabled={isStartingRoute || isPaused}
            className="w-full h-11 sm:h-12 rounded-xl font-bold text-xs sm:text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer active:scale-[0.99] transition-all"
          >
            {isStartingRoute ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Starting route...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4 fill-current" /> Start collection route
              </span>
            )}
          </Button>
        </div>
      );
    }

    if (activeStop) {
      return (
        <div
          className={cn(
            "bg-card border shadow-xs rounded-2xl p-3.5 sm:p-4 space-y-3 shrink-0 transition-all",
            isWithinGeofence
              ? "border-primary/60 bg-primary/[0.04] ring-2 ring-primary/20"
              : "border-border/80"
          )}
        >
          {/* Geofence Arrival Alert */}
          {isWithinGeofence && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-bold">
              <Radio className="w-4 h-4 shrink-0 animate-pulse" />
              <span className="truncate">Arrived at destination zone (within 150m)</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-mono font-bold shrink-0 shadow-xs">
                {activeStop.stopNumber}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span className="truncate">{isWithinGeofence ? "Arrived at zone" : "Current target checkpoint"}</span>
                </div>
                <p className="text-base sm:text-lg font-display font-bold text-foreground leading-tight truncate mt-0.5">
                  {activeStop.barangay}
                </p>
              </div>
            </div>

            {activeStop.distanceKm > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums shrink-0 border border-border/80 bg-muted/60 text-foreground font-mono shadow-2xs">
                <Navigation className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{activeStop.distanceKm} km</span>
              </span>
            )}
          </div>

          {/* Action Buttons: Mark as Done is dominant primary, Skip is secondary */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleMarkDone}
                disabled={mutating !== null || isPaused}
                className={cn(
                  "flex-1 h-12 rounded-xl text-xs sm:text-sm font-bold shadow-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer min-w-0",
                  isWithinGeofence
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25 ring-2 ring-primary/30"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                )}
              >
                {mutating === "done" ? (
                  <span className="flex items-center gap-1.5 truncate">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Saving...</span>
                  </span>
                ) : isWithinGeofence ? (
                  <span className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">Complete stop (Arrived)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">Mark stop as cleared</span>
                  </span>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSkipModal(true)}
                disabled={mutating !== null || isPaused}
                className="h-12 px-3.5 rounded-xl text-xs sm:text-sm font-semibold border-border/80 bg-background/60 hover:bg-muted/70 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/40 active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Skip this stop"
              >
                <SkipForward className="w-4 h-4 shrink-0" />
                <span>Skip</span>
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-card border border-border/80 rounded-2xl p-5 text-center space-y-2 shrink-0 shadow-xs">
        <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <p className="text-sm font-display font-bold text-foreground">
          All checkpoints completed
        </p>
        <p className="text-xs text-muted-foreground">
          Great job! You can safely conclude your shift route below.
        </p>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-3 sm:space-y-4 pb-4 px-1 sm:px-0">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display tracking-tight truncate">
              Live route navigation
            </h1>
          </div>
          <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground truncate">
            Checkpoint navigation and stop collection management
          </p>
        </div>
      </div>

      {/* Route Command Header & Integrated Progress Bar (Req 1) */}

      <RouteProgressBar
        completed={completed}
        total={routeInfo.totalStops}
        routeName={routeInfo.routeName}
        wasteType={routeInfo.wasteType}
        elapsed={elapsed}
        isScheduled={isScheduledRoute}
        isPaused={isPaused}
        hasStarted={hasStartedRoute}
      />

      {/* Amber "Route Paused" Banner (Req 6 & 7) */}
      {isPaused && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 shadow-2xs">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-semibold text-amber-800 dark:text-amber-300">
                Route paused
              </span>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                GPS updates and collection actions are temporarily on hold. Residents and dispatchers see that your truck is paused.
              </p>
            </div>
          </div>
        </div>
      )}

      {hasStartedRoute && !isPaused && (gpsError || !truckCoords) && (
        <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          {gpsError || "Waiting for a fresh GPS location. Truck position is unavailable."}
        </div>
      )}
      {isOffline && (
        <div className="flex items-center gap-2 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-medium shadow-2xs">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="truncate">You are offline</span>
          {pendingSync > 0 && (
            <span className="ml-1 text-muted-foreground truncate">
              — {pendingSync} GPS ping{pendingSync > 1 ? "s" : ""} queued, will sync when reconnected
            </span>
          )}
        </div>
      )}

      {!hasStartedRoute ? (
        <div className="mx-auto w-full max-w-xl py-4">
          {renderActiveStopCard()}
        </div>
      ) : (
        <>
          {/* Mobile Active Stop Card — highlights current task right at top for instant one-tap actions (Req 10) */}
          <div className="lg:hidden">
            {renderActiveStopCard()}
          </div>

          {/* Main Layout — stacked on mobile, side-by-side on desktop */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-5 items-start">
        {/* Map Viewport — dynamically responsive height from mobile to ultra-wide */}
        <div className="lg:col-span-3 h-[320px] xs:h-[360px] sm:h-[420px] md:h-[480px] lg:h-[620px] xl:h-[680px] w-full">
          <RouteMapView
            stops={autoRoutedStops}
            truckCoords={resolvedTruckCoords}
            activeStopCoords={activeStop?.hasCoordinates === false ? null : activeStop?.coords ?? null}
          />
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 flex flex-col gap-3 lg:h-[620px] xl:h-[680px] min-w-0">
          {/* Active Stop Card on desktop (Req 2 & 3) */}
          <div className="hidden lg:block shrink-0">
            {renderActiveStopCard()}
          </div>

          {/* Stop List Header */}
          <div className="flex items-center justify-between px-1 shrink-0 pt-0.5 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <h2 className="text-xs sm:text-sm font-display font-bold text-foreground tracking-tight truncate">
                Collection checkpoints
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-muted/80 text-muted-foreground font-semibold tabular-nums shrink-0 border border-border/60">
                {autoRoutedStops.length} stops
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">
              {completed > 0 && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 text-primary font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{completed} cleared</span>
                </span>
              )}
              {skipped > 0 && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                  <SkipForward className="w-3 h-3" />
                  <span>{skipped} skipped</span>
                </span>
              )}
            </div>
          </div>

          {/* Scrollable Stop List (Strictly scheduled order, Req 8) */}
          <div className="flex-1 min-h-[160px] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              {autoRoutedStops.map((stop) => (
                <StopListItem key={stop.id} stop={stop} />
              ))}
            </div>
          </div>

          {/* Route Lifecycle Actions: Pause & End (Pinned at Bottom of Panel, Req 4 & 5) */}
          <div className="shrink-0 pt-3 border-t border-border/80 space-y-2">
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={handleTogglePause}
                disabled={!hasStartedRoute || isScheduledRoute || mutating !== null || isPauseUpdating}
                className={cn(
                  "h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-bold shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0",
                  isPaused
                    ? "bg-amber-600 hover:bg-amber-700 text-white border-0 shadow-amber-600/20"
                    : "border-border/80 bg-card hover:bg-muted/80 text-foreground"
                )}
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4 shrink-0 fill-current" />
                    <span className="truncate">Resume<span className="hidden min-[380px]:inline"> route</span></span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 shrink-0" />
                    <span className="truncate">Pause<span className="hidden min-[380px]:inline"> route</span></span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowEndModal(true)}
                disabled={mutating === "end" || isScheduledRoute || isPauseUpdating}
                className="h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-0 min-w-0"
              >
                {mutating === "end" ? (
                  <span className="flex items-center gap-1.5 truncate">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Ending...</span>
                  </span>
                ) : (
                  <>
                    <Flag className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {remaining === 0 ? "Conclude shift" : "End route"}
                    </span>
                  </>
                )}
              </Button>
            </div>

            {/* Explanatory Destructive Warning Note (Req 5) */}
            {remaining > 0 ? (
              <p className="text-[10px] sm:text-[11px] text-muted-foreground dark:text-muted-foreground/90 font-medium text-center flex items-center justify-center gap-1 leading-tight px-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>
                  Ending route marks all <strong className="text-rose-600 dark:text-rose-400 font-bold">{remaining}</strong> unfinished stop{remaining > 1 ? "s" : ""} as missed.
                </span>
              </p>
            ) : (
              <p className="text-[10px] sm:text-[11px] text-muted-foreground text-center leading-tight">
                All stops completed. Conclude your shift to submit logs.
              </p>
            )}
          </div>
        </div>
          </div>
        </>
      )}

      {/* Modals */}
      <SkipReasonModal
        open={showSkipModal}
        barangay={activeStop?.barangay ?? ""}
        onConfirm={handleSkipConfirm}
        onCancel={() => setShowSkipModal(false)}
      />
      <EndRouteModal
        open={showEndModal}
        remaining={remaining}
        onConfirm={handleEndRoute}
        onCancel={() => setShowEndModal(false)}
      />
    </div>
  );
};

export default CollectorRouteMap;
