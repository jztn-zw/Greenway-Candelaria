import { useCollectorQuery, useCollectorAction } from "@/lib/collectorQuery";
import { getManilaNow } from "@/utils/date";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, History } from "lucide-react";
import {
  CollectorDashboardSkeleton,
} from "@/components/PageLoadingSkeletons";
import AssignmentCard from "./components/AssignmentCard";
import TodayStatsCards from "./components/TodayStatsCards";
import TruckStatusCard from "./components/TruckStatusCard";
import TruckBreakdownDialog from "../components/TruckBreakdownDialog";
import CollectorDashboardGreeting from "./components/CollectorDashboardGreeting";
import RouteCalendarCard from "./components/RouteCalendarCard";
import { buildAssignment, getAssignmentDestination, getWasteBadgeClass } from "./dashboard.utils";
import {
  fetchCollectorDashboardProfile,
  fetchDriverMyHistory,
  reportTruckBreakdown,
} from "@/services/driverManagerService";
import { fetchMyRouteToday } from "@/services/routesService";
import { fetchCalendarEvents } from "@/services/scheduleService";
import useAuthStore from "@/store/authStore";

const CollectorDashboard = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);

  const profileQuery = useCollectorQuery("profile", ["dashboard"], fetchCollectorDashboardProfile);
  const routeQuery = useCollectorQuery("routes", ["dashboard", getManilaNow().dateKey], () => fetchMyRouteToday(true));
  const historyQuery = useCollectorQuery("history", ["recent", 3], () => fetchDriverMyHistory(3, true));
  const calendarMonth = getManilaNow().dateKey.slice(0, 7);
  const calendarQuery = useCollectorQuery("schedule", [calendarMonth], () => fetchCalendarEvents({ view: "collector", event_type: "PRIVATE_EVENT", visibility: "PRIVATE", month: calendarMonth }));
  const runAction = useCollectorAction("profile", "routes", "history", "messenger", "notifications");
  const driverMe = profileQuery.data ?? null;
  const routeToday = routeQuery.data ?? null;
  const recentHistory = historyQuery.data ?? [];
  const isLoading = profileQuery.isLoading || routeQuery.isLoading || historyQuery.isLoading || calendarQuery.isLoading;
  const loadErrors = { profile: Boolean(profileQuery.error) && profileQuery.data === undefined,
    route: Boolean(routeQuery.error) && routeQuery.data === undefined, history: Boolean(historyQuery.error) && historyQuery.data === undefined };
  const hasRefreshError = Boolean(profileQuery.error || routeQuery.error || historyQuery.error);
  const [now, setNow] = useState(Date.now);

  const [issueModalOpen, setIssueModalOpen] = useState(false);

  // Only advance the displayed duration; this does not fetch or reload data.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);


  const assignmentData = buildAssignment(routeToday, Boolean(driverMe?.truck_id), driverMe?.truck_plate, now);

  if (isLoading) {
    return <CollectorDashboardSkeleton />;
  }

  const assignmentUnavailable = loadErrors.profile || loadErrors.route;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-5 pb-8">
      {hasRefreshError && <p role="alert" className="rounded-xl border border-destructive/30 p-4 text-sm">Some dashboard data is unavailable. Please open this page again later to check the affected sections.</p>}
      {/* ── Municipal Command Header with Live Shift Status ── */}
      <CollectorDashboardGreeting
        driverName={driverMe?.full_name || authUser?.full_name || "Collector"}
        truckPlate={driverMe?.truck_plate}
        statusLabel={assignmentUnavailable ? "Status unavailable" : assignmentData.statusLabel}
        active={!assignmentUnavailable && assignmentData.routeState === "in-progress"}
      />

      {/* ── Operational Telemetry Row (Low Noise, Single Surface) ── */}
      {!assignmentUnavailable && <TodayStatsCards data={assignmentData} />}

      {/* ── Route workspace and monthly schedule ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="flex min-h-[360px] flex-col sm:min-h-[380px] lg:min-h-[355px] lg:h-full">
          {assignmentUnavailable ? <p className="rounded-xl border border-border bg-card p-5">Route assignment unavailable.</p> : <AssignmentCard
            className="h-full flex-1"
            data={assignmentData}
            onAction={() => navigate(getAssignmentDestination(assignmentData.routeState))}
          />}
        </div>
        <div className="flex min-h-0 sm:min-h-[380px] flex-col lg:min-h-[355px] lg:h-full">
          <RouteCalendarCard />
        </div>
      </div>

      {/* ── Supporting route and vehicle details ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="h-full">
          {loadErrors.history ? <p className="rounded-xl border border-border bg-card p-5">Route history unavailable.</p> : recentHistory.length > 0 ? (
            <div className="h-full min-h-0 rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs flex flex-col">
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border/60 bg-muted/20">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground font-display tracking-tight">
                    Route runs and historical logs
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/collector/route-history")}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-border/50 flex flex-1 min-h-0 flex-col justify-start overflow-hidden">
                {recentHistory.slice(0, 3).map((item) => {
                  const displayTitle =
                    item.stops && item.stops.length > 0 && item.stops[0].barangay
                      ? `${item.stops[0].barangay}${item.stops.length > 1 ? ` → ${item.stops[item.stops.length - 1].barangay}` : ""}`
                      : item.routeName;

                  return (
                      <Link
                      key={item.id}
                        to={`/collector/route-history?route=${encodeURIComponent(item.id)}`}
                      className="px-4 sm:px-5 py-2.5 hover:bg-muted/25 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {displayTitle}
                          </p>
                          {item.wasteType && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${getWasteBadgeClass(item.wasteType)}`}
                            >
                              {item.wasteType}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.date} · {item.completedStops} of {item.totalStops} stops cleared
                        </p>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1 min-w-[64px]">
                        <span
                          className={`text-xs font-mono font-bold ${
                            item.completionPct >= 100
                              ? "text-emerald-600 dark:text-emerald-400"
                              : item.completionPct > 0
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {item.completionPct}%
                        </span>
                        <div className="w-14 h-1.5 rounded-full bg-muted/60 overflow-hidden border border-border/40">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.completionPct >= 100
                                ? "bg-emerald-500"
                                : item.completionPct > 0
                                ? "bg-primary"
                                : "bg-muted-foreground/30"
                            }`}
                            style={{ width: `${Math.max(item.completionPct, item.completedStops > 0 ? 5 : 0)}%` }}
                          />
                        </div>
                      </div>
                      </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">Recent route history</h2>
              <p className="mt-2 text-sm text-muted-foreground">No finished collection routes yet.</p>
            </div>
          )}
        </div>
        <div className="h-full">
          {loadErrors.profile ? <p className="rounded-xl border border-border bg-card p-5">Vehicle information unavailable.</p> : <TruckStatusCard
            className="h-full"
            data={driverMe?.truck_id ? {
              name: driverMe?.truck_name || "Assigned Truck",
              plateNumber: driverMe?.truck_plate,
              model: driverMe?.truck_model,
              status: driverMe?.truck_status,
              availabilityStatus: driverMe?.truck_availability,
              wasteType: routeToday?.waste_type,
            } : null}
            onReportIssue={() => setIssueModalOpen(true)}
          />}
        </div>
      </div>

      <TruckBreakdownDialog
        open={issueModalOpen}
        onOpenChange={setIssueModalOpen}
        truckName={driverMe?.truck_name}
        truckPlate={driverMe?.truck_plate}
        onSubmit={(report) => runAction(() => reportTruckBreakdown(report))}
      />
    </div>
  );
};

export default CollectorDashboard;
