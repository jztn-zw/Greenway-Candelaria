import { useState, useMemo, useEffect } from "react";
import {
  History, TrendingUp, MapPin, SkipForward, Target,
  ChevronRight, Leaf, Droplet, Calendar, Clock, Filter,
  ArrowLeft, CheckCircle2, AlertTriangle, MessageSquare, Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { mockRouteHistory, mockPerformanceData } from "./mockData";
import type { RouteHistoryEntry, StatusFilter, WasteTypeFilter, DatePreset } from "./types";

const RouteHistorySkeleton = () => (
  <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-8">
    <div className="flex items-center gap-3 mb-6">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-3 w-52" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="w-9 h-9 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
    <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
      <Skeleton className="w-4 h-4" />
      <Skeleton className="h-8 w-[140px] rounded-md" />
      <Skeleton className="h-8 w-[140px] rounded-md" />
      <Skeleton className="h-8 w-[155px] rounded-md" />
    </div>
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border">
        <Skeleton className="w-12 h-10" />
        <Skeleton className="h-5 w-12 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    ))}
  </div>
);
const statusBadge = (status: RouteHistoryEntry["status"]) => {
  switch (status) {
    case "completed": return { label: "Completed", cls: "bg-primary/15 text-primary border-primary/20" };
    case "partial": return { label: "Partial", cls: "bg-yellow-500/15 text-yellow-600 border-yellow-500/20" };
    default: return { label: "No Collection", cls: "bg-muted text-muted-foreground border-border" };
  }
};

const ringColor = (pct: number) => (pct >= 90 ? "text-primary" : pct >= 70 ? "text-yellow-500" : "text-destructive");

const groupByWeek = (entries: RouteHistoryEntry[]) => {
  const groups: { label: string; entries: RouteHistoryEntry[] }[] = [];
  let currentGroup: typeof groups[0] | null = null;

  entries.forEach((entry) => {
    const d = new Date(entry.date);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    const label = `Week of ${monday.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${friday.toLocaleDateString("en-US", { day: "numeric" })}, ${friday.getFullYear()}`;
    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, entries: [] };
      groups.push(currentGroup);
    }
    currentGroup.entries.push(entry);
  });
  return groups;
};

/* ────── Completion Ring SVG ────── */
const MiniRing = ({ pct }: { pct: number }) => {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="44" height="44" className="shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
      <circle
        cx="22" cy="22" r={r} fill="none"
        stroke="currentColor"
        strokeWidth="4" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
        className={ringColor(pct)}
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="22" textAnchor="middle" dominantBaseline="central"
        className="fill-foreground text-[10px] font-bold" style={{ fontFamily: "Inter" }}>
        {pct}%
      </text>
    </svg>
  );
};

