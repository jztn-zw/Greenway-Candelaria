import { CalendarDays, Clock } from "lucide-react";
import type { CollectionSchedule } from "./types";

interface CountdownBannerProps {
  schedule: CollectionSchedule;
  hasActiveTrucks: boolean;
}

const CountdownBanner = ({ schedule, hasActiveTrucks }: CountdownBannerProps) => {
  if (hasActiveTrucks) return null;

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-sand border border-border shadow-sm">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <CalendarDays className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-display font-semibold text-foreground">
          Your collection day is {schedule.nextCollectionDay}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <Clock className="w-3 h-3" />
          <span>at {schedule.nextCollectionTime}</span>
          {schedule.wasteType && (
            <>
              <span className="text-border">·</span>
              <span className="font-medium text-primary">{schedule.wasteType}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CountdownBanner;
