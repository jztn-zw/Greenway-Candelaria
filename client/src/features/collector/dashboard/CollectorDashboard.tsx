import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Wrench, CloudOff, Droplets, Calendar,
  MessageSquare, ChevronRight, X, Sun, LayoutDashboard,
  Truck, AlertTriangle, Send, Clock, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AnimatedSection from "@/components/AnimatedSection";
import {
  CollectorDashboardSkeleton,
} from "@/components/PageLoadingSkeletons";
import ShiftStatusBadge from "./components/ShiftStatusBadge";
import AssignmentCard from "./components/AssignmentCard";
import TodayStatsCards from "./components/TodayStatsCards";
import TruckStatusCard from "./components/TruckStatusCard";
import CollectorDashboardGreeting from "./components/CollectorDashboardGreeting";
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

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const driverFirstName = (driverMe?.full_name || authUser?.full_name || "Collector").split(" ")[0];

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

  const shiftStatus: "on-route" | "off-duty" = (routeState === "in-progress" || routeState === "not-started") ? "on-route" : "off-duty";
  const isActive = routeState === "in-progress" || routeState === "completed";

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
      {/* ── Page Header (Matching Resident Dashboard layout) ── */}
      <AnimatedSection delay={0}>
        <CollectorDashboardGreeting
          driverName={driverMe?.full_name || authUser?.full_name || "Collector"}
          truckName={driverMe?.truck_name}
          truckPlate={driverMe?.truck_plate}
          routeName={routeToday?.name || routeToday?.route_name}
          wasteType={routeToday?.waste_type}
        />
      </AnimatedSection>

      {/* ── Assignment Card ── */}
      <AnimatedSection delay={60}>
        <AssignmentCard
          data={assignmentData}
          onAction={() => {
            if (assignmentData.routeState === "completed") {
              navigate("/collector/route-history");
            } else {
              navigate("/collector/route-map");
            }
          }}
        />
      </AnimatedSection>

      {/* ── Quick Actions ── */}
      <AnimatedSection delay={120}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Live Route Map */}
          <button
            type="button"
            onClick={() => navigate("/collector/route-map")}
            className="group flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/40 transition-all text-left shadow-2xs active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform duration-200">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                  Live Route Map
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Full GPS navigation & collection stops
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>

          {/* Card 2: Report Breakdown */}
          <button
            type="button"
            onClick={() => setIssueModalOpen(true)}
            className="group flex items-center justify-between p-4 rounded-2xl border border-destructive/25 bg-destructive/5 hover:border-destructive/40 hover:bg-destructive/10 transition-all text-left shadow-2xs active:scale-[0.99] cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center text-destructive shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-destructive tracking-tight">
                  Report Truck Breakdown
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Log flat tire, engine fault, or delay
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-destructive/50 group-hover:text-destructive group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </button>
        </div>
      </AnimatedSection>

      {/* ── Today's Stats ── */}
      <AnimatedSection delay={180}>
        <TodayStatsCards
          completed={completedStops}
          total={totalStops}
          skipped={skippedStops}
          timeElapsed={45}
          active={isActive}
        />
      </AnimatedSection>

      {/* ── Assigned Truck Status ── */}
      <AnimatedSection delay={240}>
        <TruckStatusCard
          data={{
            name: driverMe?.truck_name || "Assigned Truck",
            plateNumber: driverMe?.truck_plate || "N/A",
            status: driverMe?.truck_status || "ACTIVE",
            availabilityStatus: driverMe?.truck_availability || "ACTIVE",
          }}
        />
      </AnimatedSection>

      {/* ── Recent Admin / Dispatch Messages ── */}
      <AnimatedSection delay={300}>
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground font-display">Dispatch & Admin Messages</span>
            </div>
            <button
              onClick={() => navigate("/collector/notifications")}
              className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {messages.length === 0 ? (
            <div className="px-4 py-6 text-center text-muted-foreground text-sm">
              <p>No new messages from MENRO dispatch.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => navigate("/collector/notifications")}
                  className="px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground font-medium truncate">{msg.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {msg.sender_name || "MENRO Admin"} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
      </AnimatedSection>

      {/* ── Report Truck Issue Modal ── */}
      <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-destructive">
              <Wrench className="w-5 h-5 text-destructive" /> Report Truck Issue
            </DialogTitle>
            <DialogDescription>
              Report a breakdown or mechanical issue with truck <strong className="text-foreground">{driverMe?.truck_name || "your vehicle"}</strong> ({driverMe?.truck_plate || "N/A"}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Issue Category</label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Description & Location</label>
              <Textarea
                className="text-xs min-h-[90px] resize-none"
                placeholder="Describe what happened and your current location (e.g. Near Barangay Malabanban Norte church)..."
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>This alert will be sent immediately to MENRO Admin dispatch.</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIssueModalOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={isSubmittingIssue}
                onClick={handleReportIssue}
              >
                {isSubmittingIssue ? "Submitting..." : "Send Breakdown Alert"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectorDashboard;
