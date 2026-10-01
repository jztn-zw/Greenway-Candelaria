import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, Truck, CheckCircle2, ArrowRight, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardAttention } from "./useAdminDashboard";
import { formatRelativeTime } from "@/utils/date";

interface NeedsAttentionProps {
  attention?: DashboardAttention | null;
}

const NeedsAttention = ({ attention }: NeedsAttentionProps) => {
  const navigate = useNavigate();
  const items = attention?.items ?? [];
  const attentionCount = (attention?.awaiting_triage ?? 0)
    + (attention?.maintenance_trucks ?? 0) + (attention?.missed_stops ?? 0);
  const remainingReports = Math.max(0, (attention?.awaiting_triage ?? 0)
    - items.filter((item) => item.kind === "report").length);

  return (
    <section aria-labelledby="needs-attention-heading" className="relative min-h-[380px] min-w-0 rounded-2xl border border-border/80 bg-card shadow-2xs">
      {/* Keep list contents from expanding the dashboard grid row. */}
      <div className="absolute inset-4 sm:inset-6 flex min-h-0 flex-col">
        <div className="mb-3 flex min-h-8 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 sm:mb-4 sm:pb-4">
          <h3 id="needs-attention-heading" className="gw-heading flex min-h-8 items-center text-base sm:text-lg text-foreground tracking-tight">Needs Attention</h3>
          <Badge variant="outline" className={attentionCount > 0
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-ui-caption font-semibold px-2.5 py-0.5 rounded-md tabular-nums"
            : "bg-muted/40 text-muted-foreground border-border/60 text-ui-caption font-semibold px-2.5 py-0.5 rounded-md tabular-nums"}>
            {attentionCount} {attentionCount === 1 ? "item" : "items"}
          </Badge>
        </div>
        <div role="region" aria-label="Items needing attention" tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-3 space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 sm:p-5 text-center">
              <CheckCircle2 className="w-9 h-9 text-success-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">No items in these queues</p>
              <p className="text-xs text-muted-foreground mt-1">No submitted reports, missed stops today, or trucks under maintenance.</p>
            </div>
          ) : items.map((item) => {
            const Icon = item.kind === "report" ? FileText : item.kind === "maintenance" ? Wrench : Truck;
            const action = item.kind === "report" ? "Review" : "View truck";
            const destination = item.kind === "report"
              ? `/admin/reports?report=${encodeURIComponent(item.target_id)}`
              : `/admin/drivers?truckId=${encodeURIComponent(item.target_id)}`;
            return (
              <div key={item.id} className="flex flex-col items-stretch gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between transition-colors hover:border-border hover:bg-muted/40">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground break-words">{item.title}</p>
                    <p className="mt-1 text-ui-caption text-muted-foreground break-words first-letter:uppercase">{item.description}</p>
                    {item.occurred_at && <p className="mt-1 flex items-center gap-1 text-ui-caption text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      {formatRelativeTime(item.occurred_at, { emptyLabel: "Time unavailable" })}
                    </p>}
                  </div>
                </div>
                <Button size="sm" variant="outline" aria-label={`${action}: ${item.title}`}
                  className="h-8 shrink-0 self-end sm:self-auto rounded-xl px-3 text-xs font-semibold shadow-none"
                  onClick={() => navigate(destination)}>
                  {action}<ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            );
          })}
          {remainingReports > 0 && <Button variant="primary-ghost" className="h-8 w-full rounded-xl text-xs font-semibold" onClick={() => navigate("/admin/reports")}>
            View {remainingReports} more reports<ArrowRight className="ml-1 h-3 w-3" />
          </Button>}
        </div>
        <p className="mt-4 shrink-0 border-t border-border/60 pt-3 text-ui-caption leading-relaxed text-muted-foreground">
          Missed stops first, then oldest reports and fleet maintenance.
        </p>
      </div>
    </section>
  );
};

export default NeedsAttention;
