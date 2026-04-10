import { useState, useMemo, useEffect } from "react";
import {
  Search, Download, Building2, Users, Route, Star, AlertTriangle,
  LayoutGrid, LayoutList, Filter, MapPin, TrendingUp, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Barangay } from "./types";
import BarangayDetailPanel from "./BarangayDetailPanel";
import { cn } from "@/lib/utils";
import {
  PageHeaderSkeleton, KPIRowSkeleton, ToolbarSkeleton, SplitPanelSkeleton,
} from "@/components/PageLoadingSkeletons";
import {
  fetchBarangaysAdminOverview,
  updateBarangay,
  type BarangayAdminOverviewRow,
} from "@/services/barangaysService";

const dayLabelMap: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

const mapBackendReportStatus = (status: string): string => {
  const key = String(status || "").toUpperCase();
  if (key === "SUBMITTED") return "Submitted";
  if (key === "UNDER_REVIEW") return "Under Review";
  if (key === "DISPATCHED") return "Dispatched";
  if (key === "RESOLVED") return "Resolved";
  return status || "Submitted";
};

const buildBarangayRows = (
  rows: BarangayAdminOverviewRow[],
): Barangay[] => {
  return rows.map((row) => {
    const stats = row.stats;
    const routesForBarangay = row.assigned_routes ?? [];
    const reportsForBarangay = row.recent_reports ?? [];
    const activeRoutes = routesForBarangay.filter(
      (route) => String(route.route_status).toUpperCase() === "ACTIVE",
    );

    const completedStops = Number(stats?.completed_stops ?? 0);
    const totalStops = Number(stats?.total_stops ?? 0);
    const collectionCompletionRate =
      totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;

    return {
      id: row.id,
      name: row.name,
      zone: row.zone || "Unassigned",
      status: row.status === "ACTIVE" ? "Active" : "Inactive",
      isPriority: Boolean(row.is_priority),
      residentCount: Number(stats?.total_residents ?? 0),
      activeRoutes: activeRoutes.length,
      totalReports: Number(stats?.total_reports ?? 0),
      resolvedReports: Number(stats?.resolved_reports ?? 0),
      pendingReports: Number(stats?.pending_reports ?? 0),
      collectionCompletionRate,
      notes: row.notes ?? "",
      assignedRoutes: routesForBarangay.map((route) => ({
        routeName: route.route_name || `Route ${route.route_id.slice(-4)}`,
        truckName: route.truck_name,
        driverName: route.driver_name || "Unassigned",
        days: [dayLabelMap[route.day_of_week] || route.day_of_week],
      })),
      recentReports: reportsForBarangay.map((report) => ({
        referenceNumber: report.reference_number,
        violationType: report.violation_type,
        status: mapBackendReportStatus(report.status),
        date: report.created_at,
      })),
      wasteSchedule: routesForBarangay.map((route) => ({
        day: dayLabelMap[route.day_of_week] || route.day_of_week,
        wasteType: route.waste_type || "Not specified",
      })),
    };
  });
};

