import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Sparkles,
  Printer,
  CheckCircle2,
  Trash2,
  Recycle,
  AlertCircle,
  HelpCircle,
  Package,
  Users,
} from "lucide-react";
import { ResidentScheduleSkeleton } from "@/components/PageLoadingSkeletons";
import useAuthStore from "@/store/authStore";
import { fetchCalendarEvents, CalendarEvent } from "@/services/scheduleService";

// --- Candelaria Waste Schedule Configuration ---
const WEEKLY_SCHEDULE: {
  day: string;
  dayShort: string;
  wasteType: "bio" | "non-bio";
  title: "Biodegradable" | "Non-Biodegradable";
  timeWindow: string;
  items: string[];
}[] = [
  {
    day: "Sunday",
    dayShort: "Sun",
    wasteType: "bio",
    title: "Biodegradable",
    timeWindow: "6:00 AM – 10:00 AM",
    items: ["Food scraps", "Vegetable waste", "Compostable garden waste"],
  },
  {
    day: "Monday",
    dayShort: "Mon",
    wasteType: "bio",
    title: "Biodegradable",
    timeWindow: "6:00 AM – 10:00 AM",
    items: ["Leftover food", "Fruit peels", "Fallen leaves & twigs"],
  },
  {
    day: "Tuesday",
    dayShort: "Tue",
    wasteType: "non-bio",
    title: "Non-Biodegradable",
    timeWindow: "6:00 AM – 10:00 AM",
    items: ["Plastic bottles & packaging", "Paper & cardboard", "Metal cans & tins"],
  },
  {
    day: "Wednesday",
    dayShort: "Wed",
    wasteType: "bio",
    title: "Biodegradable",
    timeWindow: "6:00 AM – 10:00 AM",
    items: ["Food waste", "Garden clippings", "Coffee grounds"],
  },
  {
    day: "Thursday",
    dayShort: "Thu",
    wasteType: "non-bio",
    title: "Non-Biodegradable",
    timeWindow: "6:00 AM – 10:00 AM",
    items: ["Clean plastics", "Newspapers & boxes", "Glass bottles & jars"],
  },
  {
    day: "Friday",
    dayShort: "Fri",
    wasteType: "bio",
    title: "Biodegradable",
    timeWindow: "6:00 AM – 10:00 AM",
    items: ["Kitchen waste", "Food prep scraps", "Biodegradable bags"],
  },
  {
    day: "Saturday",
    dayShort: "Sat",
    wasteType: "non-bio",
    title: "Non-Biodegradable",
    timeWindow: "6:00 AM – 10:00 AM",
    items: ["Dry recyclables", "Clean packaging", "Metals & cans"],
  },
];

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ResidentSchedule: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const user = useAuthStore((s) => s.user);

  // Dynamic Month State for full interactive calendar
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;
  const todayDateNumber = today.getDate();

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells: (number | null)[] = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [firstDayOfWeek, daysInMonth]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const handleJumpToday = () => {
    const n = new Date();
    setCurrentDate(n);
    setSelectedDay(n.getDate());
  };

  const getDayWasteSchedule = (dateNum: number) => {
    const dow = new Date(year, month, dateNum).getDay();
    return WEEKLY_SCHEDULE[dow];
  };

  const selectedDaySchedule = selectedDay ? getDayWasteSchedule(selectedDay) : null;

  const selectedDateStr = selectedDay
    ? `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    : null;

  const dayPublicEvents = useMemo(() => {
    if (!selectedDateStr) return [];
    return events.filter((e) => {
      const eDate = typeof e.event_date === "string" ? e.event_date.split("T")[0] : "";
      return eDate === selectedDateStr;
    });
  }, [events, selectedDateStr]);

  useEffect(() => {
    fetchCalendarEvents()
      .then((data) => setEvents(data))
      .catch((err) => console.error("Failed to load community events", err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <ResidentScheduleSkeleton />;
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 shadow-sm">
            <CalendarIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground font-display">
              Waste Collection Schedule
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>
                Barangay: <strong className="text-foreground">{user?.barangay_name || "Candelaria Proper"}</strong>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="rounded-xl gap-1.5 text-xs font-semibold bg-card border-border/80 hover:bg-muted/60 text-foreground h-9 shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Timetable</span>
          </Button>
        </div>
      </div>

      {/* ── Weekly Day-by-Day Route Overview ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold font-display text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Weekly Routine Breakdown
          </h2>
          <span className="text-[11px] text-muted-foreground">Standard MENRO pickup window: 6:00 AM – 10:00 AM</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {WEEKLY_SCHEDULE.slice(1, 7).map((item) => {
            const isToday =
              isCurrentMonth && today.getDay() === dayLabels.indexOf(item.dayShort);
            const isBio = item.wasteType === "bio";

            return (
              <Card
                key={item.day}
                className={`rounded-2xl border transition-all duration-200 ${
                  isToday
                    ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03] shadow-md"
                    : "border-border bg-card/90 hover:border-primary/30 hover:shadow-sm"
                }`}
              >
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-display text-foreground">
                      {item.day}
                    </span>
                    {isToday && (
                      <Badge className="text-[9px] bg-primary text-primary-foreground font-bold px-1.5 py-0.2">
                        Today
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isBio
                          ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {item.title}
                    </Badge>
                    <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground/70" />
                      {item.timeWindow}
                    </p>
                  </div>

                  <ul className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/50">
                    {item.items.map((it, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-primary/60" />
                        <span className="truncate">{it}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Main Interactive Calendar Grid + Day Details ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Calendar Card */}
        <Card className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-5 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold font-display text-foreground">
                  {monthName} {year}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Tap any day to see the exact collection guidelines
                </CardDescription>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleJumpToday}
                  className="text-xs h-8 px-2.5 rounded-xl mr-1"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 rounded-xl"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-8 w-8 rounded-xl"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* Day Header Row */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
              {dayLabels.map((label) => (
                <span
                  key={label}
                  className="text-[11px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider py-1"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarCells.map((dayNum, i) => {
                if (dayNum === null) {
                  return <div key={`empty-${i}`} className="aspect-square rounded-xl" />;
                }

                const schedule = getDayWasteSchedule(dayNum);
                const isSelected = selectedDay === dayNum;
                const isTodayCell = isCurrentMonth && dayNum === todayDateNumber;
                const isBio = schedule.wasteType === "bio";
                const dayDateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const hasCommunityEvent = events.some((e) => {
                  const eDate = typeof e.event_date === "string" ? e.event_date.split("T")[0] : "";
                  return eDate === dayDateStr;
                });

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => setSelectedDay(dayNum)}
                    className={`aspect-square rounded-xl sm:rounded-2xl p-1 sm:p-1.5 flex flex-col items-center justify-between transition-all duration-200 relative group cursor-pointer border ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 bg-primary/10 shadow-sm"
                        : isTodayCell
                        ? "border-primary/50 bg-primary/[0.04] text-primary font-bold"
                        : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    <span
                      className={`text-xs sm:text-sm font-semibold ${
                        isTodayCell ? "text-primary font-bold" : "text-foreground"
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Dot Indicator */}
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isBio ? "bg-primary" : "bg-amber-500"
                        } shadow-xs`}
                      />
                      {hasCommunityEvent && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-background" title="Community Program" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground flex-wrap gap-2">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  Biodegradable (Sun, Mon, Wed, Fri)
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  Non-Biodegradable (Tue, Thu, Sat)
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Community Drives & Programs
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day Details Card & Guidelines */}
        <div className="space-y-4">
          {selectedDaySchedule ? (
            <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Selected Day
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedDaySchedule.wasteType === "bio"
                        ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30"
                    }`}
                  >
                    {selectedDaySchedule.title}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold font-display text-foreground mt-1">
                  {selectedDaySchedule.day}, {monthName} {selectedDay}, {year}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/60 border border-border text-xs">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Pickup Window: {selectedDaySchedule.timeWindow}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Please bring your bins out before 6:00 AM.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Accepted Items For This Pickup:
                  </p>
                  <div className="space-y-1.5">
                    {selectedDaySchedule.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-foreground/90">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Public Community Programs & Activities */}
                {dayPublicEvents.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-border/60">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Community Programs & Activities ({dayPublicEvents.length}):</span>
                    </p>
                    <div className="space-y-2">
                      {dayPublicEvents.map((evt) => (
                        <div
                          key={evt.id}
                          className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="font-bold text-foreground truncate">
                              {evt.title}
                            </h5>
                            <Badge
                              variant="outline"
                              className="text-[9px] font-semibold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shrink-0"
                            >
                              {evt.event_type === "COMMUNITY_EVENT" ? "Public Drive" : "Collection Route"}
                            </Badge>
                          </div>
                          {evt.description && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              {evt.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 flex-wrap">
                            {evt.start_time && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-primary" />
                                {evt.start_time.slice(0, 5)} {evt.end_time ? `– ${evt.end_time.slice(0, 5)}` : ""}
                              </span>
                            )}
                            {evt.location && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-primary" />
                                {evt.location}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-border bg-card shadow-sm p-6 text-center text-muted-foreground text-xs">
              Select a date on the calendar to see details.
            </Card>
          )}

          {/* Quick Segregation Tips Card */}
          <Card className="rounded-2xl border border-border bg-primary/[0.03] border-primary/20 shadow-sm p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-primary font-display">
              <Recycle className="w-4 h-4" />
              <span>Proper Segregation Rule</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              MENRO Candelaria enforces a strict <strong>"No Segregation, No Collection"</strong> policy under RA 9003. Please keep your waste dry and sorted.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResidentSchedule;
