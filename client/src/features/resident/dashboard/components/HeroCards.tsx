import { getStatusBadgeStyle, getCategoryBadgeColors } from "@/components/ui/badgeStyles";
import { useResidentQuery } from "@/lib/residentQuery";
import PageErrorState from "@/components/PageErrorState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dashboardStyles } from "../dashboardStyles";
import { ResidentDashboardCardSkeleton as HeroCardSkeleton } from "@/components/PageLoadingSkeletons";
import {
  Package,
  Truck,
  FileText,
  Clock,
  Radio,
  Hash,
  Calendar,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchLiveTrucks } from "@/services/trackingService";
import { fetchMyReports } from "@/services/reportsService";
import { fetchRoutes, type ApiRoute, type ApiRouteStop } from "@/services/routesService";
import { formatManilaDateTime, getManilaNow } from "@/utils/date";
import useAuthStore from "@/store/authStore";
import { formatCollectionTime, normaliseId } from "../../truck-tracking/truckTracking.utils";

const wasteTypeDetails: Record<"BIODEGRADABLE" | "NON_BIODEGRADABLE", {
  label: string;
  tag: string;
  tagColor: string;
}> = {
  BIODEGRADABLE: {
    label: "Biodegradable",
    tag: "Biodegradable",
    tagColor: getCategoryBadgeColors("Biodegradable").className,
  },
  NON_BIODEGRADABLE: {
    label: "Non-Biodegradable",
    tag: "Non-Bio / Recyclables",
    tagColor: getCategoryBadgeColors("Non-Biodegradable").className,
  },
};

const getWasteTypeDetails = (value?: string | null) => {
  const normalized = value?.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (normalized === "BIODEGRADABLE" || normalized === "NON_BIODEGRADABLE") {
    return wasteTypeDetails[normalized];
  }
  return null;
};

type ResidentRoute = { route: ApiRoute; stop: ApiRouteStop };

const statusBadgeConfig: Record<string, { class: string; label: string }> = {
  SUBMITTED:    { class: getStatusBadgeStyle("Submitted").className, label: "Submitted" },
  PENDING:      { class: getStatusBadgeStyle("Pending").className, label: "Pending" },
  UNDER_REVIEW: { class: getStatusBadgeStyle("Under Review").className, label: "Under Review" },
  DISPATCHED:   { class: getStatusBadgeStyle("Dispatched").className, label: "Dispatched" },
  RESOLVED:     { class: getStatusBadgeStyle("Resolved").className, label: "Resolved" },
};