/* ────── Main Component ────── */
const CollectorRouteHistory = () => {
  const [datePreset, setDatePreset] = useState<DatePreset>("this-month");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [wasteFilter, setWasteFilter] = useState<WasteTypeFilter>("all");
  const [selectedRoute, setSelectedRoute] = useState<RouteHistoryEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    return mockRouteHistory.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (wasteFilter !== "all" && e.wasteType !== wasteFilter) return false;
      return true;
    });
  }, [statusFilter, wasteFilter]);

  const grouped = useMemo(() => groupByWeek(filtered), [filtered]);

  // Monthly summary
  const routesCompleted = mockRouteHistory.filter((e) => e.status !== "no-collection").length;
  const totalSkipped = mockRouteHistory.reduce((s, e) => s + (e.totalStops - e.completedStops), 0);
  const avgCompletion = Math.round(mockRouteHistory.reduce((s, e) => s + e.completionPct, 0) / mockRouteHistory.length);

  if (isLoading) return <RouteHistorySkeleton />;

  /* ────── Route Detail View ────── */
  if (selectedRoute) {
    const r = selectedRoute;
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-8">
        <button
          onClick={() => setSelectedRoute(null)}
          className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to History
        </button>

        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{r.dayOfWeek}</p>
              <h2 className="text-lg font-display font-bold text-foreground">{r.date}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`text-xs ${r.wasteType === "Biodegradable" ? "bg-primary/15 text-primary border-primary/20" : "bg-blue-500/15 text-blue-600 border-blue-500/20"}`}>
                  {r.wasteType === "Biodegradable" ? <Leaf className="w-3 h-3 mr-1" /> : <Droplet className="w-3 h-3 mr-1" />}
                  {r.wasteType}
                </Badge>
                <span className="text-xs text-muted-foreground">{r.routeName}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted/40 rounded-lg py-2">
              <p className="text-lg font-bold text-foreground">{r.completedStops}/{r.totalStops}</p>
              <p className="text-[10px] text-muted-foreground">Stops Done</p>
            </div>
            <div className="bg-muted/40 rounded-lg py-2">
              <p className="text-lg font-bold text-foreground">{r.totalStops - r.completedStops}</p>
              <p className="text-[10px] text-muted-foreground">Skipped</p>
            </div>
            <div className="bg-muted/40 rounded-lg py-2">
              <p className="text-lg font-bold text-foreground">{r.timeOnRoute}</p>
              <p className="text-[10px] text-muted-foreground">Time on Route</p>
            </div>
          </div>
        </div>

        {/* Stop by Stop */}
        <div className="space-y-2">
          <h3 className="text-sm font-display font-semibold text-foreground px-1">Stop by Stop Breakdown</h3>
          <div className="space-y-1.5">
            {r.stops.map((stop) => (
              <div
                key={stop.stopNumber}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                  stop.status === "skipped" ? "border-yellow-500/20 bg-yellow-500/5" : "border-border bg-card"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  stop.status === "done" ? "bg-primary/15 text-primary" : "bg-yellow-500/15 text-yellow-600"
                }`}>
                  {stop.stopNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{stop.barangay}</p>
                    {stop.status === "done" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {stop.status === "done" ? `Marked done at ${stop.time}` : `Skipped at ${stop.time}`}
                  </p>
                  {stop.skipReason && (
                    <p className="text-[11px] text-yellow-600 mt-0.5">Reason: {stop.skipReason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications Sent */}
        <div className="space-y-2">
          <h3 className="text-sm font-display font-semibold text-foreground px-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Residents Notified
          </h3>
          <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
            {r.stops.filter((s) => s.status === "done" && s.residentsNotified).map((stop) => (
              <div key={stop.stopNumber} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-foreground">{stop.barangay}</span>
                <span className="text-xs text-muted-foreground">{stop.residentsNotified} residents notified</span>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Messages */}
        <div className="space-y-2">
          <h3 className="text-sm font-display font-semibold text-foreground px-1 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            Admin Messages That Day
          </h3>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {r.adminMessages.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground text-center">No messages from supervisor on this day.</p>
            ) : (
              <div className="divide-y divide-border">
                {r.adminMessages.map((msg, i) => (
                  <div key={i} className="px-4 py-3">
                    <p className="text-sm text-foreground">{msg.message}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{msg.time}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ────── Main List View ────── */
  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 pb-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <History className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Route History</h1>
            <p className="text-sm text-muted-foreground">Your personal collection logbook and performance.</p>
          </div>
        </div>
      </div>


      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Routes Completed", value: routesCompleted, icon: MapPin, accent: true },
          { label: "Total Stops Skipped", value: totalSkipped, icon: SkipForward },
          { label: "Avg. Completion", value: `${avgCompletion}%`, icon: Target },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-card border rounded-xl p-4 ${kpi.accent ? "border-primary/20 border-l-4 border-l-primary" : "border-border"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <p className="text-lg font-bold text-foreground mt-1 tabular-nums">{kpi.value}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <kpi.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl px-4 py-3">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="no-collection">No Collection</SelectItem>
          </SelectContent>
        </Select>
        <Select value={wasteFilter} onValueChange={(v) => setWasteFilter(v as WasteTypeFilter)}>
          <SelectTrigger className="w-[155px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Waste Types</SelectItem>
            <SelectItem value="Biodegradable">Biodegradable</SelectItem>
            <SelectItem value="Non-Biodegradable">Non-Biodegradable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Route History List */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-16 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <History className="w-7 h-7 text-primary" />
          </div>
          <p className="text-sm font-display font-semibold text-foreground">No routes completed yet.</p>
          <p className="text-xs text-muted-foreground max-w-[260px] mx-auto">
            Your route history will appear here after your first collection day.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <div key={group.label} className="space-y-2">
              {/* Week divider */}
              <div className="flex items-center gap-3 px-1">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-display font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Entries */}
              <div className="space-y-1.5">
                {group.entries.map((entry) => {
                  const badge = statusBadge(entry.status);
                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedRoute(entry)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors text-left group"
                    >
                      {/* Date col */}
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-xs font-bold text-foreground">{entry.date.split(", ")[0].split(" ")[1]}</p>
                        <p className="text-[10px] text-muted-foreground">{entry.dayOfWeek.slice(0, 3)}</p>
                      </div>

                      {/* Waste badge */}
                      <Badge className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${
                        entry.wasteType === "Biodegradable" ? "bg-primary/15 text-primary border-primary/20" : "bg-blue-500/15 text-blue-600 border-blue-500/20"
                      }`}>
                        {entry.wasteType === "Biodegradable" ? <Leaf className="w-3 h-3 mr-0.5" /> : <Droplet className="w-3 h-3 mr-0.5" />}
                        {entry.wasteType.slice(0, 3)}
                      </Badge>

                      {/* Route info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{entry.routeName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground">{entry.completedStops}/{entry.totalStops} stops</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="text-[11px] text-muted-foreground">{entry.timeOnRoute}</span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-[10px] px-1.5 h-5 ${badge.cls}`}>
                          {badge.label}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectorRouteHistory;
