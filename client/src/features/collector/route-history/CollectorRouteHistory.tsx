import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  History,
  MapPin,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Truck,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BackButton } from "@/components/common";
import {
  fetchDriverMyHistory,
  RouteHistoryItem,
} from "@/services/driverManagerService";
import { toast } from "@/lib/toast";

export type StatusFilter = "all" | "completed" | "partial";
export type WasteTypeFilter = "all" | "Biodegradable" | "Non-Biodegradable";

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All routes" },
  { key: "completed", label: "Completed" },
  { key: "partial", label: "Partial" },
];

const wasteTabs: { key: WasteTypeFilter; label: string }[] = [
  { key: "all", label: "All waste types" },
  { key: "Biodegradable", label: "Biodegradable" },
  { key: "Non-Biodegradable", label: "Non-biodegradable" },
];

const RouteHistorySkeleton = () => (
  <div className="w-full max-w-[1200px] mx-auto space-y-4 sm:space-y-5 pb-8">
    {/* Page Header */}
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl shrink-0" />
      <div className="space-y-1.5 min-w-0 flex-1">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>
    </div>

    {/* Filter Toolbar Skeleton */}
    <div className="bg-card border border-border/80 rounded-2xl p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl border border-border/60">
        <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
        <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
        <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
      </div>
      <div className="flex items-center gap-1.5">
        <Skeleton className="h-8 w-28 rounded-xl shrink-0" />
        <Skeleton className="h-8 w-32 rounded-xl shrink-0" />
        <Skeleton className="h-8 w-36 rounded-xl shrink-0" />
      </div>
    </div>

    {/* Route Items List */}
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-card border border-border/80 rounded-2xl p-4 sm:p-4.5 flex items-center justify-between gap-3 sm:gap-4 shadow-2xs"
        >
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-5 w-20 rounded-lg" />
                <Skeleton className="h-5 w-24 rounded-lg" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
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
        cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
        icon: CheckCircle2,
      };
    case "partial":
      return {
        label: "Partial",
        cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
        icon: AlertTriangle,
      };
    default:
      return {
        label: "No collection",
        cls: "bg-muted text-muted-foreground border-border/70",
        icon: Clock,
      };
  }
};

const getWasteBadge = (wasteType?: string | null) => {
  if (!wasteType) return null;
  const lower = wasteType.toLowerCase();
  const isBio = lower.includes("bio") && !lower.includes("non");
  const isRecycle = lower.includes("recycle") || lower.includes("plastic");
  const isHazardous = lower.includes("hazard") || lower.includes("special");

  const dotColor = isBio
    ? "bg-emerald-500"
    : isRecycle
    ? "bg-amber-500"
    : isHazardous
    ? "bg-rose-500"
    : "bg-sky-500";

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border border-border/70 bg-muted/60 text-foreground/85 shadow-2xs">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{wasteType}</span>
    </span>
  );
};

