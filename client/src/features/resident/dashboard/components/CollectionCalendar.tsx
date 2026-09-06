import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, X, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Candelaria MENRO schedule: Bio = Mon,Wed,Fri,Sun | Non-Bio = Tue,Thu,Sat
const getWasteType = (dayOfWeek: number): "bio" | "non-bio" => {
  return [0, 1, 3, 5].includes(dayOfWeek) ? "bio" : "non-bio";
};

const wasteInfo = {
  bio: { label: "Biodegradable", color: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30", dot: "bg-primary", time: "6:00 AM - 10:00 AM" },
  "non-bio": { label: "Non-Biodegradable", color: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30", dot: "bg-amber-500", time: "6:00 AM - 10:00 AM" },
};

const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
const dayLabelsFull = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CollectionCalendar = () => {
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

  const numRows = Math.ceil(cells.length / 7);

  const selectedDayInfo = selectedDay
    ? (() => {
        const dow = new Date(year, month, selectedDay).getDay();
        const type = getWasteType(dow);
        return { ...wasteInfo[type], dayName: dayLabelsFull[dow], date: selectedDay };
      })()
    : null;

  return (
    <Card className="border border-border/80 bg-card/80 backdrop-blur-sm overflow-hidden h-full flex flex-col">
      <CardHeader className="pb-2 px-4 sm:px-6 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2 font-display">
            <CalendarDays className="w-4 h-4 text-primary" />
            Collection Calendar
          </CardTitle>
          <span className="text-xs text-muted-foreground font-semibold bg-muted/60 px-2.5 py-0.5 rounded-lg">
            {monthName} {year}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-3 flex-1 flex flex-col justify-between">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1 shrink-0">
          {dayLabels.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-bold text-muted-foreground py-0.5">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid — fills all remaining height with even row heights */}
        <div
          className="grid grid-cols-7 gap-1.5 sm:gap-2 flex-1 mt-1 mb-3.5 sm:mb-4"
          style={{ gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` }}
        >
          {cells.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />;
            const dow = new Date(year, month, day).getDay();
            const type = getWasteType(dow);
            const info = wasteInfo[type];
            const isToday = day === today;
            const isSelected = day === selectedDay;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`relative flex flex-col items-center justify-center rounded-xl w-full h-full p-1 sm:p-1.5 text-xs sm:text-sm transition-all active:scale-95
                  ${isToday
                    ? "bg-primary text-primary-foreground font-bold shadow-md ring-2 ring-primary/40"
                    : isSelected
                      ? "bg-primary/20 text-foreground font-bold ring-2 ring-primary/50"
                      : `${info.color} border text-foreground/90 hover:border-primary/40`
                  }`}
              >
                <span>{day}</span>
                {!isToday && (
                  <span className={`w-1.5 h-1.5 rounded-full ${info.dot} mt-0.5`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Day detail tooltip */}
        {selectedDayInfo && (
          <div className="mb-2 p-2.5 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-between animate-fade-in shrink-0">
            <div>
              <p className="text-xs font-bold text-foreground">
                {selectedDayInfo.dayName}, {monthName} {selectedDayInfo.date}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {selectedDayInfo.label} · Pickup: {selectedDayInfo.time}
              </p>
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Legend + View Calendar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-border/50 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              Biodegradable
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Non-Biodegradable
            </div>
          </div>
          <button
            onClick={() => navigate("/resident/schedule")}
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto"
          >
            View Full Schedule <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionCalendar;