const formatViolationType = (type?: string) => {
  if (!type) return "Waste Report";
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const HeroCards = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const residentStreetId = normaliseId(user?.street_id);
  const residentBarangayId = normaliseId(user?.barangay_id);
  const addressMissing = !residentStreetId && !residentBarangayId;
  const liveQuery = useResidentQuery("tracking", ["live"], fetchLiveTrucks, { refetchInterval: 15_000 });
  const reportsQuery = useResidentQuery("reports", ["latest"], () => fetchMyReports({ limit: 1, sort: "newest" }));
  const routesQuery = useResidentQuery("routes", ["templates"], fetchRoutes, { enabled: !addressMissing });
  const liveTrucks = liveQuery.data ?? [];
  const latestReport = reportsQuery.data?.reports[0] ?? null;
  const scheduleLoading = routesQuery.isLoading;
  const trucksFailed = liveQuery.isError && liveQuery.data === undefined;
  const reportsFailed = reportsQuery.isError && reportsQuery.data === undefined;
  const scheduleFailed = routesQuery.isError && routesQuery.data === undefined;
  const today = getManilaNow().weekday.toUpperCase();
  const todayRoute = (routesQuery.data ?? [])
    .filter((route) => route.day_of_week?.toUpperCase() === today)
    .map((route) => ({ route, stop: route.stops.find((stop) =>
      normaliseId(stop.barangay_id) === residentBarangayId &&
      (!stop.street_id || normaliseId(stop.street_id) === residentStreetId)) }))
    .filter((entry): entry is ResidentRoute => Boolean(entry.stop))
    .sort((first, second) => first.route.start_time.localeCompare(second.route.start_time))[0] ?? null;

  // The live endpoint retains the most recent GPS ping for offline trucks, so only
  // trucks currently on route count as live on the resident dashboard.
  const activeTrucks = liveTrucks.filter((truck) => truck.truck_status === "ON_THE_WAY");
  const activeTruck = activeTrucks[0];
  const hasActive = activeTrucks.length > 0;
  const todayWaste = getWasteTypeDetails(todayRoute?.route.waste_type);
  const routeStopName = todayRoute?.stop.stop_name || todayRoute?.stop.barangay_name;
  const scheduleTime = todayRoute
    ? formatCollectionTime(todayRoute.route.start_time)
    : scheduleLoading || scheduleFailed ? "—" : "Not scheduled";
  const scheduleDestination = addressMissing ? "/resident/profile" : "/resident/tracking";
  const scheduleBadge = addressMissing ? "Address needed"
    : scheduleLoading ? "Loading"
      : scheduleFailed ? "Unavailable"
        : todayRoute ? todayWaste?.tag ?? "Scheduled" : "No collection";
  const scheduleTitle = addressMissing ? "Set your collection address"
    : scheduleLoading ? "Checking today's route"
      : scheduleFailed ? "Schedule unavailable"
        : todayRoute ? `${todayWaste?.label ?? "Waste"} collection` : "No collection scheduled";
  const scheduleDescription = addressMissing
    ? "Add your barangay and street to see your collection route."
    : scheduleLoading ? "Looking up your registered collection stop."
      : scheduleFailed ? "The collection route could not be loaded right now."
        : todayRoute ? `Scheduled for ${routeStopName}.`
          : `No route covers your registered ${residentStreetId ? "street" : "barangay"} today.`;

  return (
    <div className={dashboardStyles.overview}>
      {/* ─── Card 1: Today's Collection Schedule ─── */}
      {scheduleLoading ? <HeroCardSkeleton className={dashboardStyles.collectionColumn} /> : scheduleFailed ? <div className={dashboardStyles.collectionColumn}><PageErrorState kind="unavailable" variant="section" title="Collection schedule couldn't load" onRetry={() => void routesQuery.refetch()} retrying={routesQuery.isFetching} /></div> : <Card
        onClick={() => navigate(scheduleDestination)}
        className={cn(dashboardStyles.hero, dashboardStyles.collectionColumn, "cursor-pointer border-primary/25 bg-primary/[0.04]")}
      >
          <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
            <span className={dashboardStyles.label}>
              Today's schedule
            </span>
            <Badge variant="outline" className={todayRoute && todayWaste ? todayWaste.tagColor : undefined}>
              {scheduleBadge}
            </Badge>
          </div>

          <div className="flex items-start gap-3">
            <div className={dashboardStyles.icon}>
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className={dashboardStyles.heroTitle}>
                {scheduleTitle}
              </h3>
              <p className={dashboardStyles.heroDescription}>
                {scheduleDescription}
              </p>
            </div>
          </div>

          <div className={dashboardStyles.heroFooter}>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground/80" />
              Collection time
            </span>
            <span className={cn("font-semibold text-foreground tabular-nums", todayRoute ? "text-xl" : "text-sm")}>{scheduleTime}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-medium text-primary">
          <span>{addressMissing ? "Update collection address" : "View route details"}</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </Card>}

      {/* ─── Card 2: Live Truck Status ─── */}
      {liveQuery.isLoading ? <HeroCardSkeleton className={dashboardStyles.truckColumn} /> : trucksFailed ? <div className={dashboardStyles.truckColumn}><PageErrorState kind="unavailable" variant="section" title="Truck status couldn't load" onRetry={() => void liveQuery.refetch()} retrying={liveQuery.isFetching} /></div> : <Card
        onClick={() => navigate("/resident/tracking")}
        className={cn(dashboardStyles.hero, dashboardStyles.truckColumn, "cursor-pointer border-primary/20")}
      >
          <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
            <span className={dashboardStyles.label}>
              Collection truck
            </span>
            {trucksFailed ? (
              <Badge className={getStatusBadgeStyle("Status unavailable").className}>
                Status unavailable
              </Badge>
            ) : hasActive ? (
              <Badge className={cn("gap-1.5", getStatusBadgeStyle("Live On Route").className)}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Live on route
              </Badge>
            ) : (
              <Badge className={getStatusBadgeStyle("No active collection").className}>
                No active collection
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-3">
            <div className={dashboardStyles.icon}>
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className={dashboardStyles.heroTitle}>
                {trucksFailed ? "Truck status unavailable" : hasActive ? activeTruck.truck_name || activeTruck.truck_plate : "Candelaria Fleet"}
              </h3>
              <p className={dashboardStyles.heroDescription}>
                {trucksFailed
                  ? "Live truck information could not be loaded right now"
                  : hasActive
                  ? `Driver: ${activeTruck.driver_name || "Assigned Driver"}`
                  : "No collection truck is currently on route"}
              </p>
            </div>
          </div>

          <div className={dashboardStyles.heroFooter}>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-muted-foreground/80" />
              Live trucks
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              {trucksFailed ? "—" : `${activeTrucks.length} truck${activeTrucks.length !== 1 ? "s" : ""} on route`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-medium text-primary">
          <span>Open live GPS map</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </Card>}

      {/* ─── Card 3: Latest Report ─── */}
      {reportsQuery.isLoading ? <HeroCardSkeleton className={dashboardStyles.reportColumn} /> : reportsFailed ? <div className={dashboardStyles.reportColumn}><PageErrorState kind="unavailable" variant="section" title="Latest report couldn't load" onRetry={() => void reportsQuery.refetch()} retrying={reportsQuery.isFetching} /></div> : <Card
        onClick={() => navigate(latestReport || reportsFailed ? "/resident/my-reports" : "/resident/report")}
        className={cn(dashboardStyles.hero, dashboardStyles.reportColumn, "cursor-pointer")}
      >
          <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
            <span className={dashboardStyles.label}>
              Latest report
            </span>
            {latestReport && (
              <Badge
                className={statusBadgeConfig[latestReport.status]?.class || getStatusBadgeStyle(latestReport.status).className}
              >
                {statusBadgeConfig[latestReport.status]?.label || formatViolationType(latestReport.status)}
              </Badge>
            )}
          </div>

          {latestReport ? (
            <>
              <div className="flex items-start gap-3">
                <div className={dashboardStyles.icon}>
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className={dashboardStyles.heroTitle}>
                    {formatViolationType(latestReport.violation_type)}
                  </h3>
                  <p className={dashboardStyles.heroDescription}>
                    {latestReport.description || "Report submitted for inspection"}
                  </p>
                </div>
              </div>

              <div className={dashboardStyles.heroFooter}>
                <span className="text-muted-foreground tabular-nums text-ui-caption flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground/80" />
                  {latestReport.reference_number}
                </span>
                <span className="text-muted-foreground text-ui-caption flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
                  {formatManilaDateTime(latestReport.created_at, { month: "short", day: "numeric" }, "—")}
                </span>
              </div>
            </>
          ) : (
            <div className="py-2 text-center space-y-1">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                {reportsFailed ? "Reports unavailable" : "No waste reports yet"}
              </p>
              <p className="text-ui-caption text-muted-foreground">
                {reportsFailed
                  ? "Your report history could not be loaded right now."
                  : "You have not submitted a waste report."}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-xs font-medium text-primary">
          <span>{latestReport || reportsFailed ? "View report history" : "Submit new report"}</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </Card>}
    </div>
  );
};

export default HeroCards;

