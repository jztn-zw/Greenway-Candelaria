import { CalendarDays, ArrowRight } from "lucide-react";

const dayKeys = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const wasteByDay: Record<string, string> = {
  Sun: "Biodegradable", Mon: "Biodegradable", Tue: "Non-Biodegradable",
  Wed: "Biodegradable", Thu: "Non-Biodegradable", Fri: "Biodegradable",
  Sat: "Non-Biodegradable",
};

const getNextCollectionInfo = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayName = dayKeys[tomorrow.getDay()];
  return {
    dayLabel: "tomorrow",
    wasteType: wasteByDay[dayName],
  };
};

interface NextCollectionBannerProps {
  hasActiveTrucks: boolean;
}

const NextCollectionBanner = ({ hasActiveTrucks }: NextCollectionBannerProps) => {
  if (hasActiveTrucks) return null;
  const { dayLabel, wasteType } = getNextCollectionInfo();

  return (
    <div className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/15 animate-fade-in">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <CalendarDays className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Next collection is {dayLabel} — <span className="text-primary">{wasteType}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">Prepare your bins tonight.</p>
      </div>
      <ArrowRight className="w-4 h-4 text-primary shrink-0 hidden sm:block" />
    </div>
  );
};

export default NextCollectionBanner;
