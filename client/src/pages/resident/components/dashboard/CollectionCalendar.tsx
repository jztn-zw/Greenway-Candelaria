import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, X } from "lucide-react";

// Candelaria MENRO schedule: Bio = Mon,Wed,Fri,Sun | Non-Bio = Tue,Thu,Sat
const getWasteType = (dayOfWeek: number): "bio" | "non-bio" => {
  return [0, 1, 3, 5].includes(dayOfWeek) ? "bio" : "non-bio";
};

const wasteInfo = {
  bio: { label: "Biodegradable", color: "bg-primary/15 border-primary/30", dot: "bg-primary", time: "6:00 AM" },
  "non-bio": { label: "Non-Biodegradable", color: "bg-accent/10 border-accent/30", dot: "bg-accent", time: "6:00 AM" },
};

const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
const dayLabelsFull = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CollectionCalendar = () => {
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

  const selectedDayInfo = selectedDay
    ? (() => {
        const dow = new Date(year, month, selectedDay).getDay();
        const type = getWasteType(dow);
        return { ...wasteInfo[type], dayName: dayLabelsFull[dow], date: selectedDay };
      })()
    : null;

  return (
    <Card className="border border-border overflow-hidden">
      <CardHeader className="pb-2 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Collection Calendar
          </CardTitle>
          <span className="text-xs text-muted-foreground font-medium">
            {monthName} {year}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayLabels.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
              {d}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
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
                className={`relative flex flex-col items-center justify-center rounded-lg p-1.5 sm:p-2 text-xs sm:text-sm transition-all
                  ${isToday
                    ? "bg-primary text-primary-foreground font-bold shadow-md ring-2 ring-primary/30"
                    : isSelected
                      ? "bg-primary/20 text-foreground font-semibold ring-1 ring-primary/40"
                      : `${info.color} border hover:bg-primary/10`
                  }`}
              >
                <span>{day}</span>
                {!isToday && (
                  <span className={`w-1 h-1 rounded-full ${info.dot} mt-0.5`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Day detail tooltip */}
        {selectedDayInfo && (
          <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border flex items-center justify-between animate-fade-in">
            <div>
              <p className="text-xs font-semibold text-foreground">
                {selectedDayInfo.dayName}, {monthName} {selectedDayInfo.date}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {selectedDayInfo.label} · Scheduled at {selectedDayInfo.time}
              </p>
            </div>
            <button onClick={() => setSelectedDay(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Legend + View Calendar */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-4 text-[10px] sm:text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary/20 border border-primary/30" />
              Biodegradable
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-accent/10 border border-accent/30" />
              Non-Biodegradable
            </div>
          </div>
          <a href="/resident/schedule" className="text-xs text-primary hover:underline font-medium">
            View Calendar →
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionCalendar;
