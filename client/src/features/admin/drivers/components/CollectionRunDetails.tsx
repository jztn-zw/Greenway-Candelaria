import { ClipboardList } from "lucide-react";
import ActionButtonLoader from "@/components/common/ActionButtonLoader";
import { AdminModal } from "@/components/admin/AdminModal";
import { Badge } from "@/components/ui/badge";
import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import { Button } from "@/components/ui/button";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { useAdminQuery } from "@/lib/adminQuery";
import { fetchDriverActivityDetail } from "@/services/driverManagerService";
import { formatManilaDateTime } from "@/utils/date";

const time = (value: string | null) => formatManilaDateTime(value, {
  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
}, "Time not recorded");

const duration = (seconds: number | null) => seconds === null ? "Not recorded"
  : `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;

const CollectionRunDetails = ({ driverId, driverName, runId, onClose }: {
  driverId: string; driverName: string; runId: string; onClose: () => void;
}) => {
  const query = useAdminQuery("drivers", ["activity-detail", driverId, runId], () => fetchDriverActivityDetail(driverId, runId), { staleTime: 0 });
  const data = query.data;
  const completed = data?.stops.filter(stop => stop.status === "DONE").length ?? 0;
  const skipped = data?.stops.filter(stop => stop.status === "MISSED").length ?? 0;

  return <AdminModal open onOpenChange={open => { if (!open) onClose(); }}
    title="Collection Run Details" description={`${driverName} · Historical collection record`}
    icon={<ClipboardList className="size-5" />} className="sm:max-w-3xl"
    footer={<Button variant="outline" onClick={onClose}>Close</Button>}>
    {query.isLoading ? <div role="status" className="flex items-center justify-center py-8 text-primary">
      <ActionButtonLoader variant="display" />
      <span className="sr-only">Loading collection details…</span>
    </div>
      : !data ? <DataRefreshNotice primary role="alert" message="Couldn't load this collection run. Please try again."
        onRetry={() => void query.refetch()} retrying={query.isFetching} />
      : <div className="space-y-5">
        {query.isError && <DataRefreshNotice primary role="alert" onRetry={() => void query.refetch()} retrying={query.isFetching} />}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="gw-heading text-base text-foreground">{data.run.route}</h3>
            <Badge variant="outline" className={getStatusBadgeStyle(data.run.status === "COMPLETED" ? "Completed" : "Partial").className}>
              {data.run.status === "COMPLETED" ? "Completed" : "Partial"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{data.run.date} · {data.run.waste_type || "Waste type not recorded"}</p>
          <p className="text-sm text-foreground">{data.run.truck_name || "Historical truck not recorded"} · {data.run.truck_plate || "Plate not recorded"}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Total Stops", data.stops.length], ["Completed", completed], ["Skipped / Missed", skipped], ["Not Completed", data.stops.length - completed - skipped]].map(([label, value]) =>
            <div key={label} className="rounded-xl border border-border/80 bg-muted/20 p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</dd>
            </div>)}
        </dl>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-xs text-muted-foreground">Started · Philippine Time</dt><dd className="mt-1 tabular-nums">{time(data.run.started_at)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Ended · Philippine Time</dt><dd className="mt-1 tabular-nums">{time(data.run.ended_at)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Active Collection Time</dt><dd className="mt-1 tabular-nums">{duration(data.run.active_seconds)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Paused Time</dt><dd className="mt-1 tabular-nums">{duration(data.run.paused_seconds)}</dd></div>
        </dl>
        <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1">
          <h4 className="text-xs font-medium text-muted-foreground">Distance Traveled This Run</h4>
          <p className="text-lg font-semibold tabular-nums text-foreground">{data.distance.distance_km === null ? "Unavailable" : `${data.distance.distance_km.toFixed(2)} km`}</p>
          <p className="text-xs text-muted-foreground">{data.distance.distance_km === null
            ? "Not enough usable GPS history was recorded to calculate distance."
            : "GPS estimate from recorded travel for this run, not a vehicle odometer."}</p>
          {(data.distance.gap_count > 0 || data.distance.rejected_points > 0) && <p className="text-xs text-muted-foreground">GPS gaps or unreliable fixes were excluded. Unrecorded travel is not included.</p>}
        </div>
        <section className="space-y-3">
          <h4 className="gw-heading text-sm text-foreground">Collection Stops</h4>
          <p className="text-xs text-muted-foreground">Saved stop order and outcomes. All times use Philippine time (AM/PM).</p>
          {data.stops.length ? <ol aria-label="Collection stops" className="space-y-2">
            {data.stops.map(stop => {
              const label = stop.status === "DONE" ? "Completed" : stop.status === "MISSED" ? "Skipped / Missed" : "Not Completed";
              return <li key={stop.id} className="rounded-xl border border-border/80 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-medium text-foreground">{stop.stop_order}. {stop.stop_name}</p>
                  <Badge variant="outline" className={getStatusBadgeStyle(stop.status === "MISSED" ? "Skipped" : label).className}>{label}</Badge>
                </div>
                {stop.barangay_name && stop.barangay_name !== stop.stop_name && <p className="text-xs text-muted-foreground">{stop.barangay_name}</p>}
                <p className="text-xs tabular-nums text-muted-foreground">{stop.status === "DONE" ? "Completed" : stop.status === "MISSED" ? "Skipped / missed" : "Outcome"}: {time(stop.completed_at)}</p>
                {stop.status === "MISSED" && <p className="break-words text-xs text-foreground">Reason: {stop.skipped_reason || "Reason not recorded"}</p>}
              </li>;
            })}
          </ol> : <p className="text-sm text-muted-foreground">No stop details were recorded for this run.</p>}
        </section>
      </div>}
  </AdminModal>;
};

export default CollectionRunDetails;
