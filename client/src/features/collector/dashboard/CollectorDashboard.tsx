import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Wrench, MessageSquare, ChevronRight, X, AlertTriangle,
} from "lucide-react";
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
import type { ShiftStatus } from "./components/types";
import {
  fetchDriverMe,
  fetchDriverMyMessages,
  updateMyDriverStatus,
  DriverMeData,
  DriverMessageRow,
} from "@/services/driverManagerService";
import { fetchMyRouteToday } from "@/services/routesService";
import useAuthStore from "@/store/authStore";

const CollectorDashboard = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((s) => s.user);

  const [isLoading, setIsLoading] = useState(true);
  const [driverMe, setDriverMe] = useState<DriverMeData | null>(null);
  const [routeToday, setRouteToday] = useState<any>(null);
  const [messages, setMessages] = useState<DriverMessageRow[]>([]);

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
      const [driverRes, routeRes, msgRes] = await Promise.all([
        fetchDriverMe(),
        fetchMyRouteToday(),
        fetchDriverMyMessages(),
      ]);

      setDriverMe(driverRes);
      setRouteToday(routeRes);
      setMessages(msgRes.slice(0, 5));
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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

  // Identify next active stop
  const currentStop =
    stops.find((s: any) => s.status === "IN_PROGRESS") ||
    stops.find((s: any) => s.status === "NOT_STARTED");

  // Assignment card data adapter
  const assignmentData = {
    routeState,
    routeName: routeToday?.name || routeToday?.route_name || "Today's Collection Route",
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
    nextStopOrder: currentStop?.stop_order,
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
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-8">
      {/* ── Page Header / Greeting with Live Shift Status ── */}
      <CollectorDashboardGreeting
        driverName={driverMe?.full_name || authUser?.full_name || "Collector"}
        truckName={driverMe?.truck_name}
        truckPlate={driverMe?.truck_plate}
        routeName={assignmentData.routeName}
        wasteType={routeToday?.waste_type}
        shiftStatus={shiftStatus}
      />

      {/* ── Today's Operational KPIs / Progress Stats (Full Width) ── */}
      <TodayStatsCards
        completed={completedStops}
        total={totalStops}
        skipped={skippedStops}
        timeElapsed={45}
        active={isActive}
      />

      {/* ── Balanced Operational Grid: 2-column on desktop/laptop, 1-column on mobile/tablet ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Hero Assignment & Navigation Controls */}
        <div className="flex flex-col gap-4 sm:gap-5 lg:col-span-7 xl:col-span-8">
          {/* 1. Hero Assignment Card */}
          <AssignmentCard
            data={assignmentData}
            className="flex-1"
            onAction={() => {
              if (assignmentData.routeState === "completed") {
                navigate("/collector/route-history");
              } else {
                navigate("/collector/route-map");
              }
            }}
          />

          {/* 2. Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
            {/* Live Route Map Navigation */}
            <button
              type="button"
              onClick={() => navigate("/collector/route-map")}
              className="group flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30 transition-all text-left shadow-2xs active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-2xs group-hover:scale-105 transition-transform duration-200">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    Live Route Navigation
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Turn-by-turn map & collection stops
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </button>

            {/* Report Truck Breakdown / Delay */}
            <button
              type="button"
              onClick={() => setIssueModalOpen(true)}
              className="group flex items-center justify-between p-4 rounded-2xl border border-destructive/25 bg-destructive/5 hover:border-destructive/40 hover:bg-destructive/10 transition-all text-left shadow-2xs active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-destructive/15 flex items-center justify-center text-destructive shrink-0 border border-destructive/25 shadow-2xs group-hover:scale-105 transition-transform duration-200">
                  <Wrench className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-destructive tracking-tight">
                    Report Truck Problem
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Log breakdown, flat tire, or delay
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-destructive/60 group-hover:text-destructive group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </button>
          </div>
        </div>

        {/* Right Column: Vehicle Specs & Dispatch Communications */}
        <div className="flex flex-col gap-4 sm:gap-5 lg:col-span-5 xl:col-span-4">
          {/* 3. Assigned Vehicle Status */}
          <TruckStatusCard
            data={{
              name: driverMe?.truck_name || "Assigned Truck",
              plateNumber: driverMe?.truck_plate || "N/A",
              status: driverMe?.truck_status || "ACTIVE",
              availabilityStatus: driverMe?.truck_availability || "ACTIVE",
              wasteType: routeToday?.waste_type,
            }}
          />

          {/* 4. Dispatch & Admin Messages */}
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs flex-1 flex flex-col">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border/60 bg-muted/20 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-foreground font-display uppercase tracking-tight">
                  Dispatch & Admin Messages
                </span>
              </div>
              <button
                onClick={() => navigate("/collector/notifications")}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                View All <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {messages.length === 0 ? (
              <div className="px-5 py-8 text-center text-muted-foreground text-xs flex-1 flex items-center justify-center">
                <p>No new dispatch messages from MENRO Admin.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60 flex-1 flex flex-col justify-start">
                {messages.slice(0, 3).map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => navigate("/collector/notifications")}
                    className="px-4 sm:px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer flex items-start justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm text-foreground font-medium truncate group-hover:text-primary transition-colors">
                        {msg.message}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {msg.sender_name || "MENRO Dispatch"} ·{" "}
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!msg.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Report Truck Issue Modal ── */}
      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] sm:max-w-md flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
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

          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground tracking-tight block">
                Issue Category
              </label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger className="h-10 text-xs sm:text-sm rounded-xl border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Flat Tire">Flat Tire / Puncture</SelectItem>
                  <SelectItem value="Engine Problem">Engine Problem / Overheating</SelectItem>
                  <SelectItem value="Hydraulic Compactor Fault">Hydraulic / Compactor Fault</SelectItem>
                  <SelectItem value="Brake System Issue">Brake System Issue</SelectItem>
                  <SelectItem value="Fuel / Fluid Leak">Fuel / Fluid Leak</SelectItem>
                  <SelectItem value="Battery / Electrical">Battery / Electrical Failure</SelectItem>
                  <SelectItem value="Other Issue">Other Mechanical Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground tracking-tight block">
                Description & Current Location
              </label>
              <Textarea
                className="text-xs sm:text-sm min-h-[90px] rounded-xl border-border/80 resize-none"
                placeholder="Describe what happened and where the truck is currently stopped (e.g. Near Brgy. Malabanban Norte church)..."
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>This alert will be sent immediately to MENRO Admin dispatch.</span>
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2.5 shrink-0">
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
              className="h-10 px-5 rounded-xl text-xs sm:text-sm font-bold shadow-xs active:scale-[0.98] cursor-pointer transition-all"
            >
              {isSubmittingIssue ? "Submitting..." : "Send Breakdown Alert"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectorDashboard;