const MiniRing = ({ pct }: { pct: number }) => {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  const strokeClass =
    pct >= 90
      ? "text-primary"
      : pct >= 70
      ? "text-amber-500"
      : "text-rose-500";

  return (
    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          className="text-muted/60"
        />
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

  const filtered = useMemo(() => {
    return historyList.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (wasteFilter !== "all" && e.wasteType !== wasteFilter) return false;
      return true;
    });
  }, [historyList, statusFilter, wasteFilter]);

  if (isLoading) return <RouteHistorySkeleton />;

  /* ────── Route Detail View ────── */
  if (selectedRoute) {
    const r = selectedRoute;
    const detailBadge = getStatusBadge(r.status);
    const DetailStatusIcon = detailBadge.icon;

    return (
      <div className="w-full max-w-[1200px] mx-auto space-y-4 sm:space-y-5 pb-8">
        <BackButton
          label="Back to route history"
          onClick={() => {
            setSearchParams({});
            setSelectedRoute(null);
          }}
        />

        {/* Route Run Header Card */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold font-display text-foreground tracking-tight">
                  {r.routeName}
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs ${detailBadge.cls}`}
                >
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
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/40 border border-border/60 text-xs font-semibold text-foreground shrink-0 self-start sm:self-auto">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="tabular-nums font-mono">Shift duration: {r.timeOnRoute}</span>
              </div>
            )}
          </div>

          {/* 4 Summary Stat Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-left">
            <div className="bg-muted/30 border border-border/60 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Cleared checkpoints
              </span>
              <p className="text-lg sm:text-xl font-bold text-foreground font-display tabular-nums mt-1 font-mono">
                {r.completedStops} / {r.totalStops}
              </p>
            </div>

            <div className="bg-muted/30 border border-border/60 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Skipped checkpoints
              </span>
              <p
                className={`text-lg sm:text-xl font-bold font-display tabular-nums mt-1 font-mono ${
                  r.skippedStops > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground"
                }`}
              >
                {r.skippedStops}
              </p>
            </div>

            <div className="bg-muted/30 border border-border/60 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Completion rate
              </span>
              <p className="text-lg sm:text-xl font-bold text-primary font-display tabular-nums mt-1 font-mono">
                {r.completionPct}%
              </p>
            </div>

            <div className="bg-muted/30 border border-border/60 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Shift duration
              </span>
              <p className="text-lg sm:text-xl font-bold text-foreground font-display tabular-nums mt-1 font-mono">
                {r.timeOnRoute || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Checkpoint Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold font-display text-foreground tracking-tight">
                Checkpoint breakdown
              </h3>
            </div>
            <span className="text-xs font-semibold text-muted-foreground tabular-nums font-mono px-2 py-0.5 rounded-lg bg-muted/60 border border-border/60">
              {r.stops?.length || 0} total stops
            </span>
          </div>

          {!r.stops || r.stops.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card p-6 text-center text-xs text-muted-foreground shadow-xs">
              No individual checkpoint records logged for this collection route.
            </div>
          ) : (
            <div className="space-y-2">
              {r.stops.map((stop) => {
                const isSkipped = stop.status === "skipped";
                const isCleared = stop.status === "done";
                return (
                  <div
                    key={stop.stopNumber}
                    className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-xl border transition-all ${
                      isSkipped
                        ? "border-amber-500/25 bg-amber-500/5"
                        : isCleared
                          ? "border-border/80 bg-card shadow-2xs"
                          : "border-border/70 bg-muted/25"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 mt-0.5 border ${
                        isSkipped
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
                          : isCleared
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted text-muted-foreground border-border/70"
                      }`}
                    >
                      {stop.stopNumber}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {stop.barangay}
                        </p>
                        {isSkipped ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0">
                            <AlertTriangle className="w-3 h-3" /> Skipped
                          </span>
                        ) : isCleared ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Cleared
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border/70 shrink-0">
                            <Clock className="w-3 h-3" /> Not completed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap font-medium">
                        {stop.time && (
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" /> {stop.time}
                          </span>
                        )}
                        {stop.residentsNotified && stop.residentsNotified > 0 && (
                          <>
                            <span className="text-border">•</span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="w-3 h-3" /> {stop.residentsNotified} residents notified
                            </span>
                          </>
                        )}
                      </div>

                      {stop.skipReason && (
                        <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 font-medium">
                          <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>
                            Skip reason: <strong className="font-semibold">{stop.skipReason}</strong>
                          </span>
                        </div>
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
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold font-display text-foreground tracking-tight">
                  Dispatch communications
                </h3>
              </div>
              <span className="text-xs font-semibold text-muted-foreground tabular-nums font-mono px-2 py-0.5 rounded-lg bg-muted/60 border border-border/60">
                {r.adminMessages.length} message{r.adminMessages.length > 1 ? "s" : ""}
              </span>
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
    <div className="w-full max-w-[1200px] mx-auto space-y-4 sm:space-y-5 pb-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display tracking-tight truncate">
              Route history
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5 truncate">
              Review previous collection shifts, verified stops, and completion performance
            </p>
        </div>

      </div>

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`group h-9 px-3.5 rounded-xl border text-xs whitespace-nowrap transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 select-none cursor-pointer active:scale-95 ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25 font-bold"
                    : "bg-card border-border/80 text-muted-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-foreground font-semibold"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <Select value={wasteFilter} onValueChange={(value) => setWasteFilter(value as WasteTypeFilter)}>
          <SelectTrigger className="h-9 w-full sm:w-[190px] rounded-xl border-border/80 bg-muted/30 text-xs font-semibold">
            <SelectValue placeholder="All waste types" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {wasteTabs.map((tab) => (
              <SelectItem key={tab.key} value={tab.key} className="text-xs">
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Route Logs List ── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card p-8 sm:p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto mb-3 text-muted-foreground border border-border/50">
            <History className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-bold text-foreground font-display">
            No route logs found
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No past collection shifts match your selected status or waste filter.
          </p>
          {(statusFilter !== "all" || wasteFilter !== "all") && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStatusFilter("all");
                setWasteFilter("all");
              }}
              className="mt-4 h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Reset filters
            </Button>
          )}
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
                className="group flex items-center justify-between gap-3 sm:gap-4 p-4 sm:p-4.5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 transition-all cursor-pointer shadow-2xs active:scale-[0.995]"
              >
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                  <MiniRing pct={item.completionPct} />

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold font-display text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                        {item.routeName}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs ${badge.cls}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                      {getWasteBadge(item.wasteType)}
                    </div>

                    <div className="flex items-center gap-x-3 gap-y-1 text-xs text-muted-foreground flex-wrap font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
                        {item.dayOfWeek}, {item.date}
                      </span>
                      <span className="text-border">•</span>
                      <span className="inline-flex items-center gap-1 font-mono text-foreground/80">
                        <Truck className="w-3.5 h-3.5 text-muted-foreground/80" />
                        {item.truckName ? `${item.truckName} (${item.truckPlate})` : item.truckPlate}
                      </span>
                      <span className="text-border">•</span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground/80" />
                        {item.completedStops}/{item.totalStops} cleared
                      </span>
                      {item.timeOnRoute && (
                        <>
                          <span className="text-border">•</span>
                          <span className="inline-flex items-center gap-1 font-mono">
                            <Clock className="w-3.5 h-3.5 text-muted-foreground/80" />
                            {item.timeOnRoute}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-xl bg-muted/40 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-all shrink-0">
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
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
