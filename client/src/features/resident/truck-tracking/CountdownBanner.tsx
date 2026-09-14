import { CalendarDays, Clock, Info } from "lucide-react";
import type { CollectionSchedule } from "./types";
import { cn } from "@/lib/utils";

interface CountdownBannerProps {
  schedule: CollectionSchedule;
  residentArea?: string;
}

const CountdownBanner = ({
  schedule,
  residentArea,
}: CountdownBannerProps) => {
  const hasSchedule =
    schedule.nextCollectionDay !== "soon" &&
    schedule.nextCollectionTime !== "TBD" &&
    Boolean(schedule.nextCollectionTime);

  if (!hasSchedule) {
    return (
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs sm:flex-row sm:items-center sm:p-4">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-xs sm:text-sm font-display font-bold text-foreground tracking-tight">
            No Scheduled Collection • {residentArea || "Your Barangay"}
          </h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground">
            There is currently no upcoming collection schedule set for your location.
          </p>
        </div>
        <div className="flex max-w-full items-center gap-1.5 self-start rounded-xl border border-border/60 bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground dark:bg-muted/20 sm:self-auto sm:text-xs">
          <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">Check announcements for schedule updates</span>
        </div>
      </div>
    );
  }

  const lowerWaste = schedule.wasteType?.toLowerCase() || "";
  const isNonBio = lowerWaste.includes("non-bio") || lowerWaste.includes("recycl");
  const isBio = !isNonBio && lowerWaste.includes("bio");

  const rawDay = schedule.nextCollectionDay?.trim() || "Upcoming";
  const dayLabel = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);

  const isRelative =
    rawDay.toLowerCase() === "today" || rawDay.toLowerCase() === "tomorrow";
  const formattedDate = schedule.nextCollectionDate
    ? isRelative
      ? `${dayLabel} (${schedule.nextCollectionDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })})`
      : `${dayLabel}, ${schedule.nextCollectionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : dayLabel;

  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs lg:flex-row lg:items-center sm:p-4">
      {/* Schedule & Location Details */}
      <div className="min-w-0 space-y-1">
        {/* Header Line: Location Collection Schedule + System Waste Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-xs sm:text-sm font-display font-bold text-foreground tracking-tight">
            Collection for {residentArea || "Your Location"}
          </h3>

          {schedule.wasteType && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0",
                isBio &&
                  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
                isNonBio &&
                  "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
                !isBio &&
                  !isNonBio &&
                  "bg-muted/80 text-muted-foreground border-border/80"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  isBio && "bg-emerald-500",
                  isNonBio && "bg-amber-500",
                  !isBio && !isNonBio && "bg-muted-foreground"
                )}
              />
              {schedule.wasteType}
            </span>
          )}
        </div>

        {/* Sub-line: Date and Time of Start with neutral monochrome icons */}
        <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>
              Date: <strong className="font-semibold text-foreground">{formattedDate}</strong>
            </span>
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>
              Start Time: <strong className="font-semibold text-foreground">{schedule.nextCollectionTime}</strong>
            </span>
          </span>
        </div>
      </div>

      {/* Right: Reminder Pill with neutral monochrome icon */}
       <div className="flex max-w-full items-center gap-1.5 self-start rounded-xl border border-border/60 bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground dark:bg-muted/20 lg:self-auto sm:text-xs">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
         <span className="truncate">Please have segregated bins ready</span>
      </div>
    </div>
  );
};

export default CountdownBanner;
