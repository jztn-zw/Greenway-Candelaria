import { useState, useEffect } from "react";
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
import { fetchLiveTrucks, LiveRow } from "@/services/trackingService";
import { fetchMyReports, MyReportRow } from "@/services/reportsService";
import {
  CollectionScheduleDay,
  fetchCollectionSchedule,
} from "@/services/scheduleService";

const wasteTypeDetails: Record<CollectionScheduleDay["waste_type"], {
  label: string;
  tag: string;
  tagColor: string;
  description: string;
}> = {
  BIODEGRADABLE: {
    label: "Biodegradable",
    tag: "Biodegradable",
    tagColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    description: "Food scraps, yard waste, compostable items",
  },
  NON_BIODEGRADABLE: {
    label: "Non-Biodegradable",
    tag: "Non-Bio / Recyclables",
    tagColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    description: "Plastics, metals, paper, dry waste",
  },
};

const todayDayOfWeek = () =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "Asia/Manila",
  }).format(new Date()).toUpperCase();

const formatScheduleTime = (time?: string | null) => {
  if (!time) return "—";
  const [hourValue = "0", minute = "00"] = time.split(":");
  const hour = Number(hourValue);
  if (Number.isNaN(hour)) return "—";
  return `${((hour + 11) % 12) + 1}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
};

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
  const [liveTrucks, setLiveTrucks] = useState<LiveRow[]>([]);
  const [latestReport, setLatestReport] = useState<MyReportRow | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<CollectionScheduleDay | null>(null);
  const [trucksFailed, setTrucksFailed] = useState(false);
  const [reportsFailed, setReportsFailed] = useState(false);
  const [scheduleFailed, setScheduleFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [trucksRes, reportsRes, scheduleRes] = await Promise.allSettled([
          fetchLiveTrucks(),
          fetchMyReports({ limit: 1, sort: "newest" }),
          fetchCollectionSchedule(),
        ]);

        if (!mounted) return;

        if (trucksRes.status === "fulfilled") {
          setLiveTrucks(trucksRes.value || []);
          setTrucksFailed(false);
        } else {
          setLiveTrucks([]);
          setTrucksFailed(true);
        }
        if (reportsRes.status === "fulfilled") {
          setLatestReport(reportsRes.value.reports?.[0] ?? null);
          setReportsFailed(false);
        } else {
          setLatestReport(null);
          setReportsFailed(true);
        }
        if (scheduleRes.status === "fulfilled") {
          setTodaySchedule(
            scheduleRes.value.find((schedule) => schedule.day_of_week === todayDayOfWeek()) ?? null,
          );
          setScheduleFailed(false);
        } else {
          setTodaySchedule(null);
          setScheduleFailed(true);
        }
      } catch (error) {
        console.error("Failed to load resident dashboard hero data", error);
      }
    };

    void loadData();
    const interval = setInterval(() => void loadData(), 12000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // The live endpoint retains the most recent GPS ping for offline trucks, so only
  // trucks currently on route count as live on the resident dashboard.
  const activeTrucks = liveTrucks.filter((truck) => truck.truck_status === "ON_THE_WAY");
  const activeTruck = activeTrucks[0];
  const hasActive = activeTrucks.length > 0;
  const todayWaste = todaySchedule ? wasteTypeDetails[todaySchedule.waste_type] : null;
  const scheduleTime = todaySchedule
    ? `${formatScheduleTime(todaySchedule.start_time)}${todaySchedule.end_time ? ` – ${formatScheduleTime(todaySchedule.end_time)}` : ""}`
    : "Not scheduled";

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 lg:gap-3.5">
      {/* ─── Card 1: Today's Collection Schedule ─── */}
      <Card
        onClick={() => navigate("/resident/schedule")}
        className="flex cursor-pointer flex-col justify-between space-y-3 rounded-2xl border border-border/80 bg-card/90 p-4 shadow-2xs backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:shadow-md lg:space-y-4 lg:p-5"
      >
          <div className="space-y-3 lg:space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:text-[11px]">
              Today's Schedule
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs ${todayWaste ? todayWaste.tagColor : "bg-muted/60 text-muted-foreground border-border/80"}`}>
              {todayWaste ? todayWaste.tag : scheduleFailed ? "Unavailable" : "No collection"}
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-display text-sm font-bold tracking-tight text-foreground transition-colors group-hover:text-primary lg:text-base">
                {todayWaste ? todayWaste.label : scheduleFailed ? "Schedule unavailable" : "No collection scheduled"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {todayWaste
                  ? todayWaste.description
                  : scheduleFailed
                    ? "The collection schedule could not be loaded right now."
                    : "No collection schedule has been published for today."}
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
          <span>View weekly calendar</span>
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
                  {new Date(latestReport.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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

