import { CalendarDays, Clock, Info } from "lucide-react";
import type { CollectionSchedule } from "./types";
import { cn } from "@/lib/utils";

interface CountdownBannerProps {
  schedule: CollectionSchedule;
  hasActiveTrucks: boolean;
}

const CountdownBanner = ({ schedule, hasActiveTrucks }: CountdownBannerProps) => {
  if (hasActiveTrucks) return null;

  const isBio = schedule.wasteType?.toLowerCase().includes("bio");
  const isNonBio =
    schedule.wasteType?.toLowerCase().includes("non-bio") ||
    schedule.wasteType?.toLowerCase().includes("recycl");

  const rawDay = schedule.nextCollectionDay?.trim() || "Upcoming";
  const dayLabel = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-2xs">
      {/* Left: Schedule Details */}
      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
          <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>

        <div className="min-w-0 space-y-1">
          {/* Header Line: Title + Consistent System Waste Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs sm:text-sm font-display font-bold text-foreground tracking-tight">
              Scheduled Collection: {dayLabel}
            </h3>

            {schedule.wasteType && (
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0",
                  isBio &&
                    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
                  isNonBio &&
                    "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
                  !isBio &&
                    !isNonBio &&
                    "bg-primary/10 text-primary border-primary/20"
                )}
              >
                {schedule.wasteType}
              </span>
            )}
          </div>

          {/* Sub-line: Expected Time */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              Expected: <strong className="font-semibold text-foreground">{schedule.nextCollectionTime}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Right: Reminder Pill */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 dark:bg-muted/20 px-3 py-1.5 rounded-xl border border-border/60 shrink-0 self-start sm:self-auto">
        <Info className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>Please have segregated bins ready</span>
      </div>
    </div>
  );
};

export default CountdownBanner;
