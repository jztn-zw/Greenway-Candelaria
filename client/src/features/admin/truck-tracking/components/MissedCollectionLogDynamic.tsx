import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useAdminQuery } from "@/lib/adminQuery";
import {
fetchMissedCollections
} from "@/services/trackingService";
import {
AlertTriangle,
Loader2,
RotateCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { AdminTruck } from "../types";

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
  const [truckFilter, setTruckFilter] = useState("all");
  const [barangayFilter, setBarangayFilter] = useState("all");
  const { data: entries = [], isFetching: isLoading, isError: error, refetch: loadEntries } =
    useAdminQuery("tracking", ["missed", 30], () => fetchMissedCollections({ days: 30 }), { refetchInterval: 30_000 });

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
        <SearchableSelect value={truckFilter} onValueChange={setTruckFilter}
          options={[{ value: "all", label: "All Trucks" }, ...trucks.map((truck) => ({ value: truck.name, label: truck.name }))]}
          placeholder="All trucks" aria-label="Truck" searchPlaceholder="Search trucks..." fieldSize="compact"
          className="h-8.5 min-w-0 text-xs flex-1 rounded-xl" />

        <SearchableSelect value={barangayFilter} onValueChange={setBarangayFilter}
          options={[{ value: "all", label: "All Barangays" }, ...barangays.map((barangay) => ({ value: barangay, label: barangay }))]}
          placeholder="All barangays" aria-label="Barangay" searchPlaceholder="Search barangays..." fieldSize="compact"
          className="h-8.5 min-w-0 text-xs flex-1 rounded-xl" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8.5 px-2.5 rounded-xl text-xs shrink-0 cursor-pointer"
          onClick={() => void loadEntries()}
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
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            Could not refresh missed collection records. Showing the last loaded results.
          </div>
        )}
        {isLoading && filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
            Loading missed collection logs...
          </div>
        ) : filtered.length === 0 && !error ? (
          <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-1">
            <AlertTriangle className="w-6 h-6 text-muted-foreground/40 mx-auto" />
            <p className="text-xs font-semibold text-foreground">
              No missed collections recorded
            </p>
            <p className="text-[11px] text-muted-foreground">
              No missed stops were found in the last 30 days.
            </p>
          </div>
        ) : filtered.length > 0 ? (
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
                    {entry.event_at ? formatEntryDate(entry.event_at) : entry.run_date.slice(0, 10)}
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
              </div>
            </div>
          ))
        ) : null}
      </div>
    </div>
  );
};

export default MissedCollectionLogDynamic;