const AdminBarangays = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...barangays];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(b => b.name.toLowerCase().includes(q));
    }
    if (zoneFilter !== "all") result = result.filter(b => b.zone === zoneFilter);
    if (statusFilter !== "all") result = result.filter(b => b.status === statusFilter);
    // Priority barangays first
    result.sort((a, b) => (b.isPriority ? 1 : 0) - (a.isPriority ? 1 : 0));
    return result;
  }, [barangays, search, zoneFilter, statusFilter]);

  const selectedBarangay = selectedId ? barangays.find(b => b.id === selectedId) || null : null;

  const activeCount = barangays.filter(b => b.status === "Active").length;
  const priorityCount = barangays.filter(b => b.isPriority).length;
  const avgCompletion = Math.round(barangays.reduce((s, b) => s + b.collectionCompletionRate, 0) / barangays.length);
  const totalResidents = barangays.reduce((s, b) => s + b.residentCount, 0);

  const zoneOptions = useMemo(
    () =>
      Array.from(
        new Set(
          barangays
            .map((b) => String(b.zone || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [barangays],
  );

  const handleUpdate = async (updated: Barangay): Promise<boolean> => {
    const current = barangays.find((b) => b.id === updated.id);
    if (!current) return false;

    const payload: {
      zone?: string;
      is_priority?: boolean;
      status?: "ACTIVE" | "INACTIVE";
    } = {};

    if (current.zone !== updated.zone) payload.zone = updated.zone;
    if (current.isPriority !== updated.isPriority) {
      payload.is_priority = updated.isPriority;
    }
    if (current.status !== updated.status) {
      payload.status = updated.status === "Active" ? "ACTIVE" : "INACTIVE";
    }
    if ((current.notes || "") !== (updated.notes || "")) {
      payload.notes = updated.notes || "";
    }

    if (Object.keys(payload).length === 0) {
      return true;
    }

    try {
      const saved = await updateBarangay(updated.id, payload);
      setBarangays((prev) =>
        prev.map((b) =>
          b.id === updated.id
            ? {
                ...b,
                zone: saved.zone || updated.zone,
                isPriority: Boolean(saved.is_priority),
                status: saved.status === "ACTIVE" ? "Active" : "Inactive",
                notes: saved.notes ?? updated.notes,
              }
            : b,
        ),
      );
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update barangay.",
      );
      return false;
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Zone", "Status", "Priority", "Residents", "Active Routes", "Completion Rate", "Total Reports", "Resolved", "Pending"];
    const rows = filtered.map(b => [
      b.name, b.zone, b.status, b.isPriority ? "Yes" : "No", b.residentCount,
      b.activeRoutes, `${b.collectionCompletionRate}%`, b.totalReports, b.resolvedReports, b.pendingReports
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "barangays.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Barangay list exported as CSV");
  };

  useEffect(() => {
    let mounted = true;

    const loadBarangays = async () => {
      try {
        setIsLoading(true);
        const barangayRows = await fetchBarangaysAdminOverview();

        if (!mounted) return;

        const mapped = buildBarangayRows(barangayRows);
        setBarangays(mapped);
        if (mapped.length > 0) {
          setSelectedId((prev) => prev ?? mapped[0].id);
        }
      } catch (err) {
        if (!mounted) return;
        toast.error(
          err instanceof Error ? err.message : "Failed to load barangays.",
        );
        setBarangays([]);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadBarangays();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-5">
        <PageHeaderSkeleton />
        <KPIRowSkeleton count={4} />
        <ToolbarSkeleton />
        <SplitPanelSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-display">Barangay Manager</h1>
              <p className="text-sm text-muted-foreground">Manage all 25 barangays of Candelaria — zones, routes, and operational data.</p>
            </div>
          </div>
          <Button onClick={exportCSV} variant="outline" className="gap-2 shadow-sm">
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Barangays", value: barangays.length, icon: Building2, color: "text-primary", bg: "bg-primary/10" },
          { label: "Active", value: activeCount, icon: MapPin, color: "text-[hsl(var(--leaf))]", bg: "bg-[hsl(var(--leaf))]/10" },
          { label: "Priority", value: priorityCount, icon: Star, color: "text-amber-600", bg: "bg-amber-500/10" },
          { label: "Avg. Completion", value: `${avgCompletion}%`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", sub: `${totalResidents} total residents` },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search barangay..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={zoneFilter} onValueChange={setZoneFilter}>
              <SelectTrigger className="w-[150px] bg-background text-xs">
                <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Zones</SelectItem>
                {zoneOptions.map((z) => (
                  <SelectItem key={z} value={z}>
                    {z} Zone
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] bg-background text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border border-border rounded-lg overflow-hidden ml-auto">
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-none", viewMode === "list" && "bg-primary/10 text-primary")}
                onClick={() => setViewMode("list")}
              >
                <LayoutList className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-none", viewMode === "grid" && "bg-primary/10 text-primary")}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Split Layout: List/Grid + Detail Panel */}
      <div className="flex gap-5 items-start">
        {/* Left: List or Grid */}
        <div className="flex-1 min-w-0">
          {viewMode === "list" ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Barangay</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Zone</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground text-center">Residents</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground text-center">Routes</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Completion</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Status</TableHead>
                      <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                          No barangays match your filters.
                        </TableCell>
                      </TableRow>
                    ) : filtered.map(b => (
                      <TableRow
                        key={b.id}
                        onClick={() => setSelectedId(b.id)}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedId === b.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/50"
                        )}
                      >
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{b.name}</span>
                            {b.isPriority && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/15">{b.zone}</Badge>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{b.residentCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Route className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{b.activeRoutes}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={b.collectionCompletionRate} className="h-1.5 flex-1" />
                            <span className="text-[11px] font-semibold text-foreground w-9 text-right">{b.collectionCompletionRate}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge variant="outline" className={`text-[10px] ${b.status === "Active" ? "bg-[hsl(var(--leaf))]/10 text-[hsl(var(--leaf))] border-[hsl(var(--leaf))]/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3">
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Showing {filtered.length} of {barangays.length} barangays
                </p>
              </div>
            </Card>
          ) : (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                  No barangays match your filters.
                </div>
              ) : filtered.map(b => (
                <Card
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={cn(
                    "p-4 cursor-pointer transition-all hover:shadow-md",
                    selectedId === b.id ? "ring-2 ring-primary/30 bg-primary/5" : "hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-foreground">{b.name}</h3>
                          {b.isPriority && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        </div>
                        <Badge variant="outline" className="text-[9px] mt-0.5 bg-primary/5 text-primary border-primary/15">{b.zone} Zone</Badge>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[9px] ${b.status === "Active" ? "bg-[hsl(var(--leaf))]/10 text-[hsl(var(--leaf))] border-[hsl(var(--leaf))]/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                      {b.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{b.residentCount}</span>
                    <span className="flex items-center gap-1"><Route className="w-3 h-3" />{b.activeRoutes} routes</span>
                    <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{b.pendingReports} pending</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Progress value={b.collectionCompletionRate} className="h-1.5 flex-1" />
                    <span className="text-[11px] font-bold text-foreground">{b.collectionCompletionRate}%</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right: Detail Panel (desktop) */}
        <div className="hidden lg:block w-[400px] shrink-0 sticky top-4">
          <BarangayDetailPanel barangay={selectedBarangay} onUpdate={handleUpdate} />
        </div>
      </div>

      {/* Mobile detail panel */}
      {selectedBarangay && (
        <div className="lg:hidden">
          <BarangayDetailPanel barangay={selectedBarangay} onUpdate={handleUpdate} />
        </div>
      )}
    </div>
  );
};

export default AdminBarangays;
