import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  RotateCw,
} from "lucide-react";
import type { AdminTruck } from "../types";
import {
  fetchMissedCollections,
  type MissedCollectionRow,
} from "@/services/trackingService";
import { useNavigate } from "react-router-dom";

interface MissedCollectionLogProps {
  trucks: AdminTruck[];
}

const formatEntryDate = (value?: string | null) => {
  if (!value) return "No timestamp";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "No timestamp";
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const MissedCollectionLogDynamic = ({ trucks }: MissedCollectionLogProps) => {
  const navigate = useNavigate();
  const [truckFilter, setTruckFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const [entries, setEntries] = useState<MissedCollectionRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const rows = await fetchMissedCollections({ days: 30 });
      setEntries(rows);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const rows = await fetchMissedCollections({ days: 30 });
        if (!cancelled) setEntries(rows);
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    const interval = setInterval(() => {
      if (!document.hidden) {
        void load();
      }
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(
    () =>
      entries.filter((entry) => {
        if (truckFilter !== "all" && entry.truck !== truckFilter) return false;
        if (barangayFilter !== "all" && entry.barangay !== barangayFilter) {
          return false;
        }
        return true;
      }),
    [entries, truckFilter, barangayFilter],
  );

  const barangays = useMemo(
    () => [...new Set(entries.map((entry) => entry.barangay))],
    [entries],
  );

  return (
    <div className="space-y-3">
      {/* Filter Row */}
      <div className="flex gap-1.5 items-center">
        <Select value={truckFilter} onValueChange={setTruckFilter}>
          <SelectTrigger className="h-8.5 text-xs flex-1 rounded-xl">
            <SelectValue placeholder="All trucks" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Trucks</SelectItem>
            {trucks.map((truck) => (
              <SelectItem key={truck.id} value={truck.name}>
                {truck.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={barangayFilter} onValueChange={setBarangayFilter}>
          <SelectTrigger className="h-8.5 text-xs flex-1 rounded-xl">
            <SelectValue placeholder="All barangays" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Barangays</SelectItem>
            {barangays.map((barangay) => (
              <SelectItem key={barangay} value={barangay}>
                {barangay}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8.5 px-2.5 rounded-xl text-xs shrink-0 cursor-pointer"
          onClick={loadEntries}
          disabled={isLoading}
          title="Refresh missed stops log"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RotateCw className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>

      {/* Entry List */}
      <div className="space-y-2">
        {isLoading && filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Loading missed collection logs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-1">
            <AlertTriangle className="w-6 h-6 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-semibold text-foreground">
              No missed collections recorded
            </p>
            <p className="text-[11px] text-muted-foreground">
              All scheduled stops are currently on track or completed.
            </p>
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-border/80 bg-card hover:bg-muted/20 transition-all shadow-2xs"
            >
              <div className="w-8 h-8 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-foreground truncate">
                    {entry.barangay}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-medium border-border/60 shrink-0">
                    {formatEntryDate(entry.event_at)}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {entry.truck} · {entry.driver || "Unassigned"}
                </p>
                {entry.reason && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                    {entry.reason}
                  </p>
                )}
                {entry.resident_report_link && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    onClick={() =>
                      navigate(
                        `/admin/reports?search=${encodeURIComponent(entry.resident_report_link || "")}`,
                      )
                    }
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View Related Report</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MissedCollectionLogDynamic;
