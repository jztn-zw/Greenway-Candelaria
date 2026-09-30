import { useInfiniteQuery } from "@tanstack/react-query";
import { FilterTabCount } from "@/components/common/FilterTabCount";
import { collectorKey, collectorQueryDefaults, useCollectorQuery } from "@/lib/collectorQuery";
import useAuthStore from "@/store/authStore";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getWasteBadgeClass, isNonBiodegradable } from "../dashboard/dashboard.utils";
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
import PageErrorState from "@/components/PageErrorState";
import { CollectorRouteHistorySkeleton, CollectorRouteHistoryRowsSkeleton, CollectorRouteHistoryDetailSkeleton } from "@/components/PageLoadingSkeletons";
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
  const isNonBio = isNonBiodegradable(wasteType);
  const isBio = wasteType.trim().toUpperCase().replace(/[\s-]+/g, "_") === "BIODEGRADABLE";
  const dotColor = isNonBio ? "bg-amber-500" : isBio ? "bg-emerald-500" : "bg-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-body text-xs font-semibold ${getWasteBadgeClass(wasteType)}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{wasteType}</span>
    </span>
  );
};

const MiniRing = ({ pct, status }: { pct: number; status: RouteHistoryItem["status"] }) => {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  const strokeClass = status === "completed" ? "text-primary" : status === "partial" ? "text-amber-500" : "text-muted-foreground";

  return (
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center" aria-label={`${pct}% completed`}>
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
      <span className="absolute font-body text-[11px] font-bold tabular-nums text-foreground">
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
  const [hasSettledHistoryLoad, setHasSettledHistoryLoad] = useState(false);
  useEffect(() => {
    if (history.isFetched) setHasSettledHistoryLoad(true);
  }, [history.isFetched]);
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
  if (!routeParam && history.isLoading && !hasSettledHistoryLoad) return <CollectorRouteHistorySkeleton />;
  if (routeParam && (detail.isLoading || (selectedRoute?.id !== routeParam && !error && !notFound))) return <CollectorRouteHistoryDetailSkeleton />;
  if (routeParam && selectedRoute?.id !== routeParam) return (
    <PageErrorState
      kind={notFound ? "not-found" : "unavailable"}
      title={notFound ? "Route not found" : "Route history couldn't load"}
      description={notFound ? "This route is unavailable or does not belong to your account." : "We couldn't load this route's history. Please try again."}
      onRetry={notFound ? undefined : retry}
      homeHref="/collector/route-history"
      homeLabel="Back to route history"
    />
  );

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
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-body text-xs font-semibold ${detailBadge.cls}`}
                >
                  <DetailStatusIcon className="w-3.5 h-3.5" />
                  {detailBadge.label}
                </span>
                {getWasteBadge(r.wasteType)}
              </div>
              <p className="font-body text-xs text-muted-foreground sm:text-sm">
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
              <p className="mt-1 font-display text-lg font-bold tabular-nums text-foreground sm:text-xl">
                {r.completedStops} / {r.totalStops}
              </p>
            </div>

            <div className="bg-muted/30 border border-border/60 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Skipped checkpoints
              </span>
              <p
                className={`mt-1 font-display text-lg font-bold tabular-nums sm:text-xl ${
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
              <p className="mt-1 font-display text-lg font-bold tabular-nums text-primary sm:text-xl">
                {r.completionPct}%
              </p>
            </div>

            <div className="bg-muted/30 border border-border/60 rounded-xl p-3 sm:p-3.5 flex flex-col justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Active collection time
              </span>
              <p className="mt-1 font-display text-lg font-bold tabular-nums text-foreground sm:text-xl">
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
            <span className="rounded-lg border border-border/60 bg-muted/60 px-2.5 py-1 font-body text-xs font-semibold tabular-nums text-muted-foreground">
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
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border font-body text-xs font-bold tabular-nums ${
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
                        <p className="truncate font-display text-sm font-semibold text-foreground">
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
                          <span title="Active collection time" className="inline-flex items-center gap-1 font-body tabular-nums">
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
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Route history</h1>
          <p className="mt-1 font-body text-sm leading-relaxed text-muted-foreground">Review previous collection shifts, stops, and route results.</p>
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
                className={`group flex h-10 shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-4 font-body text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] ${
                  isActive
                    ? "border-primary bg-primary font-semibold text-primary-foreground"
                    : "border-border/80 bg-card font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                {isActive && history.isSuccess && <FilterTabCount count={total} />}
              </button>
            );
          })}
        </div>

        <Select value={wasteFilter} onValueChange={(value) => changeWaste(value as WasteTypeFilter)}>
          <SelectTrigger className="h-10 w-full rounded-xl border-border/80 bg-card font-body text-sm font-medium sm:w-[190px]">
            <SelectValue placeholder="All waste types" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {wasteTabs.map((tab) => (
              <SelectItem key={tab.key} value={tab.key} className="font-body text-sm">
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <div role="alert" className="rounded-xl border border-destructive/30 p-4"><p>{error}</p><Button disabled={isLoading} onClick={() => retry()}>Retry</Button></div>}
      {/* ── Route Logs List ── */}
      {history.isLoading ? <CollectorRouteHistoryRowsSkeleton /> : filtered.length === 0 && !error ? (
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
        <div className="space-y-3">
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
                className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.995] sm:gap-4 sm:p-5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4">
                  <MiniRing pct={item.completionPct} status={item.status} />

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 truncate font-display text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                        {item.routeName}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-body text-xs font-semibold ${badge.cls}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                      {getWasteBadge(item.wasteType)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-body text-xs text-muted-foreground sm:text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {item.dayOfWeek}, {item.date}
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 shrink-0" />
                        {vehicleLabel(item)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 tabular-nums">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {item.completedStops}/{item.totalStops} cleared
                      </span>
                      {item.timeOnRoute && (
                        <span title="Active collection time" className="inline-flex items-center gap-1.5 tabular-nums">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {item.timeOnRoute}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 transition-colors group-hover:bg-primary/10">
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </button>
            );
          })}
        </div>
      )}
      {history.isFetchingNextPage && <CollectorRouteHistoryRowsSkeleton count={2} />}
      {nextCursor && <Button variant="outline" disabled={isLoading} onClick={() => void history.fetchNextPage()}>{isLoading ? "Loading…" : `Load older routes (${historyList.length} of ${total} loaded)`}</Button>}
    </div>
  );
};

export default CollectorRouteHistory;
