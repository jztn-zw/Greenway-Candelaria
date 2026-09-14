import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  History, MapPin, SkipForward, Target,
  ChevronRight, Clock, CheckCircle2, AlertTriangle, Users,
  Truck, MessageSquare,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/common";
import {
  fetchDriverMyHistory,
  RouteHistoryItem,
} from "@/services/driverManagerService";
import { toast } from "@/lib/toast";

export type StatusFilter = "all" | "completed" | "partial";
export type WasteTypeFilter = "all" | "Biodegradable" | "Non-Biodegradable";

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All Routes" },
  { key: "completed", label: "Completed" },
  { key: "partial", label: "Partial" },
];

const wasteTabs: { key: WasteTypeFilter; label: string }[] = [
  { key: "all", label: "All Waste Types" },
  { key: "Biodegradable", label: "Biodegradable" },
  { key: "Non-Biodegradable", label: "Non-Biodegradable" },
];

const RouteHistorySkeleton = () => (
  <div className="w-full max-w-[1200px] mx-auto space-y-5 pb-8">
    {/* Page Header */}
    <div className="flex items-center gap-3">
      <Skeleton className="w-11 h-11 rounded-2xl shrink-0" />
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3.5 w-64" />
      </div>
    </div>

    {/* 3 Summary KPI Cards */}
    <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card border border-border/80 rounded-2xl p-3 sm:p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl shrink-0" />
          </div>
          <div className="mt-2 sm:mt-3 space-y-1">
            <Skeleton className="h-6 sm:h-8 w-14" />
            <Skeleton className="h-3 w-24 hidden sm:block" />
          </div>
        </div>
      ))}
    </div>

    {/* Filter Toolbar Skeleton */}
    <div className="bg-card border border-border/80 rounded-2xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/60">
        <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
        <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
        <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
      </div>
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-8 w-24 rounded-xl shrink-0" />
        <Skeleton className="h-8 w-28 rounded-xl shrink-0" />
        <Skeleton className="h-8 w-32 rounded-xl shrink-0" />
      </div>
    </div>

    {/* Route Items List */}
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border/80 rounded-2xl p-3.5 sm:p-4.5 flex items-center justify-between gap-3 sm:gap-4 shadow-2xs"
        >
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
          <Skeleton className="w-4 h-4 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

const getStatusBadge = (status: RouteHistoryItem["status"]) => {
  switch (status) {
    case "completed":
      return {
        label: "Completed",
        cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
        icon: CheckCircle2,
      };
    case "partial":
      return {
        label: "Partial",
        cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25",
        icon: AlertTriangle,
      };
    default:
      return {
        label: "No Collection",
        cls: "bg-muted text-muted-foreground border-border/70",
        icon: Clock,
      };
  }
};

