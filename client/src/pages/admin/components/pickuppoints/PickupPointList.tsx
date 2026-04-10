import { useState, useMemo } from "react";
import { Search, Plus, MapPin, Truck, User, Pencil, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PickupPoint, PickupFilterTab } from "./types";
import { BARANGAY_LIST } from "./mockData";

interface PickupPointListProps {
  points: PickupPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

const statusConfig: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  verified: { icon: CheckCircle2, label: "Verified", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  pending: { icon: Clock, label: "Pending", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  rejected: { icon: XCircle, label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20" },
  deactivated: { icon: XCircle, label: "Inactive", className: "bg-muted text-muted-foreground border-border" },
};

const sourceIcons: Record<string, { icon: React.ElementType; label: string }> = {
  driver: { icon: Truck, label: "Driver" },
  resident: { icon: User, label: "Resident" },
  manual: { icon: Pencil, label: "Manual" },
};

const tabs: { value: PickupFilterTab; label: string; count?: (points: PickupPoint[]) => number }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending", count: (pts) => pts.filter((p) => p.status === "pending").length },
  { value: "verified", label: "Verified", count: (pts) => pts.filter((p) => p.status === "verified").length },
  { value: "flagged", label: "Flagged", count: (pts) => pts.filter((p) => p.flagged).length },
];

const PickupPointList = ({ points, selectedId, onSelect, onAdd }: PickupPointListProps) => {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<PickupFilterTab>("all");
  const [barangayFilter, setBarangayFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = [...points];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.label.toLowerCase().includes(q) ||
          p.barangay.toLowerCase().includes(q) ||
          p.submittedBy.toLowerCase().includes(q)
      );
    }

    if (barangayFilter !== "all") {
      result = result.filter((p) => p.barangay === barangayFilter);
    }

    switch (tab) {
      case "pending":
        result = result.filter((p) => p.status === "pending");
        break;
      case "verified":
        result = result.filter((p) => p.status === "verified");
        break;
      case "flagged":
        result = result.filter((p) => p.flagged);
        break;
    }

    return result;
  }, [points, search, tab, barangayFilter]);

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-display font-semibold text-foreground">Pickup Points</h2>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={onAdd}>
            <Plus className="w-3.5 h-3.5" />
            Add Point
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search label, barangay, or source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {/* Barangay filter */}
        <select
          value={barangayFilter}
          onChange={(e) => setBarangayFilter(e.target.value)}
          className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="all">All Barangays</option>
          {BARANGAY_LIST.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map((t) => {
            const count = t.count ? t.count(points) : points.length;
            const isActive = tab === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors
                  ${isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
              >
                {t.label}
                {t.count && (
                  <span className={`ml-1 ${isActive ? "opacity-80" : ""}`}>({count})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MapPin className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No pickup points found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filtered.map((point) => {
            const isSelected = selectedId === point.id;
            const status = statusConfig[point.status];
            const StatusIcon = status.icon;
            const source = sourceIcons[point.source];
            const SourceIcon = source.icon;

            return (
              <button
                key={point.id}
                onClick={() => onSelect(point.id)}
                className={`w-full text-left px-4 py-3.5 border-b border-border/50 transition-colors
                  ${isSelected
                    ? "bg-primary/[0.05] border-l-2 border-l-primary"
                    : "hover:bg-muted/30 border-l-2 border-l-transparent"
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    point.flagged ? "bg-destructive/10" : status.className.split(" ")[0]
                  }`}>
                    {point.flagged ? (
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                    ) : (
                      <StatusIcon className={`w-4 h-4 ${status.className.split(" ")[1]}`} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${point.label ? "text-foreground" : "text-muted-foreground italic"}`}>
                        {point.label || "Unlabeled Point"}
                      </p>
                      {point.flagged && (
                        <span className="text-[9px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                          FLAGGED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                        {point.barangay}
                      </Badge>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <SourceIcon className="w-3 h-3" />
                        {source.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className={`text-[10px] h-5 px-1.5 border ${status.className}`}>
                        {status.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(point.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer count */}
      <div className="px-4 py-2 border-t border-border bg-muted/20">
        <p className="text-[10px] text-muted-foreground text-center">
          Showing {filtered.length} of {points.length} points
        </p>
      </div>
    </Card>
  );
};

export default PickupPointList;
