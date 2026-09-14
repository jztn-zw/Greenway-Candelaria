import { format } from "date-fns";
import { Sun, Moon, CloudSun } from "lucide-react";
import type { ShiftStatus } from "./types";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: Sun };
  if (hour < 18) return { text: "Good afternoon", icon: CloudSun };
  return { text: "Good evening", icon: Moon };
};

interface Props {
  driverName: string;
  truckName?: string | null;
  truckPlate?: string | null;
  routeName?: string | null;
  wasteType?: string | null;
  shiftStatus?: ShiftStatus;
}

const CollectorDashboardGreeting = ({
  driverName,
  truckName,
  truckPlate,
  routeName,
  wasteType,
  shiftStatus = "off-duty",
}: Props) => {
  const today = new Date();
  const { text, icon: Icon } = getGreeting();

  const firstName = driverName ? driverName.split(" ")[0] : "Collector";

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Driver Greeting & Details */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs text-primary">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground font-display tracking-tight">
                {text}, {firstName}!
              </h1>

              {/* Live Shift Status Pill */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  shiftStatus === "on-route"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : shiftStatus === "completed"
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    shiftStatus === "on-route"
                      ? "bg-emerald-500 animate-pulse"
                      : shiftStatus === "completed"
                      ? "bg-primary"
                      : "bg-muted-foreground"
                  }`}
                />
                <span>
                  {shiftStatus === "on-route"
                    ? "On Active Route"
                    : shiftStatus === "completed"
                    ? "Shift Finished"
                    : "Standby / Off-Duty"}
                </span>
              </span>

            </div>

            {/* Subtitle / Shift Context */}
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              {shiftStatus === "completed"
                ? "All collection stops for today have been completed."
                : routeName
                ? `Today's Run: ${routeName}${wasteType ? ` · ${wasteType}` : ""}`
                : "No collection schedule assigned for this shift window."}
            </p>
          </div>
        </div>

        {/* Right: Date Badge */}
        <div className="flex items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-border/60 shrink-0">
          <span className="h-9 px-3.5 rounded-xl text-xs font-semibold text-muted-foreground bg-muted/40 border border-border/70 flex items-center shadow-2xs">
            {format(today, "EEE, MMM d, yyyy")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CollectorDashboardGreeting;