const getWasteBadge = (wasteType?: string | null) => {
  if (!wasteType) return null;
  const lower = wasteType.toLowerCase();
  const isBio = lower.includes("bio") && !lower.includes("non");
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
        isBio
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
          : "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25"
      }`}
    >
      {wasteType}
    </span>
  );
};

const MiniRing = ({ pct }: { pct: number }) => {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  const strokeClass = pct >= 90 ? "text-primary" : pct >= 70 ? "text-amber-500" : "text-destructive";

  return (
    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={strokeClass}
        />
      </svg>
      <span className="absolute text-[10px] font-bold font-mono text-foreground tabular-nums">
        {pct}%
      </span>
    </div>
  );
};

/* ────── Main Component ────── */
const CollectorRouteHistory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParam = searchParams.get("route");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [wasteFilter, setWasteFilter] = useState<WasteTypeFilter>("all");
  const [selectedRoute, setSelectedRoute] = useState<RouteHistoryItem | null>(null);
  const [historyList, setHistoryList] = useState<RouteHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        const data = await fetchDriverMyHistory(50);
        if (isMounted) {
          setHistoryList(data);
        }
      } catch {
        toast.error("Failed to load route history");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadHistory();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync URL param → selectedRoute (handles deep links & topbar back nav)
  useEffect(() => {
    if (!routeParam) {
      if (selectedRoute) setSelectedRoute(null);
      return;
    }
    if (selectedRoute?.id === routeParam) return;
    const match = historyList.find((r) => r.id === routeParam);
    if (match) setSelectedRoute(match);
  }, [routeParam, historyList]);

  const statusCounts = useMemo(() => {
    return {
      all: historyList.length,
      completed: historyList.filter((e) => e.status === "completed").length,
      partial: historyList.filter((e) => e.status === "partial").length,
    };
  }, [historyList]);

  const filtered = useMemo(() => {
    return historyList.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (wasteFilter !== "all" && e.wasteType !== wasteFilter) return false;
      return true;
    });
  }, [historyList, statusFilter, wasteFilter]);

  // Summary Metrics
  const routesCompleted = historyList.filter((e) => e.status === "completed").length;
  const totalSkipped = historyList.reduce((s, e) => s + (e.skippedStops || 0), 0);
  const avgCompletion =
    historyList.length > 0
      ? Math.round(historyList.reduce((s, e) => s + (e.completionPct || 0), 0) / historyList.length)
      : 100;

  if (isLoading) return <RouteHistorySkeleton />;

  /* ────── Route Detail View ────── */
  if (selectedRoute) {
    const r = selectedRoute;
    const detailBadge = getStatusBadge(r.status);
    const DetailStatusIcon = detailBadge.icon;

    return (
      <div className="w-full max-w-[1200px] mx-auto space-y-5 pb-8">
        <BackButton
          label="Back to Route History"
          onClick={() => {
            setSearchParams({});
            setSelectedRoute(null);
          }}
        />

        {/* Route Run Header Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold font-display text-foreground tracking-tight">
                  {r.routeName}
                </h2>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${detailBadge.cls}`}>
                  <DetailStatusIcon className="w-3.5 h-3.5" />
                  {detailBadge.label}
                </span>
                {getWasteBadge(r.wasteType)}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                {r.dayOfWeek}, {r.date} · Vehicle: {r.truckName ? `${r.truckName} (${r.truckPlate})` : r.truckPlate}
              </p>
            </div>

            {r.timeOnRoute && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/40 border border-border/60 text-xs font-semibold text-foreground shrink-0 self-start sm:self-auto">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Shift Duration: {r.timeOnRoute}</span>
              </div>
            )}
          </div>

          {/* 4 Summary Stat Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-left">
            <div className="bg-muted/30 border border-border/60 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Stops Done
              </span>
              <p className="text-lg sm:text-xl font-bold text-foreground font-display tabular-nums mt-1">
                {r.completedStops} / {r.totalStops}
              </p>
            </div>

            <div className="bg-muted/30 border border-border/60 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Skipped Stops
              </span>
              <p className={`text-lg sm:text-xl font-bold font-display tabular-nums mt-1 ${r.skippedStops > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {r.skippedStops}
              </p>
            </div>

            <div className="bg-muted/30 border border-border/60 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Completion Rate
              </span>
              <p className="text-lg sm:text-xl font-bold text-primary font-display tabular-nums mt-1">
                {r.completionPct}%
              </p>
            </div>

            <div className="bg-muted/30 border border-border/60 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Time
              </span>
              <p className="text-lg sm:text-xl font-bold text-foreground font-display tabular-nums mt-1">
                {r.timeOnRoute || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Stop by Stop Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold font-display text-foreground tracking-tight uppercase">
                Stop by Stop Breakdown
              </h3>
            </div>
            <span className="text-xs font-semibold text-muted-foreground font-mono">
              {r.stops?.length || 0} Total Stops
            </span>
          </div>

          {!r.stops || r.stops.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card p-6 text-center text-xs text-muted-foreground shadow-xs">
              No individual stop records logged for this collection route.
            </div>
          ) : (
            <div className="space-y-2">
              {r.stops.map((stop) => {
                const isSkipped = stop.status === "skipped";
                return (
                  <div
                    key={stop.stopNumber}
                    className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl border transition-all ${
                      isSkipped
                        ? "border-amber-500/25 bg-amber-500/5"
                        : "border-border/80 bg-card shadow-2xs"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 border ${
                        isSkipped
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
                          : "bg-primary/10 text-primary border-primary/20"
                      }`}
                    >
                      {stop.stopNumber}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-foreground truncate">
                          {stop.barangay}
                        </p>
                        {isSkipped ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
                            <AlertTriangle className="w-3 h-3" /> Skipped
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap font-medium">
                        {stop.time && <span>Time: {stop.time}</span>}
                        {stop.residentsNotified && stop.residentsNotified > 0 && (
                          <>
                            <span className="text-border">•</span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {stop.residentsNotified} residents notified
                            </span>
                          </>
                        )}
                      </div>

                      {stop.skipReason && (
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium pt-0.5">
                          Skip Reason: <span className="font-semibold">{stop.skipReason}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dispatch Communications logged during this route */}
        {r.adminMessages && r.adminMessages.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold font-display text-foreground tracking-tight uppercase">
                Dispatch Communications During Run
              </h3>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card divide-y divide-border/60 overflow-hidden shadow-xs">
              {r.adminMessages.map((msg, idx) => (
                <div key={idx} className="p-3.5 sm:p-4 flex items-start justify-between gap-3">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-foreground">
                      {msg.message}
                    </p>
                  </div>
                  {msg.time && (
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0 mt-0.5">
                      {msg.time}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ────── Main List View ────── */
  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-5 pb-8">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs text-primary">
          <History className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground font-display tracking-tight">
            Route History
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
            Your collection shift logs, completed stops, and performance summary
          </p>
        </div>
      </div>

      {/* ── 3 Summary KPI Cards ── */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {/* Completed Routes */}
        <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4.5 flex flex-col justify-between shadow-2xs hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
              Completed Routes
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display tabular-nums tracking-tight">
              {routesCompleted}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate font-medium">
              Successfully finished runs
            </p>
          </div>
        </div>

        {/* Skipped Stops */}
        <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4.5 flex flex-col justify-between shadow-2xs hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
              Skipped Stops
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground font-display tabular-nums tracking-tight">
              {totalSkipped}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate font-medium">
              Total bypassed locations
            </p>
          </div>
        </div>

        {/* Avg Completion */}
        <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4.5 flex flex-col justify-between shadow-2xs hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
              Avg Completion
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary font-display tabular-nums tracking-tight">
              {avgCompletion}%
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate font-medium">
              Across all logged runs
            </p>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-2 sm:p-2.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Status Segmented Controls */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/60 overflow-x-auto no-scrollbar">
          {statusTabs.map((tab) => {
            const count = statusCounts[tab.key];
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`flex-1 sm:flex-initial h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 shrink-0 select-none cursor-pointer ${
                  isActive
                    ? "bg-card text-foreground font-bold shadow-2xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] font-bold leading-none rounded-full px-1.5 py-0.5 ${
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Waste Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {wasteTabs.map((tab) => {
            const isActive = wasteFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setWasteFilter(tab.key)}
                className={`flex-1 sm:flex-initial h-8 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center shrink-0 select-none cursor-pointer border ${
                  isActive
                    ? "bg-primary/10 text-primary border-primary/30 shadow-2xs"
                    : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Route Logs List ── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card p-8 sm:p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground border border-border/50">
            <History className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-bold text-foreground font-display">No Route Logs Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No past collection shifts match your selected status or waste filter.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const badge = getStatusBadge(item.status);
            const StatusIcon = badge.icon;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSearchParams({ route: item.id, name: item.routeName });
                  setSelectedRoute(item);
                }}
                className="group flex items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4.5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                  <MiniRing pct={item.completionPct} />

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold font-display text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                        {item.routeName}
                      </h3>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border ${badge.cls}`}>
                        <StatusIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                      {getWasteBadge(item.wasteType)}
                    </div>

                    <div className="flex items-center gap-x-3 gap-y-1 text-xs text-muted-foreground flex-wrap font-medium">
                      <span>{item.dayOfWeek}, {item.date}</span>
                      <span className="text-border">•</span>
                      <span className="flex items-center gap-1 font-mono text-foreground/80">
                        <Truck className="w-3 h-3 text-muted-foreground" />
                        {item.truckName ? `${item.truckName} (${item.truckPlate})` : item.truckPlate}
                      </span>
                      <span className="text-border">•</span>
                      <span>{item.completedStops}/{item.totalStops} stops</span>
                      {item.timeOnRoute && (
                        <>
                          <span className="text-border">•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {item.timeOnRoute}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CollectorRouteHistory;
