import "./collectorRouteHistory.css";
import ListEmptyState from "@/components/common/ListEmptyState";
import ResidentPageHeader,{ ResidentPageTitle } from "@/components/common/ResidentPageHeader";
import { BackButton } from "@/components/common/BackButton";
import { collectorBadgeClassName } from "@/features/collector/components/collectorBadgeStyles";
import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import { useInfiniteQuery } from "@tanstack/react-query";
import { collectorKey,collectorQueryDefaults,useCollectorQuery } from "@/lib/collectorQuery";
import useAuthStore from "@/store/authStore";
import { useEffect,useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getWasteBadgeClass,isNonBiodegradable } from "../dashboard/dashboard.utils";
import {
History,
MapPin,
ChevronRight,
Clock,
CheckCircle2,
AlertTriangle,
Truck,
Calendar,
Route,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PageErrorState from "@/components/feedback/PageErrorState";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { FilterPillTabs,type FilterPillItem } from "@/components/common/FilterPillTabs";
import { CollectorRouteHistorySkeleton,CollectorRouteHistoryRowsSkeleton,CollectorRouteHistoryDetailSkeleton } from "@/components/loading/PageLoadingSkeletons";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import {
fetchCollectorHistoryPage,
fetchCollectorHistoryRun,
RouteHistoryItem,
} from "@/services/driverManagerService";

type StatusFilter = "all" | "completed" | "partial" | "no-collection";
type WasteTypeFilter = "all" | "Biodegradable" | "Non-Biodegradable" | "General";

const statusTabs: FilterPillItem<StatusFilter>[] = [
  { id: "all", label: "All routes" },
  { id: "completed", label: "Completed" },
  { id: "partial", label: "Partial" },
  { id: "no-collection", label: "No collection" },
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
        cls: getStatusBadgeStyle("Completed").className,
        icon: CheckCircle2,
      };
    case "partial":
      return {
        label: "Partial",
        cls: getStatusBadgeStyle("Partial").className,
        icon: AlertTriangle,
      };
    default:
      return {
        label: "No collection",
        cls: getStatusBadgeStyle("No collection").className,
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
    <span className={collectorBadgeClassName + " " + getWasteBadgeClass(wasteType)}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span>{wasteType}</span>
    </span>
  );
};

