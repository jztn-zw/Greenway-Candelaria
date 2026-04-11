/**
 * CollectorRouteMap.tsx
 *
 * The collector's live route management screen.
 * All data comes from the backend â€” no static mock data used in production.
 *
 * Data flow:
 *   useRouteData     â†’ fetches today's route + stops from /routes/today/mine
 *   useLiveTracking  â†’ polls /tracking/live for truck GPS + pings driver location
 *
 * Mutations (mark done, skip, end route) call the API first, then update state
 * optimistically for instant UI feedback. On API failure, we refresh from server.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Leaf,
  Droplet,
  Clock,
  MapPin,
  SkipForward,
  Square,
  WifiOff,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import RouteProgressBar from "./components/RouteProgressBar";
import RouteMapView from "./components/RouteMapView";
import StopListItem from "./components/StopListItem";
import AnimatedList from "@/components/AnimatedList";
import SkipReasonModal from "./components/SkipReasonModal";
import EndRouteModal from "./components/EndRouteModal";
import { useRouteData } from "./hooks/useRouteData";
import { useLiveTracking } from "./hooks/useLiveTracking";
import { useAutoRoute } from "./hooks/useAutoRoute";
import {
  completeStop,
  skipStop,
  endRoute,
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

// â”€â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const RouteMapSkeleton = () => (
  <div className="w-full max-w-[1600px] mx-auto space-y-4 pb-4">
    <Skeleton className="h-2.5 w-full rounded-full" />
    <div className="flex flex-wrap items-center gap-3 px-1">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-20 ml-auto" />
    </div>
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Skeleton className="h-[360px] lg:h-[540px] w-full rounded-xl" />
      </div>
      <div className="lg:col-span-2 space-y-3">
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border"
          >
            <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          </div>
        ))}
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

// â”€â”€â”€ Error State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CollectorRouteMap = () => {
  const navigate = useNavigate();

  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [isRouteEnded, setIsRouteEnded] = useState(false);
  const [messageRows, setMessageRows] = useState<DriverMessageRow[]>([]);
  // Tracks which stop is being mutated to show per-button loading states
  const [mutating, setMutating] = useState<"done" | "skip" | "end" | null>(
    null,
  );

  // â”€â”€â”€ Data hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { stops, routeInfo, isLoading, error, refresh, updateStopLocally } =
    useRouteData();
  const isScheduledRoute = Boolean(
    routeInfo?.startedAt && routeInfo.startedAt.getTime() > Date.now(),
  );

  const { truckCoords, isOffline, pendingSync } = useLiveTracking({
    truckId: routeInfo?.truckId ?? null,
    isRouteEnded,
    isTrackingEnabled: !isScheduledRoute,
  });

  // â”€â”€â”€ Auto-route: sort remaining stops by proximity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const autoRoutedStops = useAutoRoute(stops, truckCoords);

  // â”€â”€â”€ Elapsed timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [elapsed, setElapsed] = useState("0h 00m 00s");
  const [routeStartMs, setRouteStartMs] = useState<number | null>(null);
  const activeRouteIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!routeInfo) {
      activeRouteIdRef.current = null;
      setRouteStartMs(null);
      return;
    }

    const candidate = routeInfo.startedAt?.getTime();
    const safeStart = Number.isFinite(candidate) ? (candidate as number) : Date.now();

    if (activeRouteIdRef.current !== routeInfo.routeId) {
      activeRouteIdRef.current = routeInfo.routeId;
      setRouteStartMs(safeStart);
    }
  }, [routeInfo]);

  useEffect(() => {
    if (!routeStartMs) {
      setElapsed("0h 00m 00s");
      return;
    }

    const tick = () => {
      const diff = Date.now() - routeStartMs;
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
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [routeStartMs]);

  // â”€â”€â”€ Derived state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        text:
          activeStop.distanceKm > 0
            ? `${activeStop.barangay} is currently the closest barangay and has been moved to the front of the queue (${activeStop.distanceKm} km away).`
            : `${activeStop.barangay} is currently the closest barangay and is now first in the queue.`,
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

    // Optimistic update â€” UI feels instant
    const now = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    updateStopLocally(activeStop.id, { status: "done", completedAt: now });

    try {
      await completeStop(routeInfo.routeId, activeStop.id);
      toast.success(`${activeStop.barangay} marked as done`, {
        description: "Residents have been notified.",
      });
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
  }, [activeStop, routeInfo, updateStopLocally]);

  const handleSkipConfirm = useCallback(
    async (reason: SkipReason, notes?: string) => {
      if (!activeStop || !routeInfo) return;
      setMutating("skip");

      const fullReason = reason === "Other" ? (notes ?? reason) : reason;

      // Optimistic update
      updateStopLocally(activeStop.id, {
        status: "skipped",
        skippedReason: fullReason,
      });
      setShowSkipModal(false);

      try {
        await skipStop(routeInfo.routeId, activeStop.id);
        toast.warning(`${activeStop.barangay} skipped`, {
          description: `Reason: ${reason}`,
        });
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
    [activeStop, routeInfo, updateStopLocally],
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

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-3 sm:space-y-4 pb-4 px-1 sm:px-0">
      {/* Progress Bar */}
      <RouteProgressBar completed={completed} total={routeInfo.totalStops} />

      {/* Route Summary Header */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-1">
        <h1 className="text-sm sm:text-base font-display font-bold text-foreground truncate">
          {routeInfo.routeName}
        </h1>
        <Badge
          className={`${
            routeInfo.wasteType === "Biodegradable"
              ? "bg-primary/15 text-primary border-primary/20"
              : "bg-blue-500/15 text-blue-600 border-blue-500/20"
          } text-[10px] sm:text-xs`}
        >
          {routeInfo.wasteType === "Biodegradable" ? (
            <Leaf className="w-3 h-3 mr-1" />
          ) : (
            <Droplet className="w-3 h-3 mr-1" />
          )}
          {routeInfo.wasteType}
        </Badge>
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          {routeInfo.totalStops} stops
        </div>
        {isScheduledRoute && (
          <Badge className="text-[10px] sm:text-xs bg-yellow-500/15 text-yellow-700 border-yellow-500/30">
            Scheduled
          </Badge>
        )}
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground ml-auto">
          <Clock className="w-3 h-3" />
          <span className="font-mono tabular-nums">{elapsed}</span>
        </div>
      </div>

      {/* Offline sync indicator */}
      {isOffline && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 text-xs font-medium">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          You are offline
          {pendingSync > 0 && (
            <span className="ml-1">
              — {pendingSync} ping{pendingSync > 1 ? "s" : ""} queued, will sync
              when reconnected
            </span>
          )}
        </div>
      )}

      {/* Main Layout — stacked on mobile, side-by-side on desktop */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-5">
        {/* Map */}
        <div className="lg:col-span-3 h-[280px] sm:h-[360px] lg:h-[540px]">
          <RouteMapView
            stops={autoRoutedStops}
            truckCoords={resolvedTruckCoords}
            isOffline={isOffline}
          />
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-2 flex flex-col gap-3 lg:max-h-[540px]">
          {/* Active Stop Card */}
          {activeStop ? (
            <div className="bg-card border border-blue-500/20 rounded-xl p-3 sm:p-4 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                    {activeStop.stopNumber}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">
                      Current Stop
                    </p>
                    <p className="text-sm sm:text-base font-display font-bold text-foreground leading-tight">
                      {activeStop.barangay}
                    </p>
                  </div>
                </div>
                {activeStop.distanceKm > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {activeStop.distanceKm} km
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleMarkDone}
                  disabled={mutating !== null}
                  className="h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {mutating === "done" ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    "Mark as Done"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSkipModal(true)}
                  disabled={mutating !== null}
                  className="h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-semibold border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/5"
                >
                  <SkipForward className="w-4 h-4 mr-1" />
                  Skip
                </Button>
              </div>
            </div>
          ) : isScheduledRoute ? (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 sm:p-5 text-center space-y-2 shrink-0">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <p className="text-sm font-display font-bold text-foreground">
                Route is scheduled
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
          ) : (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 sm:p-5 text-center space-y-2 shrink-0">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-display font-bold text-foreground">
                All stops completed!
              </p>
              <p className="text-xs text-muted-foreground">
                You can end your route now.
              </p>
            </div>
          )}

          {/* Messages — collapsible, NOT overlapping */}
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

          {/* Stop List header */}
          <div className="flex items-center justify-between px-1 shrink-0">
            <h2 className="text-sm font-display font-semibold text-foreground">
              Stop List
            </h2>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground tabular-nums">
                {completed} done · {skipped} skipped · {remaining} left
            </span>
          </div>

          {/* Scrollable stop list */}
          <AnimatedList
            items={autoRoutedStops}
            getKey={(s) => s.id}
            className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1"
          >
            {(stop) => <StopListItem stop={stop} />}
          </AnimatedList>

          {/* End Route — pinned bottom */}
          <div className="shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowEndModal(true)}
              disabled={mutating === "end" || isScheduledRoute}
              className="w-full h-10 sm:h-11 rounded-xl text-xs sm:text-sm font-semibold border-destructive/30 text-destructive hover:bg-destructive/5"
            >
              {mutating === "end" ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                    Ending Route...
                </span>
              ) : (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  End Route
                </>
              )}
            </Button>
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





