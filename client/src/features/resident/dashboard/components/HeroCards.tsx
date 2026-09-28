import { useResidentQuery } from "@/lib/residentQuery";
import { Card } from "@/components/ui/card";
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
    tagColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  },
  NON_BIODEGRADABLE: {
    label: "Non-Biodegradable",
    tag: "Non-Bio / Recyclables",
    tagColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
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
  SUBMITTED:    { class: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25", label: "Submitted" },
  PENDING:      { class: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25", label: "Pending" },
  UNDER_REVIEW: { class: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25", label: "Under Review" },
  DISPATCHED:   { class: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25", label: "Dispatched" },
  RESOLVED:     { class: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25", label: "Resolved" },
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
  const trucksFailed = liveQuery.isError;
  const reportsFailed = reportsQuery.isError;
  const scheduleFailed = routesQuery.isError;
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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-3.5">
      {/* ─── Card 1: Today's Collection Schedule ─── */}
      <Card
        onClick={() => navigate(scheduleDestination)}
        className="flex cursor-pointer flex-col justify-between space-y-3 rounded-2xl border border-border/80 bg-card/90 p-4 shadow-2xs backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md lg:space-y-4 lg:p-5"
      >
          <div className="space-y-3 lg:space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:text-[11px]">
              Today's Schedule
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs ${todayRoute && todayWaste ? todayWaste.tagColor : "bg-muted/60 text-muted-foreground border-border/80"}`}>
              {scheduleBadge}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary lg:text-base">
                {scheduleTitle}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {scheduleDescription}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-2.5 text-xs lg:pt-3">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground/80" />
              Collection Time
            </span>
            <span className="font-semibold text-foreground tabular-nums">{scheduleTime}</span>
          </div>
        </div>

        <div className="flex items-center pt-0.5 text-xs font-semibold text-primary lg:pt-1">
          <span>{addressMissing ? "Update collection address" : "View route details"}</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </Card>

      {/* ─── Card 2: Live Truck Status ─── */}
      <Card
        onClick={() => navigate("/resident/tracking")}
        className="flex cursor-pointer flex-col justify-between space-y-3 rounded-2xl border border-border/80 bg-card/90 p-4 shadow-2xs backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md lg:space-y-4 lg:p-5"
      >
          <div className="space-y-3 lg:space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:text-[11px]">
              Collection Truck
            </span>
            {trucksFailed ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted/60 text-muted-foreground border border-border/80 shadow-2xs">
                Status unavailable
              </span>
            ) : hasActive ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live On Route
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted/60 text-muted-foreground border border-border/80 shadow-2xs">
                No active collection
              </span>
            )}
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary lg:text-base">
                {trucksFailed ? "Truck status unavailable" : hasActive ? activeTruck.truck_name || activeTruck.truck_plate : "Candelaria Fleet"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {trucksFailed
                  ? "Live truck information could not be loaded right now"
                  : hasActive
                  ? `Driver: ${activeTruck.driver_name || "Assigned Driver"}`
                  : "No collection truck is currently on route"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/50 pt-2.5 text-xs lg:pt-3">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-muted-foreground/80" />
              Live Trucks
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              {trucksFailed ? "—" : `${activeTrucks.length} truck${activeTrucks.length !== 1 ? "s" : ""} on route`}
            </span>
          </div>
        </div>

        <div className="flex items-center pt-0.5 text-xs font-semibold text-primary lg:pt-1">
          <span>Open live GPS map</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </Card>

      {/* ─── Card 3: Latest Report ─── */}
      <Card
        onClick={() => navigate(latestReport || reportsFailed ? "/resident/my-reports" : "/resident/report")}
        className="flex cursor-pointer flex-col justify-between space-y-3 rounded-2xl border border-border/80 bg-card/90 p-4 shadow-2xs backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md md:col-span-2 lg:col-span-1 lg:space-y-4 lg:p-5"
      >
          <div className="space-y-3 lg:space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:text-[11px]">
              Latest Waste Report
            </span>
            {latestReport && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs ${
                  statusBadgeConfig[latestReport.status]?.class || "bg-muted/60 text-muted-foreground border-border/80"
                }`}
              >
                {statusBadgeConfig[latestReport.status]?.label || latestReport.status}
              </span>
            )}
          </div>

          {latestReport ? (
            <>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-display text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary lg:text-base">
                    {formatViolationType(latestReport.violation_type)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {latestReport.description || "Report submitted for inspection"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/50 pt-2.5 text-xs lg:pt-3">
                <span className="text-muted-foreground font-mono text-[11px] flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground/80" />
                  {latestReport.reference_number}
                </span>
                <span className="text-muted-foreground text-[11px] flex items-center gap-1.5">
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
              <p className="text-[11px] text-muted-foreground">
                {reportsFailed
                  ? "Your report history could not be loaded right now."
                  : "You have not submitted a waste report."}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center pt-0.5 text-xs font-semibold text-primary lg:pt-1">
          <span>{latestReport || reportsFailed ? "View report history" : "Submit new report"}</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </Card>
    </div>
  );
};

export default HeroCards;

