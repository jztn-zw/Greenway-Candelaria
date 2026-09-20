import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, ChevronRight, X, AlertTriangle, History, Building2, CheckCircle2, Radio, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import {
  CollectorDashboardSkeleton,
} from "@/components/PageLoadingSkeletons";
import AssignmentCard from "./components/AssignmentCard";
import TodayStatsCards from "./components/TodayStatsCards";
import TruckStatusCard from "./components/TruckStatusCard";
import CollectorDashboardGreeting from "./components/CollectorDashboardGreeting";
import RouteCalendarCard from "./components/RouteCalendarCard";
import type { ShiftStatus } from "./components/types";
import {
  fetchDriverMe,
  fetchDriverMyHistory,
  updateMyDriverStatus,
  DriverMeData,
  RouteHistoryItem,
} from "@/services/driverManagerService";
import { fetchMyRouteToday } from "@/services/routesService";
import useAuthStore from "@/store/authStore";

const CollectorDashboard = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);

  const [isLoading, setIsLoading] = useState(true);
  const [driverMe, setDriverMe] = useState<DriverMeData | null>(null);
  const [routeToday, setRouteToday] = useState<any>(null);
  const [recentHistory, setRecentHistory] = useState<RouteHistoryItem[]>([]);
  const [vehicleCardHeight, setVehicleCardHeight] = useState<number>();
  const vehicleCardRef = useRef<HTMLDivElement>(null);

  // Modals & Forms
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueType, setIssueType] = useState("Flat Tire");
  const [issueUrgent, setIssueUrgent] = useState(false);
  const [issueDescription, setIssueDescription] = useState("");
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // Load real data from APIs
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [driverRes, routeRes, historyRes] = await Promise.all([
        fetchDriverMe(),
        fetchMyRouteToday(),
        fetchDriverMyHistory(6),
      ]);

      setDriverMe(driverRes);
      setRouteToday(routeRes);
      setRecentHistory(historyRes || []);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const vehicleCard = vehicleCardRef.current;
    if (!vehicleCard) return;

    const updateHeight = () => {
      setVehicleCardHeight(Math.ceil(vehicleCard.getBoundingClientRect().height));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(vehicleCard);
    return () => observer.disconnect();
  }, [isLoading]);

  // Derive Route Status & Data
  const stops = routeToday?.stops || [];
  const totalStops = stops.length;
  const completedStops = stops.filter((s: any) => s.status === "DONE").length;
  const skippedStops = stops.filter((s: any) => s.status === "MISSED").length;

  let routeState: "unassigned" | "no-schedule" | "not-started" | "in-progress" | "completed" = "unassigned";
  if (!driverMe?.truck_id) {
    routeState = "unassigned";
  } else if (!routeToday) {
    routeState = "no-schedule";
  } else if (completedStops + skippedStops >= totalStops && totalStops > 0) {
    routeState = "completed";
  } else if (completedStops > 0 || stops.some((s: any) => s.status === "IN_PROGRESS")) {
    routeState = "in-progress";
  } else {
    routeState = "not-started";
  }

  const shiftStatus: ShiftStatus =
    routeState === "completed"
      ? "completed"
      : routeState === "in-progress"
      ? "on-route"
      : "off-duty";
  const isActive = routeState === "in-progress" || routeState === "completed";

  // Identify next active stop and upcoming sequence
  const currentStop =
    stops.find((s: any) => s.status === "IN_PROGRESS") ||
    stops.find((s: any) => s.status === "NOT_STARTED");

  const currentStopIndex = stops.findIndex((s: any) => s.id === currentStop?.id);
  const nextStopOrder =
    currentStop?.order_index ??
    currentStop?.stop_order ??
    currentStop?.order ??
    (currentStopIndex >= 0 ? currentStopIndex + 1 : 1);

  const upcomingStops = stops
    .filter((s: any) => s.status !== "DONE" && s.status !== "MISSED")
    .map((s: any, idx: number) => ({
      id: s.id,
      name: s.barangay_name || s.barangay || `Stop ${idx + 1}`,
      zone: s.zone,
      order: s.order_index ?? s.stop_order ?? s.order ?? idx + 1,
      status: s.status,
    }));

  // Assignment card data adapter
  const assignmentData = {
    routeState,
    routeName: routeToday?.name || routeToday?.route_name || "Today's collection route",
    wasteType: routeToday?.waste_type || "General Waste",
    truckName: driverMe?.truck_name || "Assigned Truck",
    plateNumber: driverMe?.truck_plate || "N/A",
    totalStops: totalStops || 0,
    completedStops,
    skippedStops,
    estimatedStart: routeToday?.start_time ? routeToday.start_time.slice(0, 5) : "06:00 AM",
    timeElapsedMinutes: 45, // default session duration estimate
    nextStopName: currentStop?.barangay_name,
    nextStopZone: currentStop?.zone,
    nextStopOrder,
    upcomingStops,
  };

  // Submit Truck Issue to Backend
  const handleReportIssue = async () => {
    if (!issueDescription.trim()) {
      toast.error("Please provide a description of the issue");
      return;
    }

    try {
      setIsSubmittingIssue(true);
      const statusMessage = `[TRUCK ISSUE${issueUrgent ? " - URGENT" : ""}] ${issueType}: ${issueDescription.trim()}`;
      await updateMyDriverStatus(statusMessage);
      toast.success("Truck issue reported to MENRO Admin dispatch");
      setIssueModalOpen(false);
      setIssueDescription("");
      setIssueUrgent(false);
      loadDashboardData();
    } catch {
      toast.error("Failed to submit truck issue report");
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  if (isLoading) {
    return <CollectorDashboardSkeleton />;
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-5 pb-8">
      {/* ── Municipal Command Header with Live Shift Status ── */}
      <CollectorDashboardGreeting
        driverName={driverMe?.full_name || authUser?.full_name || "Collector"}
        truckPlate={driverMe?.truck_plate}
        shiftStatus={shiftStatus}
      />

      {/* ── Operational Telemetry Row (Low Noise, Single Surface) ── */}
      <TodayStatsCards
        completed={completedStops}
        total={totalStops}
        skipped={skippedStops}
        timeElapsed={45}
        active={isActive}
      />

      {/* ── Route workspace and monthly schedule ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div className="flex min-h-[360px] flex-col sm:min-h-[380px] lg:min-h-[355px] lg:h-full">
          <AssignmentCard
            className="h-full flex-1"
            data={assignmentData}
            onAction={() => {
              if (assignmentData.routeState === "completed" || assignmentData.routeState === "no-schedule") {
                navigate("/collector/route-history");
              } else {
                navigate("/collector/route-map");
              }
            }}
          />
        </div>
        <div className="flex min-h-0 sm:min-h-[380px] flex-col lg:min-h-[355px] lg:h-full">
          <RouteCalendarCard />
        </div>
      </div>

      {/* ── Supporting route and vehicle details ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-stretch">
        <div
          className="h-full"
          style={vehicleCardHeight ? ({ height: `${vehicleCardHeight}px` } as CSSProperties) : undefined}
        >
          {recentHistory.length > 0 ? (
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

                  const isBio = item.wasteType?.toLowerCase().includes("bio") && !item.wasteType?.toLowerCase().includes("non");
                  const isNonBio = item.wasteType?.toLowerCase().includes("non") || item.wasteType?.toLowerCase().includes("residual");

                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/collector/route-history?route=${item.id}&name=${encodeURIComponent(displayTitle)}`)}
                      className="px-4 sm:px-5 py-2.5 hover:bg-muted/25 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                            {displayTitle}
                          </p>
                          {item.wasteType && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${
                                isBio
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                  : isNonBio
                                  ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25"
                                  : "bg-muted text-muted-foreground border-border/60"
                              }`}
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
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between">
              {/* Header: Title + Status Pill (matches TruckStatusCard header alignment) */}
              <div className="flex items-center justify-between pb-3 border-b border-border/50 shrink-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-primary shrink-0" />
                  <h3 className="text-xs font-bold text-foreground font-display tracking-tight truncate">
                    Standby shift guidelines
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-muted text-muted-foreground border border-border/60 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Awaiting route
                </span>
              </div>

              {/* Middle: 3 structured operational readiness tiles */}
              <div className="my-auto py-2 space-y-2">
                <div className="px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-muted/25 border border-border/60 flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground leading-tight">Truck readiness</p>
                    <p className="text-[11px] text-muted-foreground leading-snug break-words mt-0.5">
                      Check unit <span className="font-mono font-semibold text-foreground">{driverMe?.truck_plate || "assigned"}</span> fluid levels & road readiness.
                    </p>
                  </div>
                </div>

                <div className="px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-muted/25 border border-border/60 flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <Radio className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground leading-tight">Dispatch monitor</p>
                    <p className="text-[11px] text-muted-foreground leading-snug break-words mt-0.5">
                      Keep application open to receive live route updates from MENRO.
                    </p>
                  </div>
                </div>

                <div className="px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl bg-muted/25 border border-border/60 flex items-start sm:items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground leading-tight">Breakdown protocol</p>
                    <p className="text-[11px] text-muted-foreground leading-snug break-words mt-0.5">
                      Report road hazards or mechanical delays via vehicle tile.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer: Standardized context note & municipal identifier matching TruckStatusCard */}
              <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2 text-xs text-muted-foreground shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                  <span className="truncate">Logs record on route completion</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />
                  <span>Candelaria MENRO</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={vehicleCardRef} className="h-full">
          <TruckStatusCard
            className="h-full"
            data={{
              name: driverMe?.truck_name || "Assigned Truck",
              plateNumber: driverMe?.truck_plate || "N/A",
              status: driverMe?.truck_status || "ACTIVE",
              availabilityStatus: driverMe?.truck_availability || "ACTIVE",
              wasteType: routeToday?.waste_type,
            }}
            onReportIssue={() => setIssueModalOpen(true)}
          />
        </div>
      </div>

      {/* ── Report Truck Issue Modal ── */}
      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:max-w-md max-h-[92vh] flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0 shadow-2xs">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  Report Truck Issue
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Truck {driverMe?.truck_name || "Vehicle"} ({driverMe?.truck_plate || "N/A"})
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIssueModalOpen(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground tracking-tight block">
                Issue category
              </label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Flat Tire">Flat tire or puncture</SelectItem>
                  <SelectItem value="Engine Problem">Engine problem or overheating</SelectItem>
                  <SelectItem value="Hydraulic Compactor Fault">Hydraulic compactor fault</SelectItem>
                  <SelectItem value="Brake System Issue">Brake system issue</SelectItem>
                  <SelectItem value="Fuel / Fluid Leak">Fuel or fluid leak</SelectItem>
                  <SelectItem value="Battery / Electrical">Battery or electrical failure</SelectItem>
                  <SelectItem value="Other Issue">Other mechanical issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground tracking-tight block">
                Description and current location
              </label>
              <Textarea
                className="text-xs sm:text-sm min-h-[90px] rounded-xl border-border/80 resize-none"
                placeholder="Describe what happened and where the truck is currently stopped (e.g. Near Brgy. Malabanban Norte church)..."
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
              />
            </div>

            {/* Urgent Flag Toggle */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-border/80 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors">
              <input
                type="checkbox"
                checked={issueUrgent}
                onChange={(e) => setIssueUrgent(e.target.checked)}
                className="w-4 h-4 rounded text-destructive accent-destructive cursor-pointer shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground">Mark as critical road hazard</p>
                <p className="text-[11px] text-muted-foreground">Truck is immobilized or obstructing traffic</p>
              </div>
            </label>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>This alert will be sent immediately to MENRO Admin dispatch.</span>
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIssueModalOpen(false)}
              className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold border-border/80 hover:bg-muted/80 cursor-pointer active:scale-[0.98] transition-all"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmittingIssue}
              onClick={handleReportIssue}
              className="h-10 px-5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs active:scale-[0.98] cursor-pointer transition-all"
            >
              {isSubmittingIssue ? "Submitting..." : "Send breakdown alert"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectorDashboard;
