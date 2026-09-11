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

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import RouteProgressBar from "./components/RouteProgressBar";
import RouteMapView from "./components/RouteMapView";
import StopListItem from "./components/StopListItem";
import AnimatedList from "@/components/AnimatedList";
import SkipReasonModal from "./components/SkipReasonModal";
import EndRouteModal from "./components/EndRouteModal";
import { useRouteData } from "./hooks/useRouteData";
import { useLiveTracking } from "./hooks/useLiveTracking";
import { useScheduledRouteOrder } from "./hooks/useAutoRoute";
import {
  completeStop,
  skipStop,
  endRoute,
  startMyRoute,
  setMyRoutePaused,
  updateMyDriverStatusMessage,
  fetchMyDriverMessages,
  markMyDriverMessagesAsRead,
  type DriverMessageRow,
} from "@/services/trackingService";
import CollectorDynamicMessages, {
  type DynamicMessage,
} from "./components/CollectorDynamicMessages";
import type { SkipReason } from "./types";

const getErrorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Please try again.";

const parseServerTimestamp = (value: string | null | undefined): Date => {
  if (!value) return new Date();

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/,
  );

  if (match) {
    const [, year, month, day, hour, minute, second, ms = "0"] = match;
    return new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        Number(ms.padEnd(3, "0")),
      ),
    );
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

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

// ─── Error State ──────────────────────────────────────────────────────

const RouteMapError = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="w-full max-w-[1600px] mx-auto flex flex-col items-center justify-center py-20 gap-4">
    <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
      <AlertCircle className="w-7 h-7 text-destructive" />
    </div>
    <div className="text-center space-y-1">
      <p className="text-base font-display font-bold text-foreground">
        Could not load route
      </p>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
    </div>
    <Button variant="outline" onClick={onRetry} className="gap-2">
      <RefreshCw className="w-4 h-4" />
      Try Again
    </Button>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────

