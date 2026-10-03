import { getCategoryBadgeColors } from "@/components/ui/badgeStyles";
import { CalendarDays, Clock, Info } from "lucide-react";
import type { CollectionSchedule } from "./types";
import { formatManilaDateTime } from "@/utils/date";
import { trackingStyles } from "./trackingStyles";

interface CountdownBannerProps {
  schedule: CollectionSchedule;
  residentArea?: string;
  collectionFinishedToday?: boolean;
}

const CountdownBanner = ({
  schedule,
  residentArea,
  collectionFinishedToday = false,
}: CountdownBannerProps) => {
  const hasSchedule =
    schedule.nextCollectionDay !== "soon" &&
    schedule.nextCollectionTime !== "TBD" &&
    Boolean(schedule.nextCollectionTime);

  if (!hasSchedule) {
    return (
      <div className={trackingStyles.schedule}>
        <div className="min-w-0 space-y-0.5">
          <h3 className={trackingStyles.scheduleTitle}>
            {collectionFinishedToday ? "No Collection Scheduled Tomorrow" : "No Scheduled Collection"} • {residentArea || "Your Barangay"}
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {collectionFinishedToday
              ? "Today's street collection has ended, and this street has no collection scheduled tomorrow."
              : "There is currently no upcoming collection schedule set for your location."}
          </p>
        </div>
        <div className={trackingStyles.reminder}>
          <Info className="mt-0.5 w-3.5 h-3.5 shrink-0" />
          <span>Check announcements for schedule updates</span>
        </div>
      </div>
    );
  }

  const rawDay = schedule.nextCollectionDay?.trim() || "Upcoming";
  const dayLabel = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);

  const isRelative =
    rawDay.toLowerCase() === "today" || rawDay.toLowerCase() === "tomorrow";
  const formattedDate = schedule.nextCollectionDate
    ? isRelative
      ? `${dayLabel} (${formatManilaDateTime(schedule.nextCollectionDate, { weekday: "short", month: "short", day: "numeric" })})`
      : `${dayLabel}, ${formatManilaDateTime(schedule.nextCollectionDate, { month: "short", day: "numeric" })}`
    : dayLabel;

  return (
    <div className={trackingStyles.schedule}>
      {/* Schedule & Location Details */}
      <div className={trackingStyles.scheduleDetails}>
        {/* Header Line: Location Collection Schedule + System Waste Badge */}
        <div className={trackingStyles.scheduleHeading}>
          <h3 className={trackingStyles.scheduleTitle}>
            {collectionFinishedToday ? "Tomorrow's collection for" : "Collection for"} {residentArea || "Your Location"}
          </h3>

          {schedule.wasteType && (
            <span
              className={trackingStyles.scheduleBadge + " " + getCategoryBadgeColors(schedule.wasteType).className}
            >
              {schedule.wasteType}
            </span>
          )}
        </div>

        {/* Sub-line: Date and Time of Start with neutral monochrome icons */}
        <div className={trackingStyles.scheduleMeta}>
          <span className="flex min-w-0 items-start gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>
              Date: <strong className="font-semibold text-foreground">{formattedDate}</strong>
            </span>
          </span>
          <span className="flex min-w-0 items-start gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span>
              Start Time: <strong className="font-semibold text-foreground">{schedule.nextCollectionTime}</strong>
            </span>
          </span>
        </div>
      </div>

      {/* Right: Reminder note with neutral monochrome icon */}
      <div className={trackingStyles.reminder}>
        <Info className="mt-0.5 w-3.5 h-3.5 shrink-0" />
        <span>
          {collectionFinishedToday
            ? "Today's street collection has ended"
            : "Please have segregated bins ready"}
        </span>
      </div>
    </div>
  );
};

export default CountdownBanner;

