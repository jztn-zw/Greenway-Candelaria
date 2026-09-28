import { useInfiniteQuery } from "@tanstack/react-query";
import { FilterTabCount } from "@/components/common/FilterTabCount";
import { collectorKey, collectorQueryDefaults, useCollectorQuery } from "@/lib/collectorQuery";
import useAuthStore from "@/store/authStore";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  History,
  MapPin,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  fetchCollectorHistoryPage,
  fetchCollectorHistoryRun,
  RouteHistoryItem,
} from "@/services/driverManagerService";

type StatusFilter = "all" | "completed" | "partial" | "no-collection";
type WasteTypeFilter = "all" | "Biodegradable" | "Non-Biodegradable" | "General";

const statusTabs: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All routes" },
  { key: "completed", label: "Completed" },
  { key: "partial", label: "Partial" },
  { key: "no-collection", label: "No collection" },
];

const wasteTabs: { key: WasteTypeFilter; label: string }[] = [
  { key: "all", label: "All waste types" },
  { key: "Biodegradable", label: "Biodegradable" },
  { key: "Non-Biodegradable", label: "Non-biodegradable" },
  { key: "General", label: "General" },
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

const vehicleLabel = (route: RouteHistoryItem) => {
  const name = route.truckName || "Historical vehicle unavailable";
  return route.truckPlate && route.truckPlate !== "N/A" ? `${name} (${route.truckPlate})` : name;
};

/* ────── Main Component ────── */
const CollectorRouteHistory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeParam = searchParams.get("route");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [wasteFilter, setWasteFilter] = useState<WasteTypeFilter>("all");
  const user = useAuthStore((state) => state.user);
  const history = useInfiniteQuery({
    queryKey: collectorKey(user?.id, "history", "list", statusFilter, wasteFilter),
    queryFn: ({ pageParam }) => fetchCollectorHistoryPage({ status: statusFilter, waste_type: wasteFilter, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    ...collectorQueryDefaults, enabled: user?.role === "DRIVER" && !routeParam,
  });
  const detail = useCollectorQuery("history", ["detail", routeParam], () => fetchCollectorHistoryRun(routeParam!), { enabled: Boolean(routeParam) });
  const selectedRoute = routeParam ? detail.data ?? null : null;
  const historyList = [...new Map((history.data?.pages.flatMap((page) => page.items) ?? []).map((item) => [item.id, item])).values()];
  const isLoading = routeParam ? detail.isLoading : history.isLoading || history.isFetchingNextPage;
  const failure = routeParam ? detail.error : history.error;
  const error = failure ? "Route history could not be loaded. Please try again." : null;
  const notFound = Boolean(routeParam && (failure as { response?: { status?: number } } | null)?.response?.status === 404);
  const nextCursor = history.hasNextPage;
  const total = history.data?.pages[0]?.total ?? 0;
  const retry = () => { if (routeParam) void detail.refetch(); else void history.refetch(); };
  const changeStatus = (status: StatusFilter) => setStatusFilter(status);
  const changeWaste = (waste: WasteTypeFilter) => setWasteFilter(waste);
  const filtered = historyList;
  if (isLoading && (routeParam || historyList.length === 0)) return <RouteHistorySkeleton />;
  if (routeParam && selectedRoute?.id !== routeParam && !error && !notFound) return <RouteHistorySkeleton />;
  if (routeParam && selectedRoute?.id !== routeParam) return <div role="alert" className="rounded-xl border border-border p-5"><h2 className="font-bold">{notFound ? "Route not found" : "Could not load route history"}</h2><p>{notFound ? "This route is unavailable or does not belong to your account." : error}</p>{!notFound && <Button onClick={() => retry()}>Retry</Button>}</div>;

  /* ────── Route Detail View ────── */
  if (selectedRoute) {
    const r = selectedRoute;
    const detailBadge = getStatusBadge(r.status);
    const DetailStatusIcon = detailBadge.icon;

    return (
      <div className="w-full max-w-[1200px] mx-auto space-y-4 sm:space-y-5 pb-8">
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
                {r.dayOfWeek}, {r.date} · Vehicle: {vehicleLabel(r)}
              </p>
            </div>

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
                Active collection time
              </span>
              <p className="text-lg sm:text-xl font-bold text-foreground font-display tabular-nums mt-1 font-mono">
                {r.timeOnRoute ?? "Unavailable"}
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
                    key={stop.id ?? stop.stopNumber}
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
                          <span title="Active collection time" className="inline-flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3" /> {stop.time}
                          </span>
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
                aria-pressed={isActive} onClick={() => changeStatus(tab.key)}
                className={`group h-9 px-3.5 rounded-xl border text-xs whitespace-nowrap transition-all duration-200 flex items-center justify-center gap-1.5 shrink-0 select-none cursor-pointer active:scale-95 ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/25 font-bold"
                    : "bg-card border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground font-semibold"
                }`}
              >
                <span>{tab.label}</span>
                {isActive && history.isSuccess && <FilterTabCount count={total} />}
              </button>
            );
          })}
        </div>

        <Select value={wasteFilter} onValueChange={(value) => changeWaste(value as WasteTypeFilter)}>
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

      {error && <div role="alert" className="rounded-xl border border-destructive/30 p-4"><p>{error}</p><Button disabled={isLoading} onClick={() => retry()}>Retry</Button></div>}
      {/* ── Route Logs List ── */}
      {filtered.length === 0 && !error ? (
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
                changeStatus("all");
                changeWaste("all");
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
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setSearchParams({ route: item.id });
                }}
                className="group w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary flex items-center justify-between gap-3 sm:gap-4 p-4 sm:p-4.5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20 transition-all cursor-pointer shadow-2xs active:scale-[0.995]"
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
                        {vehicleLabel(item)}
                      </span>
                      <span className="text-border">•</span>
                      <span className="inline-flex items-center gap-1 font-mono">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground/80" />
                        {item.completedStops}/{item.totalStops} cleared
                      </span>
                      {item.timeOnRoute && (
                        <>
                          <span className="text-border">•</span>
                          <span title="Active collection time" className="inline-flex items-center gap-1 font-mono">
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
              </button>
            );
          })}
        </div>
      )}
      {nextCursor && <Button variant="outline" disabled={isLoading} onClick={() => void history.fetchNextPage()}>{isLoading ? "Loading…" : `Load older routes (${historyList.length} of ${total} loaded)`}</Button>}
    </div>
  );
};

export default CollectorRouteHistory;
