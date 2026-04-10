import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Wrench, CloudOff, Droplets, Calendar,
  MessageSquare, ChevronRight, X, Sun, CloudRain, Leaf
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AnimatedSection from "@/components/AnimatedSection";
import {
  BannerSkeleton,
  AssignmentCardSkeleton,
  QuickActionsSkeleton,
  TodayStatsCardsSkeleton,
  TruckStatusSkeleton,
  MessagesListSkeleton,
} from "@/components/PageLoadingSkeletons";
import ShiftStatusBadge from "./components/dashboard/ShiftStatusBadge";
import AssignmentCard from "./components/dashboard/AssignmentCard";
import TodayStatsCards from "./components/dashboard/TodayStatsCards";
import TruckStatusCard from "./components/dashboard/TruckStatusCard";
import {
  mockAssignment, mockTruckStatus, mockAdminMessages,
  mockSkippedYesterday, mockNextCollection,
  type ShiftStatus,
} from "./components/dashboard/mockData";

const CollectorDashboard = () => {
  const navigate = useNavigate();
  const [shiftStatus] = useState<ShiftStatus>("on-route");
  const [isOffline] = useState(false);
  const [showSkipReminder, setShowSkipReminder] = useState(mockSkippedYesterday > 0);
  const [showHydration, setShowHydration] = useState(mockAssignment.timeElapsedMinutes >= 120);
  const isActive = mockAssignment.routeState === "in-progress" || mockAssignment.routeState === "completed";

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateStr = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-8">
        <BannerSkeleton />
        <BannerSkeleton />
        <AssignmentCardSkeleton />
        <QuickActionsSkeleton />
        <TodayStatsCardsSkeleton />
        <TruckStatusSkeleton />
        <MessagesListSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-8">
      {/* Shift Status */}
      <AnimatedSection delay={0}>
        <div className="flex items-center justify-between">
          <ShiftStatusBadge status={shiftStatus} />
          <span className="text-xs text-muted-foreground hidden sm:block">{dateStr}</span>
        </div>
      </AnimatedSection>

      {/* Offline Banner */}
      {isOffline && (
        <AnimatedSection delay={40}>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 text-yellow-800 dark:text-yellow-300">
            <CloudOff className="w-4 h-4 shrink-0" />
            <p className="text-sm">You are offline — your progress will sync when your connection returns.</p>
          </div>
        </AnimatedSection>
      )}

      {/* Greeting + Briefing */}
      <AnimatedSection delay={60}>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">
                {greeting}, <span className="text-primary">Juan</span>
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-muted-foreground">Today: {mockAssignment.wasteType} Collection</p>
                <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  32°C · Sunny
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Assignment Card */}
      <AnimatedSection delay={120}>
        <AssignmentCard
          data={mockAssignment}
          onAction={() => {
            if (mockAssignment.routeState === "completed") {
              toast.info("Opening summary...");
            } else {
              navigate("/collector/route-map");
            }
          }}
        />
      </AnimatedSection>

      {/* Quick Actions */}
      <AnimatedSection delay={180}>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 rounded-xl border-border text-sm font-semibold hover:bg-primary/5 hover:border-primary/20"
            onClick={() => navigate("/collector/route-map")}
          >
            <MapPin className="w-4 h-4 mr-2 text-primary" />
            View My Route
          </Button>
          <Button
            variant="outline"
            className="h-12 rounded-xl border-border text-sm font-semibold hover:bg-destructive/5 hover:border-destructive/20"
            onClick={() => toast.info("Truck issue form coming soon")}
          >
            <Wrench className="w-4 h-4 mr-2 text-destructive" />
            Report Truck Issue
          </Button>
        </div>
      </AnimatedSection>

      {/* Today's Stats */}
      <AnimatedSection delay={240}>
        <TodayStatsCards
          completed={mockAssignment.completedStops}
          total={mockAssignment.totalStops}
          skipped={mockAssignment.skippedStops}
          timeElapsed={mockAssignment.timeElapsedMinutes}
          active={isActive}
        />
      </AnimatedSection>

      {/* Truck Status */}
      <AnimatedSection delay={300}>
        <TruckStatusCard data={mockTruckStatus} />
      </AnimatedSection>

      {/* Yesterday's Skip Reminder */}
      {showSkipReminder && (
        <AnimatedSection delay={340}>
          <div className="relative flex items-start gap-3 px-4 py-3 rounded-xl bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20">
            <div className="w-8 h-8 rounded-lg bg-yellow-200/60 dark:bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <CloudRain className="w-4 h-4 text-yellow-700 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                You skipped {mockSkippedYesterday} stops yesterday
              </p>
              <p className="text-xs text-yellow-700/70 dark:text-yellow-400/70 mt-0.5">Your supervisor has been notified.</p>
            </div>
            <button
              onClick={() => setShowSkipReminder(false)}
              className="absolute top-2 right-2 p-1 rounded-md hover:bg-yellow-200/50 dark:hover:bg-yellow-500/20"
            >
              <X className="w-3.5 h-3.5 text-yellow-700 dark:text-yellow-400" />
            </button>
          </div>
        </AnimatedSection>
      )}

      {/* End of Day Summary (only when completed) */}
      {mockAssignment.routeState === "completed" && (
        <AnimatedSection delay={380}>
          <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 space-y-3">
            <p className="text-sm font-semibold text-foreground font-display">End of Day Summary</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-lg font-bold text-foreground">{mockAssignment.completedStops}</p><p className="text-[11px] text-muted-foreground">Completed</p></div>
              <div><p className="text-lg font-bold text-foreground">{mockAssignment.skippedStops}</p><p className="text-[11px] text-muted-foreground">Skipped</p></div>
              <div><p className="text-lg font-bold text-foreground">{Math.floor(mockAssignment.timeElapsedMinutes / 60)}h {mockAssignment.timeElapsedMinutes % 60}m</p><p className="text-[11px] text-muted-foreground">Time on Route</p></div>
            </div>
            <Button className="w-full h-11 rounded-xl text-sm font-semibold" onClick={() => toast.success("End of day report submitted!")}>
              Submit End of Day Report
            </Button>
          </div>
        </AnimatedSection>
      )}

      {/* Next Collection Day */}
      <AnimatedSection delay={420}>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/40 border border-border">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            Next collection: <span className="font-semibold text-foreground">{mockNextCollection.day}</span> · {mockNextCollection.wasteType}
          </p>
        </div>
      </AnimatedSection>

      {/* Hydration Reminder */}
      {showHydration && (
        <AnimatedSection delay={460}>
          <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
            <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">You have been on route for 2 hours. Take a short break if needed.</p>
            <button
              onClick={() => setShowHydration(false)}
              className="absolute top-2 right-2 p-1 rounded-md hover:bg-blue-200/50 dark:hover:bg-blue-500/20"
            >
              <X className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </button>
          </div>
        </AnimatedSection>
      )}

      {/* Recent Admin Messages */}
      <AnimatedSection delay={500}>
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground font-display">Recent Messages</span>
            </div>
            <button className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {mockAdminMessages.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No messages from your supervisor.</p>
            </div>
          ) : (
            <div>
              {mockAdminMessages.map((msg) => (
                <div key={msg.id} className="px-4 py-3 border-b last:border-b-0 border-border hover:bg-muted/30 transition-colors cursor-pointer">
                  <p className="text-sm text-foreground truncate">{msg.preview}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{msg.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </AnimatedSection>
    </div>
  );
};

export default CollectorDashboard;
