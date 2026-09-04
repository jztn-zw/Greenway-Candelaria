import { useState } from "react";
import { CalendarDays, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DashboardRoute } from "./useAdminDashboard";

const getWasteType = (wasteType?: string | null): "bio" | "non-bio" =>
  wasteType?.toLowerCase().includes("non") ? "non-bio" : "bio";

const wasteInfo = {
  bio: {
    label: "Biodegradable",
    color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
    dot: "bg-emerald-500",
    time: "6:00 AM",
  },
  "non-bio": {
    label: "Non-Biodegradable",
    color: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25",
    dot: "bg-sky-500",
    time: "6:00 AM",
  },
};

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fullDayLabels = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

interface AdminCollectionCalendarProps {
  routes?: DashboardRoute[];
}

const AdminCollectionCalendar = ({ routes = [] }: AdminCollectionCalendarProps) => {
  const navigate = useNavigate();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleString("default", { month: "long" });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const activeRoutes = routes.filter((route) => route.status === "ACTIVE");
  const selectedDayInfo = selectedDay
    ? (() => {
        const dow = new Date(year, month, selectedDay).getDay();
        const dayRoutes = activeRoutes.filter((route) => route.day_of_week.toUpperCase() === fullDayLabels[dow]);
        const firstRoute = dayRoutes[0];
        const type = getWasteType(firstRoute?.waste_type);
        return {
          ...wasteInfo[type],
          label: firstRoute?.waste_type || "No collection scheduled",
          time: firstRoute?.start_time?.slice(0, 5) || "—",
          routeCount: dayRoutes.length,
          dayName: dayLabels[dow],
          date: selectedDay,
        };
      })()
    : null;

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground font-display">
              Municipal Collection Schedule
            </h3>
            <p className="text-xs text-muted-foreground">
              {monthName} {year} · Daily classification calendar
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-primary font-semibold h-8 px-3 gap-1.5 hover:bg-primary/10 hover:text-primary rounded-xl cursor-pointer group active:scale-95 transition-all"
          onClick={() => navigate("/admin/schedule")}
        >
          <span>Schedule Manager</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="border border-border/80 rounded-xl p-3 sm:p-4 bg-background">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {dayLabels.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dow = new Date(year, month, day).getDay();
            const dayRoutes = activeRoutes.filter((route) => route.day_of_week.toUpperCase() === fullDayLabels[dow]);
            const hasSchedule = dayRoutes.length > 0;
            const type = getWasteType(dayRoutes[0]?.waste_type);
            const info = wasteInfo[type];
            const isToday = day === today;
            const isSelected = day === selectedDay;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`relative flex flex-col items-center justify-center rounded-xl p-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isToday
                    ? "bg-primary text-primary-foreground font-bold shadow-xs ring-2 ring-primary/30"
                    : isSelected
                      ? "bg-primary/20 text-foreground ring-2 ring-primary/40"
                      : hasSchedule
                        ? `${info.color} border hover:bg-primary/15`
                        : "bg-muted/25 text-muted-foreground border border-border/50 hover:bg-muted/45"
                }`}
              >
                <span>{day}</span>
                {!isToday && hasSchedule && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${info.dot} mt-1`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Popover */}
        {selectedDayInfo && (
          <div className="mt-3.5 p-3.5 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between animate-fade-in">
            <div>
              <p className="text-xs font-bold text-foreground">
                {selectedDayInfo.dayName}, {monthName} {selectedDayInfo.date}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {selectedDayInfo.routeCount > 0
                  ? `${selectedDayInfo.label} · ${selectedDayInfo.routeCount} ${selectedDayInfo.routeCount === 1 ? "route" : "routes"} · Starts at ${selectedDayInfo.time}`
                  : "No active collection route is configured for this day."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 mt-3 border-t border-border/60 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Biodegradable route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span>Non-Biodegradable route</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCollectionCalendar;