const CollectorRouteMap = () => {
  const navigate = useNavigate();

  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isRouteEnded, setIsRouteEnded] = useState(false);
  const [isPauseUpdating, setIsPauseUpdating] = useState(false);
  const [isStartingRoute, setIsStartingRoute] = useState(false);
  const [messageRows, setMessageRows] = useState<DriverMessageRow[]>([]);
  // Tracks which stop is being mutated to show per-button loading states
  const [mutating, setMutating] = useState<"done" | "skip" | "end" | null>(
    null,
  );

  // ─── Data hooks ───────────────────────────────────────────────────────────
  const { stops, routeInfo, isLoading, error, refresh, updateStopLocally } =
    useRouteData();
  const isScheduledRoute = Boolean(
    routeInfo?.startedAt && routeInfo.startedAt.getTime() > Date.now(),
  );
  const isPaused = routeInfo?.routeStatus === "PAUSED";
  const hasStartedRoute = Boolean(routeInfo?.collectionStartedAt);

  const { truckCoords, isOffline, pendingSync } = useLiveTracking({
    truckId: routeInfo?.truckId ?? null,
    isRouteEnded,
    isTrackingEnabled: !isScheduledRoute && hasStartedRoute && !isPaused,
  });

  // ─── Auto-route: sort remaining stops by proximity ─────────────────────────
  // Keep the collector, resident, and admin views on the exact stop order
  // scheduled by the admin. GPS is used for the road path and ETA only; it
  // must never reorder collection barangays by straight-line proximity.
  const autoRoutedStops = useScheduledRouteOrder(stops);

  // ─── Elapsed timer with pause support ─────────────────────────────────────
  const [elapsed, setElapsed] = useState("0h 00m 00s");
  const [routeStartMs, setRouteStartMs] = useState<number | null>(null);
  const activeRouteIdRef = useRef<string | null>(null);
  const pauseStartMsRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef<number>(0);

  const handleTogglePause = useCallback(async () => {
    if (!routeInfo || isPauseUpdating) return;
    setIsPauseUpdating(true);
    try {
      const nextPaused = !isPaused;
      await setMyRoutePaused(routeInfo.routeId, nextPaused);
      refresh();
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
  }, [isPaused, isPauseUpdating, refresh, routeInfo]);

  useEffect(() => {
    if (!routeInfo) {
      activeRouteIdRef.current = null;
      setRouteStartMs(null);
      totalPausedMsRef.current = 0;
      pauseStartMsRef.current = null;
      return;
    }

    const candidate = routeInfo.collectionStartedAt?.getTime();
    const safeStart = Number.isFinite(candidate) ? (candidate as number) : null;

    if (
      activeRouteIdRef.current !== routeInfo.routeId ||
      (safeStart !== null && routeStartMs === null)
    ) {
      activeRouteIdRef.current = routeInfo.routeId;
      setRouteStartMs(safeStart);
      totalPausedMsRef.current = 0;
      pauseStartMsRef.current = null;
    }
  }, [routeInfo, routeStartMs]);

  // Freeze elapsed collection time while paused. This is intentionally kept
  // separate from GPS status so a resumed route continues from the same active
  // work duration instead of counting the break.
  useEffect(() => {
    if (!routeStartMs) return;

    if (isPaused) {
      if (pauseStartMsRef.current === null) pauseStartMsRef.current = Date.now();
      return;
    }

    if (pauseStartMsRef.current !== null) {
      totalPausedMsRef.current += Date.now() - pauseStartMsRef.current;
      pauseStartMsRef.current = null;
    }
  }, [isPaused, routeStartMs]);

  const handleStartRoute = useCallback(async () => {
    if (!routeInfo || isStartingRoute) return;
    setIsStartingRoute(true);
    try {
      await startMyRoute(routeInfo.routeId);
      // Show a clean zero-based timer immediately. The next route refresh
      // replaces this with the server's UTC start timestamp.
      activeRouteIdRef.current = routeInfo.routeId;
      setRouteStartMs(Date.now());
      totalPausedMsRef.current = 0;
      pauseStartMsRef.current = null;
      refresh();
      toast.success("Route started", {
        description: "GPS tracking and route timing are now active.",
      });
    } catch (err: unknown) {
      toast.error("Could not start route", { description: getErrorMessage(err) });
    } finally {
      setIsStartingRoute(false);
    }
  }, [isStartingRoute, refresh, routeInfo]);

  useEffect(() => {
    if (!routeStartMs) {
      setElapsed("0h 00m 00s");
      return;
    }

    const tick = () => {
      let pausedExtra = totalPausedMsRef.current;
      if (pauseStartMsRef.current) {
        pausedExtra += Date.now() - pauseStartMsRef.current;
      }
      const diff = Date.now() - routeStartMs - pausedExtra;
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
  }, [routeStartMs, isPaused]);

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

  // Fall back to center of all stop coords if no live GPS yet
  const resolvedTruckCoords = useMemo<[number, number]>(() => {
    if (truckCoords) return truckCoords;
    const active = autoRoutedStops.find((s) => s.status === "in-progress");
    return active?.coords ?? [14.0388, 121.4285];
  }, [truckCoords, autoRoutedStops]);

  // Geofence detection (150 meters = 0.15 km)
  const GEOFENCE_RADIUS_KM = 0.15;
  const isWithinGeofence = useMemo(() => {
    if (!activeStop || !truckCoords) return false;
    const distKm = activeStop.distanceKm ?? 0;
    return distKm > 0 && distKm <= GEOFENCE_RADIUS_KM;
  }, [activeStop, truckCoords]);

  const systemMessages = useMemo<DynamicMessage[]>(() => {
    const now = Date.now();
    const messages: DynamicMessage[] = [];

    if (routeInfo) {
      messages.push({
        id: `route-${routeInfo.routeId}`,
        sender: "admin",
        senderName: "Route System",
        text: `Today's route is ${routeInfo.routeName}. Waste type: ${routeInfo.wasteType}.`,
        timestamp: new Date(now - 15 * 60 * 1000),
      });
    }

    if (isScheduledRoute && routeInfo) {
      messages.push({
        id: `scheduled-${routeInfo.routeId}`,
        sender: "admin",
        senderName: "Route System",
        text: `Route is scheduled and will start at ${routeInfo.startedAt.toLocaleTimeString(
          "en-US",
          {
            hour: "numeric",
            minute: "2-digit",
          },
        )}.`,
        timestamp: new Date(now - 2 * 60 * 1000),
      });
    } else if (activeStop) {
      messages.push({
        id: `active-${activeStop.id}`,
        sender: "admin",
        senderName: "Route System",
        text: `${activeStop.barangay} is the next barangay in the admin's scheduled route.`,
        timestamp: new Date(now - 8 * 60 * 1000),
      });
    }

    if (nextStops.length > 0) {
      messages.push({
        id: `queue-${nextStops.map((stop) => stop.id).join("-")}`,
        sender: "admin",
        senderName: "Route System",
        text: `Upcoming queue: ${nextStops.map((stop) => stop.barangay).join(", ")}.`,
        timestamp: new Date(now - 5 * 60 * 1000),
      });
    }

    if (isOffline) {
      messages.push({
        id: `offline-${pendingSync}`,
        sender: "admin",
        senderName: "Route System",
        text:
          pendingSync > 0
            ? `You are offline. ${pendingSync} GPS ping${pendingSync > 1 ? "s are" : " is"} queued and will sync automatically once your connection returns.`
            : "You are offline. Route order will continue using the last known truck position until the connection returns.",
        timestamp: new Date(now - 2 * 60 * 1000),
      });
    } else if (routeInfo) {
      messages.push({
        id: `progress-${completed}-${remaining}`,
        sender: "admin",
        senderName: "Route System",
        text:
          remaining > 0
            ? `Progress update: ${completed}/${routeInfo.totalStops} stops completed, ${remaining} remaining.`
            : `All ${routeInfo.totalStops} stops have been handled. You can end the route when ready.`,
        timestamp: new Date(now - 60 * 1000),
      });
    }

    return messages;
  }, [
    activeStop,
    completed,
    isOffline,
    nextStops,
    pendingSync,
    remaining,
    routeInfo,
  ]);

  useEffect(() => {
    let cancelled = false;

    const routeId = routeInfo?.routeId;
    if (!routeId) {
      setMessageRows([]);
      return () => {
        cancelled = true;
      };
    }

    const loadRouteMessages = async () => {
      try {
        const rows = await fetchMyDriverMessages(routeId, 200);
        if (!cancelled) {
          setMessageRows(rows);
        }
      } catch {
        if (!cancelled) {
          setMessageRows([]);
        }
      }
    };

    void loadRouteMessages();
    const interval = setInterval(loadRouteMessages, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [routeInfo?.routeId]);

  const allMessages = useMemo<DynamicMessage[]>(
    () =>
      messageRows.map((row) => ({
        id: `route-message-${row.id}`,
        sender: row.sender_role?.toUpperCase() === "DRIVER" ? "collector" : "admin",
        senderName:
          row.sender_role?.toUpperCase() === "DRIVER"
            ? "You"
            : row.sender_name || "Admin",
        text: row.message,
        timestamp: parseServerTimestamp(row.created_at),
      })),
    [messageRows],
  );

  const unreadAdminCount = useMemo(
    () =>
      messageRows.filter(
        (row) => row.sender_role?.toUpperCase() !== "DRIVER" && !row.is_read,
      ).length,
    [messageRows],
  );

  const markAdminMessagesAsRead = useCallback(async () => {
    const routeId = routeInfo?.routeId;
    if (!routeId) return;

    await markMyDriverMessagesAsRead(routeId);
    setMessageRows((prev) =>
      prev.map((row) =>
        row.sender_role?.toUpperCase() !== "DRIVER"
          ? { ...row, is_read: true }
          : row,
      ),
    );
  }, [routeInfo?.routeId]);

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

    // Optimistic update â€” UI feels instant
    const now = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    updateStopLocally(activeStop.id, { status: "done", completedAt: now });

    try {
      await completeStop(routeInfo.routeId, activeStop.id);

      // Explicitly close the route after its final stop. The server also
      // performs this check, but this client-side confirmation makes the
      // admin's one route-completion notification reliable if the backend
      // receives stop updates before a live process reload. endRoute is
      // idempotent, so a route already closed by the server is safe here.
      if (isFinalOutstandingStop) {
        await endRoute(routeInfo.routeId);
        setIsRouteEnded(true);
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
      // Revert optimistic update on failure
      updateStopLocally(activeStop.id, {
        status: "in-progress",
        completedAt: undefined,
      });
      toast.error("Failed to mark stop as done", {
        description: getErrorMessage(err),
      });
    } finally {
      setMutating(null);
    }
  }, [activeStop, autoRoutedStops, navigate, routeInfo, updateStopLocally]);

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

      // Optimistic update
      updateStopLocally(activeStop.id, {
        status: "skipped",
        skippedReason: fullReason,
      });
      setShowSkipModal(false);

      try {
        await skipStop(routeInfo.routeId, activeStop.id, fullReason);

        if (isFinalOutstandingStop) {
          await endRoute(routeInfo.routeId);
          setIsRouteEnded(true);
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
        // Revert
        updateStopLocally(activeStop.id, {
          status: "in-progress",
          skippedReason: undefined,
        });
        setShowSkipModal(true); // re-open modal so they can try again
        toast.error("Failed to skip stop", {
          description: getErrorMessage(err),
        });
      } finally {
        setMutating(null);
      }
    },
    [activeStop, autoRoutedStops, navigate, routeInfo, updateStopLocally],
  );

  const handleEndRoute = useCallback(async () => {
    if (!routeInfo) return;
    setMutating("end");
    setShowEndModal(false);

    try {
      await endRoute(routeInfo.routeId);
      setIsRouteEnded(true);
      toast.success("Route ended successfully.");
      navigate("/collector");
    } catch (err: unknown) {
      toast.error("Failed to end route", {
        description: getErrorMessage(err),
      });
    } finally {
      setMutating(null);
    }
  }, [routeInfo, navigate]);

  const handleSendReply = useCallback(async (message: string) => {
    try {
      if (!routeInfo?.routeId) {
        throw new Error("No active route for this message.");
      }
      await updateMyDriverStatusMessage(message, routeInfo.routeId);
      setMessageRows((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          driver_id: "",
          route_id: routeInfo.routeId,
          sender_user_id: "",
          sender_role: "DRIVER",
          sender_name: "You",
          message,
          is_read: true,
          created_at: new Date().toISOString(),
        },
      ]);
      toast.success("Reply sent to admin");
    } catch (err: unknown) {
      toast.error("Failed to send reply", {
        description: getErrorMessage(err),
      });
      throw err;
    }
  }, [routeInfo?.routeId]);
  // â”€â”€â”€ Render guards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isLoading) return <RouteMapSkeleton />;
  if (error) return <RouteMapError message={error} onRetry={refresh} />;
  if (!routeInfo)
    return (
      <RouteMapError message="No route assigned for today." onRetry={refresh} />
    );

  // Active Stop Card render function (used both on mobile above the map and desktop in sidebar)
  const renderActiveStopCard = () => {
    if (!hasStartedRoute && !isScheduledRoute) {
      return (
        <div className="bg-card border border-primary/25 rounded-2xl p-5 text-center space-y-3 shrink-0 shadow-2xs">
          <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-display font-bold text-foreground">Ready to start collection?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Start the route when you begin collecting. This starts the live GPS and route timer.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleStartRoute}
            disabled={isStartingRoute || isPaused}
            className="w-full h-11 rounded-xl font-bold"
          >
            {isStartingRoute ? "Starting..." : "Start Route"}
          </Button>
        </div>
      );
    }

    if (activeStop) {
      return (
        <div
          className={cn(
            "bg-card border shadow-xs rounded-2xl p-3 sm:p-4 space-y-2.5 sm:space-y-3 shrink-0 transition-all",
            isWithinGeofence
              ? "border-primary/60 bg-primary/[0.04] ring-2 ring-primary/20"
              : "border-border/80"
          )}
        >
          {/* Geofence Arrival Alert */}
          {isWithinGeofence && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-bold animate-in fade-in">
              <Radio className="w-4 h-4 shrink-0 animate-pulse" />
              <span className="truncate">Arrived at destination zone (within 150m)</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-black shrink-0 shadow-xs">
                {activeStop.stopNumber}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] sm:text-[11px] font-bold text-primary uppercase tracking-wider block truncate">
                  {isWithinGeofence ? "Arrived • Target" : "Target Stop"}
                </span>
                <p className="text-sm sm:text-base md:text-lg font-display font-extrabold text-foreground leading-tight truncate">
                  {activeStop.barangay}
                </p>
              </div>
            </div>

            {activeStop.distanceKm > 0 && (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold tabular-nums shrink-0 border border-border/70 bg-muted/60 text-foreground shadow-2xs">
                <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                <span>{activeStop.distanceKm} km</span>
              </span>
            )}
          </div>

          {/* Action Buttons: Mark as Done is dominant primary (Req 2), Skip is secondary (Req 3) */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              {/* Primary Action Button: Mark as Done */}
              <Button
                type="button"
                onClick={handleMarkDone}
                disabled={mutating !== null || isPaused}
                className={cn(
                  "flex-1 h-12 sm:h-13 rounded-xl text-xs sm:text-sm md:text-base font-extrabold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-w-0",
                  isWithinGeofence
                    ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/25 ring-2 ring-primary/30"
                    : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/20"
                )}
              >
                {mutating === "done" ? (
                  <span className="flex items-center gap-1.5 truncate">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Completing...</span>
                  </span>
                ) : isWithinGeofence ? (
                  <span className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="truncate">Complete Stop</span>
                    <span className="hidden min-[400px]:inline text-xs opacity-90">(Arrived)</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 truncate">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="truncate">Mark as Done</span>
                  </span>
                )}
              </Button>

              {/* Secondary Action Button: Skip Stop */}
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSkipModal(true)}
                disabled={mutating !== null || isPaused}
                className="h-12 sm:h-13 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border-border/80 bg-background/60 hover:bg-muted/70 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/40 active:scale-[0.98] transition-all flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer"
              >
                <SkipForward className="w-4 h-4 shrink-0" />
                <span>Skip<span className="hidden min-[360px]:inline"> Stop</span></span>
              </Button>
            </div>

          </div>
        </div>
      );
    }

    if (isScheduledRoute) {
      return (
        <div className="bg-card border border-border/80 rounded-2xl p-5 text-center space-y-2 shrink-0 shadow-2xs">
          <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-sm font-display font-bold text-foreground">
            Route is Scheduled
          </p>
          <p className="text-xs text-muted-foreground">
            Tracking starts at{" "}
            {routeInfo.startedAt.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
            .
          </p>
        </div>
      );
    }

    return (
      <div className="bg-card border border-border/80 rounded-2xl p-5 text-center space-y-2 shrink-0 shadow-2xs">
        <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <p className="text-sm font-display font-bold text-foreground">
          All Stops Completed
        </p>
        <p className="text-xs text-muted-foreground">
          Great job! You can safely end your route below.
        </p>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-3 sm:space-y-4 pb-4 px-1 sm:px-0">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-2.5 sm:gap-3 pb-1">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
          <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground font-display tracking-tight truncate">
            Truck Tracking
          </h1>
          <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground truncate">
            Live route navigation, stop management, and collection progress
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
        currentBarangay={activeStop?.barangay ?? null}
        currentStopNumber={activeStop?.stopNumber ?? null}
        currentDistanceKm={activeStop?.distanceKm ?? null}
        isWithinGeofence={isWithinGeofence}
      />

      {/* Amber "Route Paused" Banner (Req 6 & 7) */}
      {isPaused && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-950 dark:text-amber-200 shadow-2xs">
          <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Route Paused
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-200/90 mt-0.5 font-medium leading-relaxed">
                GPS updates and collection actions are temporarily on hold. Residents and dispatchers see that your truck is paused.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Offline sync indicator */}
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
            activeStopCoords={activeStop?.coords ?? null}
          />
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 flex flex-col gap-3 lg:h-[620px] xl:h-[680px] min-w-0">
          {/* Active Stop Card on desktop (Req 2 & 3) */}
          <div className="hidden lg:block shrink-0">
            {renderActiveStopCard()}
          </div>

          {/* Messages Drawer */}
          <div className="shrink-0">
            <CollectorDynamicMessages
              systemMessages={allMessages}
              unreadCount={unreadAdminCount}
              onOpen={() => {
                void markAdminMessagesAsRead();
              }}
              onSendReply={handleSendReply}
            />
          </div>

          {/* Stop List Header */}
          <div className="flex items-center justify-between px-1 shrink-0 pt-0.5 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <h2 className="text-xs sm:text-sm font-display font-bold text-foreground tracking-tight truncate">
                Route Stop List
              </h2>
              <span className="text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md bg-muted/80 text-muted-foreground font-semibold tabular-nums shrink-0 border border-border/60">
                {autoRoutedStops.length} stops
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">
              {completed > 0 && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 text-primary font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{completed} done</span>
                </span>
              )}
              {skipped > 0 && (
                <span className="inline-flex items-center gap-0.5 sm:gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                  <SkipForward className="w-3 h-3" />
                  <span>{skipped} skipped</span>
                </span>
              )}
              <span>
                {remaining} left
              </span>
            </div>
          </div>

          {/* Scrollable Stop List (Strictly scheduled order, Req 8) */}
          <div className="flex-1 min-h-[160px] overflow-y-auto pr-1">
            <AnimatedList
              items={autoRoutedStops}
              getKey={(s) => s.id}
              className="space-y-1.5"
            >
              {(stop) => <StopListItem stop={stop} />}
            </AnimatedList>
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
                    <span className="truncate">Resume<span className="hidden min-[380px]:inline"> Route</span></span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 shrink-0" />
                    <span className="truncate">Pause<span className="hidden min-[380px]:inline"> Route</span></span>
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
                    <span className="truncate">End<span className="hidden min-[380px]:inline"> Route</span></span>
                  </>
                )}
              </Button>
            </div>

            {/* Explanatory Destructive Warning Note (Req 5) */}
            {remaining > 0 ? (
              <p className="text-[10px] sm:text-[11px] text-muted-foreground dark:text-muted-foreground/90 font-medium text-center flex items-center justify-center gap-1 leading-tight px-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>
                  Ending the route marks all <strong className="text-rose-600 dark:text-rose-400 font-bold">{remaining}</strong> unfinished stop{remaining > 1 ? "s" : ""} as missed/skipped.
                </span>
              </p>
            ) : (
              <p className="text-[10px] sm:text-[11px] text-muted-foreground text-center leading-tight">
                All stops completed. End route to finish your shift.
              </p>
            )}
          </div>
        </div>
      </div>

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
