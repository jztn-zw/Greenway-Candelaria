import { CalendarDays, Clock, Sparkles } from "lucide-react";
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

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-card border border-border/80 shadow-2xs">
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
          <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <p className="text-xs sm:text-sm font-display font-bold text-foreground">
              Scheduled Collection: {schedule.nextCollectionDay}
            </p>
            {schedule.wasteType && (
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
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

          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
            <span>Expected: <strong className="text-foreground">{schedule.nextCollectionTime}</strong></span>
          </div>
        </div>
      </div>

      <div className="self-stretch sm:self-auto flex items-center justify-between sm:justify-end gap-1.5 text-[11px] sm:text-xs text-muted-foreground bg-muted/40 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-border/60 shrink-0">
        <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
        <span>Please have segregated bins ready</span>
      </div>
    </div>
  );
};

export default CountdownBanner;
