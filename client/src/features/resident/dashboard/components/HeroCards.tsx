import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  AlertTriangle,
  MapPin,
  Package,
  CheckCircle2,
  Clock,
  Timer,
  ArrowRight,
  PlusCircle,
  Radio,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchLiveTrucks, LiveRow } from "@/services/trackingService";
import { fetchMyReports, MyReportRow } from "@/services/reportsService";
import useAuthStore from "@/store/authStore";

// --- Waste schedule for Candelaria MENRO ---
const wasteTypes: Record<string, { label: string; tag: string; tagColor: string; description: string }> = {
  Mon: { label: "Biodegradable", tag: "Biodegradable", tagColor: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30", description: "Food scraps, yard waste, compostable items" },
  Tue: { label: "Non-Biodegradable", tag: "Non-Bio / Recyclables", tagColor: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30", description: "Plastics, metals, paper, dry waste" },
  Wed: { label: "Biodegradable", tag: "Biodegradable", tagColor: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30", description: "Food scraps, yard waste, compostable items" },
  Thu: { label: "Non-Biodegradable", tag: "Non-Bio / Recyclables", tagColor: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30", description: "Plastics, metals, paper, dry waste" },
  Fri: { label: "Biodegradable", tag: "Biodegradable", tagColor: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30", description: "Food scraps, yard waste, compostable items" },
  Sat: { label: "Non-Biodegradable", tag: "Non-Bio / Recyclables", tagColor: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30", description: "Plastics, metals, paper, dry waste" },
  Sun: { label: "Biodegradable", tag: "Biodegradable", tagColor: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30", description: "Food scraps, yard waste, compostable items" },
};

const dayKeys = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const todayKey = dayKeys[new Date().getDay()];
const todayWaste = wasteTypes[todayKey] || wasteTypes.Mon;

const statusBadgeConfig: Record<string, { class: string; label: string }> = {
  SUBMITTED:    { class: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 dark:bg-amber-500/20", label: "Submitted" },
  PENDING:      { class: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 dark:bg-amber-500/20", label: "Pending" },
  UNDER_REVIEW: { class: "bg-blue-500/15 text-blue-800 dark:text-blue-300 border-blue-500/30 dark:bg-blue-500/20", label: "Under Review" },
  DISPATCHED:   { class: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border-purple-500/30 dark:bg-purple-500/20", label: "Dispatched" },
  RESOLVED:     { class: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 dark:bg-emerald-500/20", label: "Resolved" },
};

const HeroCards = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [liveTrucks, setLiveTrucks] = useState<LiveRow[]>([]);
  const [latestReport, setLatestReport] = useState<MyReportRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const [trucksRes, reportsRes] = await Promise.allSettled([
          fetchLiveTrucks(),
          fetchMyReports({ limit: 1, sort: "newest" }),
        ]);

        if (!mounted) return;

        if (trucksRes.status === "fulfilled") {
          setLiveTrucks(trucksRes.value || []);
        }
        if (reportsRes.status === "fulfilled" && reportsRes.value.reports?.length > 0) {
          setLatestReport(reportsRes.value.reports[0]);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadData();
    const interval = setInterval(() => void loadData(), 12000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const activeTruck = liveTrucks.find((t) => t.truck_status === "ON_THE_WAY") || liveTrucks[0];
  const hasActive = liveTrucks.length > 0 && activeTruck && activeTruck.truck_status === "ON_THE_WAY";

  return (
    <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {/* ─── Card 1: Today's Collection Schedule ─── */}
      <Card className="border border-border/80 bg-card/80 backdrop-blur-sm overflow-hidden hover:shadow-md transition-all group flex flex-col justify-between">
        <CardContent className="p-0">
          <div className="h-1 bg-primary" />
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-primary" />
                Today's Schedule
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${todayWaste.tagColor}`}>
                {todayWaste.tag}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-foreground truncate">{todayWaste.label}</h4>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{todayWaste.description}</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Standard pickup starts:</span>
              <strong className="text-foreground font-semibold">6:00 AM - 10:00 AM</strong>
            </div>
          </div>
        </CardContent>
        <div className="px-4 sm:px-5 pb-4">
          <button
            onClick={() => navigate("/resident/schedule")}
            className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
          >
            View full weekly calendar <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>

      {/* ─── Card 2: Live Truck Status ─── */}
      <Card className="border border-border/80 bg-card/80 backdrop-blur-sm overflow-hidden hover:shadow-md transition-all group flex flex-col justify-between">
        <CardContent className="p-0">
          <div className={`h-1 ${hasActive ? "bg-primary animate-pulse" : "bg-muted-foreground/30"}`} />
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-primary" />
                Collection Truck
              </span>
              {hasActive ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  Live On Route
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                  Standby
                </span>
              )}
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                hasActive ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground"
              }`}>
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-foreground">
                  {hasActive ? activeTruck.truck_name || activeTruck.truck_plate : "Candelaria Fleet"}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasActive
                    ? `Driver: ${activeTruck.driver_name || "Assigned Driver"}`
                    : "No trucks actively collecting right now"}
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-[11px] flex items-center justify-between">
              <span className="text-muted-foreground">Active Units:</span>
              <span className="font-bold text-foreground">{liveTrucks.length} truck{liveTrucks.length !== 1 ? "s" : ""} online</span>
            </div>
          </div>
        </CardContent>
        <div className="px-4 sm:px-5 pb-4">
          <button
            onClick={() => navigate("/resident/tracking")}
            className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
          >
            <MapPin className="w-3.5 h-3.5" /> Open live GPS map <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>

      {/* ─── Card 3: Latest Report ─── */}
      <Card className="border border-border/80 bg-card/80 backdrop-blur-sm overflow-hidden hover:shadow-md transition-all group flex flex-col justify-between sm:col-span-2 lg:col-span-1">
        <CardContent className="p-0">
          <div className="h-1 bg-earth-dark" />
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Latest Waste Report
              </span>
              {latestReport && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  statusBadgeConfig[latestReport.status]?.class || "bg-muted text-muted-foreground"
                }`}>
                  {statusBadgeConfig[latestReport.status]?.label || latestReport.status}
                </span>
              )}
            </div>

            {latestReport ? (
              <>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 border border-destructive/20 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {latestReport.violation_type?.replace(/_/g, " ")}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {latestReport.description || "Report submitted for inspection"}
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-[11px] flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">{latestReport.reference_number}</span>
                  <span className="text-muted-foreground">
                    {new Date(latestReport.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-2 text-center space-y-1">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <p className="text-xs font-semibold text-foreground">No pending waste reports</p>
                <p className="text-[11px] text-muted-foreground">Your area has zero open issues logged.</p>
              </div>
            )}
          </div>
        </CardContent>
        <div className="px-4 sm:px-5 pb-4">
          <button
            onClick={() => navigate("/resident/my-reports")}
            className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
          >
            {latestReport ? "View report history" : "Submit new report"} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>
    </div>
  );
};

export default HeroCards;

