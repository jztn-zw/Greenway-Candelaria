import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  History, MapPin, SkipForward, Target,
  ChevronRight, Leaf, Droplet, Clock,
  CheckCircle2, AlertTriangle, Users,
  Truck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
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
  <div className="w-full max-w-[1200px] mx-auto space-y-5 pb-8 animate-in fade-in duration-300">
    {/* Page Header */}
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3.5 w-64" />
      </div>
    </div>

    {/* 3 Summary KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-16" />
          </div>
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        </div>
      ))}
    </div>

    {/* Filter Toolbar Skeleton */}
    <div className="bg-card border border-border rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
      <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/60 overflow-hidden">
        <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
        <Skeleton className="h-8 w-28 rounded-lg shrink-0" />
        <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
      </div>
      <div className="flex items-center gap-1.5 overflow-hidden">
        <Skeleton className="h-8 w-28 rounded-xl shrink-0" />
        <Skeleton className="h-8 w-28 rounded-xl shrink-0" />
        <Skeleton className="h-8 w-32 rounded-xl shrink-0" />
      </div>
    </div>

    {/* Route Items List (Exact match with route card structure) */}
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            {/* Mini Progress Ring skeleton */}
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-6 w-12 rounded-md hidden sm:block" />
            <Skeleton className="w-5 h-5 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const statusBadge = (status: RouteHistoryItem["status"]) => {
  switch (status) {
    case "completed": return { label: "Completed", cls: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 dark:bg-emerald-500/20 font-semibold" };
    case "partial": return { label: "Partial", cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 dark:bg-amber-500/20 font-semibold" };
    default: return { label: "No Collection", cls: "bg-muted text-muted-foreground border-border font-medium" };
  }
};

const ringColor = (pct: number) => (pct >= 90 ? "text-primary" : pct >= 70 ? "text-amber-500" : "text-destructive");

/* ────── Completion Ring SVG ────── */
const MiniRing = ({ pct }: { pct: number }) => {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="44" height="44" className="shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
      <circle
        cx="22" cy="22" r={r} fill="none"
        stroke="currentColor"
        strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        className={ringColor(pct)}
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="22" textAnchor="middle" dominantBaseline="central"
        className="fill-foreground text-[10px] font-bold">
        {pct}%
      </text>
    </svg>
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

  // Tabs drag support
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tabsContainerRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - tabsContainerRef.current.offsetLeft;
    scrollLeftRef.current = tabsContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !tabsContainerRef.current) return;
    const x = e.pageX - tabsContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    tabsContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

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
    return () => { isMounted = false; };
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
  const totalSkipped = historyList.reduce((s, e) => s + e.skippedStops, 0);
  const avgCompletion = historyList.length > 0
    ? Math.round(historyList.reduce((s, e) => s + e.completionPct, 0) / historyList.length)
    : 100;

  if (isLoading) return <RouteHistorySkeleton />;

  /* ────── Route Detail View ────── */
  if (selectedRoute) {
    const r = selectedRoute;
    return (
      <div className="w-full max-w-[1200px] mx-auto space-y-5 pb-8 animate-in fade-in duration-300">
        <BackButton
          label="Back to Route History"
          onClick={() => { setSearchParams({}); setSelectedRoute(null); }}
        />

        {/* Header Summary */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">{r.dayOfWeek}</p>
              <h2 className="text-lg sm:text-xl font-display font-bold text-foreground">{r.date}</h2>
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <Badge className={`text-xs ${r.wasteType === "Biodegradable" ? "bg-primary/15 text-primary border-primary/20" : "bg-blue-500/15 text-blue-600 border-blue-500/20"}`}>
                  {r.wasteType === "Biodegradable" ? <Leaf className="w-3 h-3 mr-1" /> : <Droplet className="w-3 h-3 mr-1" />}
                  {r.wasteType}
                </Badge>
                <span className="text-xs text-muted-foreground">{r.routeName}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  <Truck className="w-3 h-3 text-muted-foreground" /> {r.truckPlate}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center pt-1">
            <div className="bg-muted/40 border border-border/60 rounded-xl py-3">
              <p className="text-lg sm:text-xl font-bold text-foreground">{r.completedStops}/{r.totalStops}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Stops Done</p>
            </div>
            <div className="bg-muted/40 border border-border/60 rounded-xl py-3">
              <p className="text-lg sm:text-xl font-bold text-foreground">{r.skippedStops}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Skipped</p>
            </div>
            <div className="bg-muted/40 border border-border/60 rounded-xl py-3">
              <p className="text-lg sm:text-xl font-bold text-primary">{r.completionPct}%</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Completion</p>
            </div>
          </div>
        </div>

        {/* Stop by Stop Breakdown */}
        <div className="space-y-3">
          <h3 className="text-sm font-display font-semibold text-foreground px-1 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> Stop by Stop Breakdown
          </h3>

          {r.stops.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border">
              No stop records logged for this route.
            </div>
          ) : (
            <div className="space-y-2">
              {r.stops.map((stop) => (
                <div
                  key={stop.stopNumber}
                  className={`flex items-start gap-3.5 px-4 py-3 rounded-2xl border transition-colors ${
                    stop.status === "skipped"
                      ? "border-yellow-500/20 bg-yellow-500/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    stop.status === "done"
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "bg-yellow-500/15 text-yellow-600 border border-yellow-500/20"
                  }`}>
                    {stop.stopNumber}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{stop.barangay}</p>
                      {stop.status === "done" ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {stop.status === "done" ? `Completed at ${stop.time}` : `Skipped`}
                    </p>
                    {stop.skipReason && (
                      <p className="text-[11px] text-yellow-700 dark:text-yellow-400 font-medium mt-1 bg-yellow-500/10 px-2 py-0.5 rounded-md inline-block">
                        Reason: {stop.skipReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Residents Notified */}
        {r.stops.some((s) => s.residentsNotified && s.residentsNotified > 0) && (
          <div className="space-y-2">
            <h3 className="text-sm font-display font-semibold text-foreground px-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Residents Notified
            </h3>
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              {r.stops.filter((s) => s.residentsNotified && s.residentsNotified > 0).map((stop) => (
                <div key={stop.stopNumber} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-foreground">{stop.barangay}</span>
                  <span className="text-xs text-muted-foreground">{stop.residentsNotified} residents notified</span>
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
    <div className="w-full max-w-[1200px] mx-auto space-y-5 pb-8 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm text-primary">
          <History className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground font-display">
            Route History
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Your collection shift logs, completed stops, and performance summary
          </p>
        </div>
      </div>

      {/* ── 3 Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Completed Routes</p>
              <p className="text-2xl font-bold text-foreground font-display mt-0.5">{routesCompleted}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Skipped Stops</p>
              <p className="text-2xl font-bold text-foreground font-display mt-0.5">{totalSkipped}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-600">
              <SkipForward className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Completion</p>
              <p className="text-2xl font-bold text-primary font-display mt-0.5">{avgCompletion}%</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Target className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
        {/* Left: Primary Status Segmented Pill Control */}
        <div
          ref={tabsContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/60 overflow-x-auto no-scrollbar"
        >
          {statusTabs.map((tab) => {
            const count = statusCounts[tab.key];
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  if (hasDraggedRef.current) return;
                  setStatusFilter(tab.key);
                }}
                className={`flex-1 min-w-[95px] sm:min-w-0 h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 select-none cursor-pointer ${
                  isActive
                    ? "bg-card text-foreground font-bold shadow-2xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] font-bold leading-none rounded-full flex items-center justify-center shrink-0 px-1.5 py-0.5 ${
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

        {/* Right: Waste Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          <span className="text-[11px] font-semibold text-muted-foreground px-1 hidden md:inline shrink-0">
            Waste:
          </span>
          {[
            { key: "all" as WasteTypeFilter, label: "All Waste", shortLabel: "All" },
            { key: "Biodegradable" as WasteTypeFilter, label: "Biodegradable", shortLabel: "Bio" },
            { key: "Non-Biodegradable" as WasteTypeFilter, label: "Non-Bio", shortLabel: "Non-Bio" },
          ].map((tab) => {
            const isActive = wasteFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setWasteFilter(tab.key)}
                className={`flex-1 sm:flex-initial h-8 px-2.5 sm:px-3 rounded-xl text-xs whitespace-nowrap transition-all duration-200 flex items-center justify-center shrink-0 select-none cursor-pointer border ${
                  isActive
                    ? "bg-primary/15 text-primary border-primary/30 font-semibold shadow-2xs"
                    : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium"
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Route Logs List ── */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/50">
          <History className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No route logs found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Completed collection shifts matching your selected filter will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const badge = statusBadge(item.status);
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSearchParams({ route: item.id, name: item.routeName });
                  setSelectedRoute(item);
                }}
                className="flex items-center justify-between gap-3 p-4 bg-card border border-border rounded-2xl hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <MiniRing pct={item.completionPct} />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground truncate">{item.routeName}</p>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>{item.date} ({item.dayOfWeek})</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Truck className="w-3 h-3" /> {item.truckPlate}
                      </span>
                      <span>·</span>
                      <span>{item.completedStops}/{item.totalStops} stops</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CollectorRouteHistory;