const MiniRing = ({ pct, status }: { pct: number; status: RouteHistoryItem["status"] }) => {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  const strokeClass = status === "completed" ? "text-primary" : status === "partial" ? "text-warning-foreground" : "text-muted-foreground";

  return (
    <div className="collector-history-ring relative flex h-12 w-12 shrink-0 items-center justify-center" aria-label={`${pct}% completed`}>
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
      <span className="absolute font-body text-ui-caption font-semibold tabular-nums text-foreground">
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
  const failure = routeParam ? detail.error : history.error;
  const error = failure ? "Route history could not be loaded. Please try again." : null;
  const notFound = Boolean(routeParam && (failure as { response?: { status?: number } } | null)?.response?.status === 404);
  const nextCursor = history.hasNextPage;
  const total = history.data?.pages[0]?.total ?? 0;
  const retry = () => { if (routeParam) void detail.refetch(); else void history.refetch(); };
  const changeStatus = (status: StatusFilter) => setStatusFilter(status);
  const changeWaste = (waste: WasteTypeFilter) => setWasteFilter(waste);
  const backToHistory = () => setSearchParams((params) => {
    const next = new URLSearchParams(params);
    next.delete("route");
    return next;
  });
  const filtered = historyList;
  if (!routeParam && history.isLoading && !hasSettledHistoryLoad) return <CollectorRouteHistorySkeleton />;
  if (routeParam && (detail.isLoading || (selectedRoute?.id !== routeParam && !error && !notFound))) return <CollectorRouteHistoryDetailSkeleton onBack={backToHistory} />;
  if (routeParam && selectedRoute?.id !== routeParam) return (
    <PageErrorState
      kind={notFound ? "not-found" : "unavailable"}
      title={notFound ? "Route not found" : "Route history couldn't load"}
      description={notFound ? "This route is unavailable or does not belong to your account." : "We couldn't load this route's history. Please try again."}
      onRetry={notFound ? undefined : retry}
      retrying={detail.isFetching}
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
      <div className="resident-page collector-history-page collector-history-detail w-full max-w-[1200px] mx-auto space-y-4 sm:space-y-5 pb-8">
        <BackButton onBack={backToHistory} label="Back to route history" className="mb-0 h-11 w-fit sm:h-9" />
        {/* Route Run Header Card */}
        <section aria-label="Route summary" className="collector-history-summary rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><Route aria-hidden="true" className="size-5" /></div>
            <ResidentPageTitle className="min-w-0 flex-1">
              {r.routeName}
            </ResidentPageTitle>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className={collectorBadgeClassName + " " + detailBadge.cls}>
              <DetailStatusIcon className="w-3.5 h-3.5" />
              {detailBadge.label}
            </span>
            {getWasteBadge(r.wasteType)}
          </div>
          <div className="collector-history-summary-meta border-t border-border/60 pt-4">
            <div className="flex min-w-0 items-start gap-2.5">
              <Calendar aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 space-y-1"><p className="text-ui-caption text-muted-foreground">Collection date</p><p className="text-ui-label font-medium text-foreground">{r.dayOfWeek}, {r.date}</p></div>
            </div>
            <div className="flex min-w-0 items-start gap-2.5">
              <Truck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 space-y-1"><p className="text-ui-caption text-muted-foreground">Truck</p><p className="text-ui-label font-medium text-foreground">{vehicleLabel(r)}</p></div>
            </div>
          </div>
        </section>

        {/* Checkpoint Breakdown */}
        <section aria-labelledby="route-checkpoint-heading" className="collector-history-checkpoints rounded-2xl border border-border/80 bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h2 id="route-checkpoint-heading" className="gw-heading text-sm text-foreground tracking-tight">
                Checkpoint breakdown
              </h2>
            </div>
            <span className="rounded-lg border border-border/60 bg-muted/60 px-2.5 py-1 font-body text-xs font-semibold tabular-nums text-muted-foreground">
              {r.stops?.length || 0} total stops
            </span>
          </div>

          {!r.stops || r.stops.length === 0 ? (
            <ListEmptyState icon={MapPin} variant="inline" title="No checkpoint records" description="No individual checkpoint records logged for this collection route." />
          ) : (
            <ol className="collector-history-stop-list">
              {r.stops.map((stop) => {
                const isSkipped = stop.status === "skipped";
                const isCleared = stop.status === "done";
                return (
                  <li
                    key={stop.id ?? stop.stopNumber}
                    className={`collector-history-stop rounded-xl border transition-colors ${
                      isSkipped
                        ? "border-amber-500/25 bg-amber-500/5"
                        : isCleared
                          ? "border-border/80 bg-card shadow-2xs"
                          : "border-border/70 bg-muted/25"
                    }`}
                  >
                    <div
                      className={`collector-history-stop-number flex size-9 shrink-0 items-center justify-center rounded-lg border font-body text-xs font-semibold tabular-nums ${
                        isSkipped
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
                          : isCleared
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted text-muted-foreground border-border/70"
                      }`}
                    >
                      {stop.stopNumber}
                    </div>

                    <p className="collector-history-stop-title min-w-0 font-body text-sm font-semibold text-foreground">
                      {stop.barangay}
                    </p>
                    <div className="collector-history-stop-meta">
                      {isSkipped ? (
                        <span className={collectorBadgeClassName + " " + getStatusBadgeStyle("Skipped").className}>
                          <AlertTriangle className="w-3 h-3" /> Skipped
                        </span>
                      ) : isCleared ? (
                        <span className={collectorBadgeClassName + " " + getStatusBadgeStyle("Cleared").className}>
                          <CheckCircle2 className="w-3 h-3" /> Cleared
                        </span>
                      ) : (
                        <span className={collectorBadgeClassName + " " + getStatusBadgeStyle("Not completed").className}>
                          <Clock className="w-3 h-3" /> Not completed
                        </span>
                      )}
                      {stop.time && (
                        <span title="Active collection time" className="inline-flex min-w-0 items-center gap-1.5 font-body text-ui-caption tabular-nums text-muted-foreground">
                          <Clock aria-hidden="true" className="size-3.5 shrink-0" /> {stop.time}
                        </span>
                      )}
                    </div>
                    {stop.skipReason && (
                      <div className="collector-history-stop-reason min-w-0 space-y-1.5 rounded-lg border border-warning/20 bg-warning/5 p-3">
                        <p className="flex items-center gap-1.5 text-ui-caption font-semibold text-warning-foreground"><AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />Skip reason</p>
                        <p className="text-ui-caption leading-relaxed text-foreground">{stop.skipReason}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    );
  }

  /* ────── Main List View ────── */
  if (history.error && history.data === undefined) return <PageErrorState kind="unavailable" description="We couldn't load route history. Please try again." onRetry={retry} retrying={history.isFetching} homeHref="/collector" />;
  return (
    <div className="resident-page collector-history-page w-full max-w-[1200px] mx-auto space-y-4 sm:space-y-5 pb-8">
      {/* ── Page Header ── */}
      <ResidentPageHeader className="admin-module-header" title="Route History" description="Review previous collection shifts, stops, and route results." />

      {/* ── Filter Toolbar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterPillTabs<StatusFilter>
          items={statusTabs}
          activeId={statusFilter}
          onChange={changeStatus}
          className="min-w-0"
        />

        <Select value={wasteFilter} onValueChange={(value) => changeWaste(value as WasteTypeFilter)}>
          <SelectTrigger aria-label="Waste type" fieldSize="compact" className="w-full border-border/80 bg-card font-body font-medium sm:w-[190px]">
            <SelectValue placeholder="All waste types" />
          </SelectTrigger>
          <SelectContent className="rounded-lg">
            {wasteTabs.map((tab) => (
              <SelectItem key={tab.key} value={tab.key} className="font-body text-ui-label">
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <DataRefreshNotice message="Couldn't update route history. Showing the last loaded routes, which may be outdated." onRetry={retry} retrying={history.isFetching} />}
      {/* ── Route Logs List ── */}
      {history.isLoading ? <CollectorRouteHistoryRowsSkeleton /> : filtered.length === 0 ? (
        <ListEmptyState icon={History} title="No route logs found"
          description="No past collection shifts match your selected status or waste filter.">
          {(statusFilter !== "all" || wasteFilter !== "all") && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                changeStatus("all");
                changeWaste("all");
              }}
              size="sm"
              className="cursor-pointer"
            >
              Reset filters
            </Button>
          )}
        </ListEmptyState>
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
                className="collector-history-card group w-full cursor-pointer rounded-2xl border border-border/80 bg-card text-left shadow-xs transition-colors hover:border-primary/40 hover:bg-[var(--button-neutral-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <MiniRing pct={item.completionPct} status={item.status} />

                <div className="collector-history-heading">
                  <h3 className="gw-heading text-ui-body tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {item.routeName}
                  </h3>
                </div>
                <div className="collector-history-badges">
                  <span
                    className={collectorBadgeClassName + " " + badge.cls}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {badge.label}
                  </span>
                  {getWasteBadge(item.wasteType)}
                </div>
                <div className="collector-history-metadata font-body text-ui-caption text-muted-foreground">
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

                <div className="collector-history-arrow flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/50 transition-colors group-hover:bg-primary/10 sm:h-9 sm:w-9">
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </button>
            );
          })}
        </div>
      )}
      {history.isFetchingNextPage && <CollectorRouteHistoryRowsSkeleton count={2} />}
      {nextCursor && <Button className="collector-history-more" variant="outline" size="sm" disabled={history.isFetching} loading={history.isFetchingNextPage} loadingLabel="Loading older routes…" onClick={() => void history.fetchNextPage()}>{`Load older routes (${historyList.length} of ${total} loaded)`}</Button>}
    </div>
  );
};

export default CollectorRouteHistory;
