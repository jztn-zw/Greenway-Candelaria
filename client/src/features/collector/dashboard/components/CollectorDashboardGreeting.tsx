import { collectorBadgeClassName } from "@/features/collector/components/collectorBadgeStyles";
import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import { formatManilaDateTime, getManilaNow } from "@/utils/date";

const getGreeting = () => {
  const hour = getManilaNow().hour;
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

interface Props {
  driverName: string;
  truckPlate?: string | null;
  statusLabel: string;
  active: boolean;
}

const CollectorDashboardGreeting = ({
  driverName,
  truckPlate,
  statusLabel,
  active,
}: Props) => {
  const today = new Date();
  const text = getGreeting();
  const firstName = driverName ? driverName.split(" ")[0] : "Collector";

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 md:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Driver and Command Context */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="gw-heading text-xl sm:text-2xl md:text-3xl text-foreground tracking-tight">
              {text}, <span className="text-primary">{firstName}</span>
            </h1>
            {truckPlate && (
              <span className="tabular-nums text-ui-caption sm:text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg border border-border/60">
                {truckPlate}
              </span>
            )}
          </div>
          <p className="text-ui-caption sm:text-xs text-muted-foreground mt-0.5 font-medium truncate">
            Candelaria municipal collection operations
          </p>
        </div>

        {/* Right: Date and Shift Status Indicator */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60 shrink-0">
          <span className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-ui-caption sm:text-xs font-semibold text-muted-foreground bg-muted/40 border border-border/70 flex items-center tabular-nums">
            {formatManilaDateTime(today, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </span>

          <span
            className={collectorBadgeClassName + " " + getStatusBadgeStyle(statusLabel).className}
          >
            <span
              className={"w-1.5 h-1.5 rounded-full shrink-0 " + getStatusBadgeStyle(statusLabel).dot + (active ? " animate-pulse" : "")}
            />
            <span>
              {statusLabel}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CollectorDashboardGreeting;
