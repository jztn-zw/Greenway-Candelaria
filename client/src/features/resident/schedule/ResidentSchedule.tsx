import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Clock,
  MapPin,
  Truck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Info,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  X as CloseIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CalendarGrid } from "@/features/admin/schedule/CalendarGrid";
import { ResidentScheduleSkeleton } from "@/components/PageLoadingSkeletons";
import {
  CalendarEvent,
  CollectionScheduleDay,
  fetchCalendarEvents,
  fetchCollectionSchedule,
} from "@/services/scheduleService";
import { SegmentedControl } from "@/components/common";
import useAuthStore from "@/store/authStore";

const toDateString = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const eventColor = (id: string) => {
  let value = 0;
  for (let index = 0; index < id.length; index += 1) value = (value * 31 + id.charCodeAt(index)) >>> 0;
  return `hsl(${value % 360} 72% 52%)`;
};

const formatTime12 = (timeStr?: string | null) => {
  if (!timeStr) return "";
  try {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
  } catch {
    return timeStr;
  }
};

const getEventBadgeInfo = (event: CalendarEvent) => {
  const titleLower = event.title.toLowerCase();
  if (titleLower.includes("holiday")) {
    return {
      label: "Holiday Reminder",
      badgeClass: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
      iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
  }
  if (titleLower.includes("cleanup") || titleLower.includes("clean-up")) {
    return {
      label: "Clean-up Drive",
      badgeClass: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
      iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  if (titleLower.includes("collection") || event.event_type === "COLLECTION_SCHEDULE") {
    return {
      label: "Collection Schedule",
      badgeClass: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10",
      iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    };
  }
  if (event.event_type === "COMMUNITY_EVENT") {
    return {
      label: "Community Event",
      badgeClass: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10",
      iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
  }
  return {
    label: "Official Notice",
    badgeClass: "border-primary/30 text-primary bg-primary/10",
    iconClass: "bg-primary/10 text-primary border-primary/20",
  };
};

const formatEventDisplayDate = (event: CalendarEvent) => {
  try {
    const rawDate = event.event_date.split("T")[0];
    const [y, m, d] = rawDate.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const formatted = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    if (event.start_time) {
      return `${formatted}, ${formatTime12(event.start_time)}`;
    }
    return formatted;
  } catch {
    return event.event_date;
  }
};

// Candelaria standard municipal collection rules by day of week
const defaultWasteScheduleByDay: Record<number, {
  dayName: string;
  wasteType: "BIODEGRADABLE" | "NON_BIODEGRADABLE";
  title: string;
  badgeClass: string;
  timeWindow: string;
  accepted: string[];
  prohibited: string[];
  tips: string;
}> = {
  0: {
    dayName: "Sunday",
    wasteType: "BIODEGRADABLE",
    title: "Biodegradable",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    timeWindow: "6:00 AM – 10:00 AM",
    accepted: ["Food leftovers & peelings", "Fruit & vegetable scraps", "Garden clippings & dry leaves", "Eggshells & coffee grounds"],
    prohibited: ["Plastics & styrofoam", "Tin cans & scrap metals", "Hazardous chemicals", "Diapers & napkins"],
    tips: "Drain all liquids from organic waste before placing it curbside. Use compostable bags when possible.",
  },
  1: {
    dayName: "Monday",
    wasteType: "BIODEGRADABLE",
    title: "Biodegradable",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    timeWindow: "6:00 AM – 10:00 AM",
    accepted: ["Food leftovers & peelings", "Fruit & vegetable scraps", "Garden clippings & dry leaves", "Eggshells & coffee grounds"],
    prohibited: ["Plastics & styrofoam", "Tin cans & scrap metals", "Hazardous chemicals", "Diapers & napkins"],
    tips: "Drain all liquids from organic waste before placing it curbside. Use compostable bags when possible.",
  },
  2: {
    dayName: "Tuesday",
    wasteType: "NON_BIODEGRADABLE",
    title: "Non-Biodegradable",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    timeWindow: "6:00 AM – 10:00 AM",
    accepted: ["Plastics & styrofoam", "Tin cans & scrap metals", "Cartons & wrappers", "Glass bottles & jars"],
    prohibited: ["Wet food scraps", "Soil & garden waste", "Hazardous chemicals", "Medical waste"],
    tips: "Ensure all non-biodegradable waste is bagged securely before placing curbside.",
  },
  3: {
    dayName: "Wednesday",
    wasteType: "BIODEGRADABLE",
    title: "Biodegradable",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    timeWindow: "6:00 AM – 10:00 AM",
    accepted: ["Food leftovers & peelings", "Fruit & vegetable scraps", "Garden clippings & dry leaves", "Eggshells & coffee grounds"],
    prohibited: ["Plastics & styrofoam", "Tin cans & scrap metals", "Hazardous chemicals", "Diapers & napkins"],
    tips: "Drain all liquids from organic waste before placing it curbside. Use compostable bags when possible.",
  },
  4: {
    dayName: "Thursday",
    wasteType: "NON_BIODEGRADABLE",
    title: "Non-Biodegradable",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    timeWindow: "6:00 AM – 10:00 AM",
    accepted: ["Plastics & styrofoam", "Tin cans & scrap metals", "Cartons & wrappers", "Glass bottles & jars"],
    prohibited: ["Wet food scraps", "Soil & garden waste", "Hazardous chemicals", "Medical waste"],
    tips: "Ensure all non-biodegradable waste is bagged securely before placing curbside.",
  },
  5: {
    dayName: "Friday",
    wasteType: "BIODEGRADABLE",
    title: "Biodegradable",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    timeWindow: "6:00 AM – 10:00 AM",
    accepted: ["Food leftovers & peelings", "Fruit & vegetable scraps", "Garden clippings & dry leaves", "Eggshells & coffee grounds"],
    prohibited: ["Plastics & styrofoam", "Tin cans & scrap metals", "Hazardous chemicals", "Diapers & napkins"],
    tips: "Drain all liquids from organic waste before placing it curbside. Use compostable bags when possible.",
  },
  6: {
    dayName: "Saturday",
    wasteType: "NON_BIODEGRADABLE",
    title: "Non-Biodegradable",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    timeWindow: "6:00 AM – 10:00 AM",
    accepted: ["Plastics & styrofoam", "Tin cans & scrap metals", "Cartons & wrappers", "Glass bottles & jars"],
    prohibited: ["Wet food scraps", "Soil & garden waste", "Hazardous chemicals", "Medical waste"],
    tips: "Ensure all non-biodegradable waste is bagged securely before placing curbside.",
  },
};

const dayNameToIndex: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

type ViewTab = "CALENDAR" | "WEEKLY_GUIDE";

const ResidentSchedule = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const barangayName = user?.barangay_name || "Candelaria";

  const today = new Date();
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [collectionRules, setCollectionRules] = useState<CollectionScheduleDay[]>([]);
  const [activeTab, setActiveTab] = useState<ViewTab>("CALENDAR");
  const [expandedWeeklyDay, setExpandedWeeklyDay] = useState(today.getDay());
  const [selectedEventModal, setSelectedEventModal] = useState<CalendarEvent | null>(null);

  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState(() =>
    toDateString(today.getFullYear(), today.getMonth(), today.getDate()),
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = toDateString(today.getFullYear(), today.getMonth(), today.getDate());

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      fetchCalendarEvents({ month: `${year}-${String(month + 1).padStart(2, "0")}` }),
      fetchCollectionSchedule().catch(() => []),
    ])
      .then(([evts, rules]) => {
        if (isMounted) {
          setEvents(evts || []);
          if (Array.isArray(rules) && rules.length > 0) {
            setCollectionRules(rules);
          }
        }
      })
      .catch((error) => console.error("Failed to load resident calendar events", error))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [year, month]);

  // Selected date events
  const selectedEvents = useMemo(
    () =>
      events.filter((event) => {
        const start = event.event_date.split("T")[0];
        const end = event.end_date?.split("T")[0] || start;
        return selectedDateStr >= start && selectedDateStr <= end;
      }),
    [events, selectedDateStr],
  );

  // Colors per event
  const scheduleColorById = useMemo(
    () => new Map(events.map((event) => [event.id, eventColor(event.id)])),
    [events],
  );

  const selectedDate = useMemo(() => new Date(`${selectedDateStr}T00:00:00`), [selectedDateStr]);
  const selectedDayOfWeek = selectedDate.getDay();
  const isSelectedToday = selectedDateStr === todayStr;

  // Resolve collection rule for selected day (merge custom DB rule if present)
  const selectedDayCollection = useMemo(() => {
    const base = defaultWasteScheduleByDay[selectedDayOfWeek];
    const customRule = collectionRules.find(
      (r) => dayNameToIndex[r.day_of_week?.toUpperCase()] === selectedDayOfWeek,
    );

    if (!customRule) return base;

    const isBio = customRule.waste_type === "BIODEGRADABLE";
    return {
      ...base,
      wasteType: customRule.waste_type,
      title: isBio ? "Biodegradable" : "Non-Biodegradable",
      badgeClass: isBio
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
      timeWindow: customRule.start_time
        ? `${customRule.start_time.slice(0, 5)} ${customRule.end_time ? `– ${customRule.end_time.slice(0, 5)}` : "AM"}`
        : base.timeWindow,
    };
  }, [selectedDayOfWeek, collectionRules]);

  const isSelectedDayBio = selectedDayCollection.wasteType === "BIODEGRADABLE";

  const changeMonth = (amount: number) => {
    const next = new Date(year, month + amount, 1);
    setCurrentDate(next);
    setSelectedDateStr(toDateString(next.getFullYear(), next.getMonth(), 1));
  };

  const goToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(todayStr);
  };

  // Filtered weekly guide items
  const filteredWeeklyGuide = useMemo(() => {
    const days = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday
    return days.map((dayIndex) => {
      const schedule = defaultWasteScheduleByDay[dayIndex];
      const customRule = collectionRules.find(
        (r) => dayNameToIndex[r.day_of_week?.toUpperCase()] === dayIndex,
      );
      const isBio = customRule ? customRule.waste_type === "BIODEGRADABLE" : schedule.wasteType === "BIODEGRADABLE";

      return {
        ...schedule,
        dayIndex,
        isCustom: Boolean(customRule),
        title: isBio ? "Biodegradable" : "Non-Biodegradable",
        badgeClass: isBio
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
      };
    });
  }, [collectionRules]);

  if (isLoading) return <ResidentScheduleSkeleton />;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 pb-8 animate-in fade-in duration-300 md:space-y-5 md:pb-10 lg:pb-12">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center md:gap-4">
        <div className="hidden md:block">
          <h1 className="font-display text-2xl font-extrabold text-foreground tracking-tight lg:text-3xl">
            Resident Calendar
          </h1>
          <p className="mt-1 text-xs text-muted-foreground lg:text-sm">
            View collection days and official announcements.
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="w-full shrink-0 lg:w-auto">
          <SegmentedControl<ViewTab>
            className="flex w-full lg:inline-flex lg:w-auto [&>button]:flex-1 [&>button]:justify-center lg:[&>button]:flex-none"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              { value: "CALENDAR", label: "Monthly Calendar", icon: CalendarDays },
              { value: "WEEKLY_GUIDE", label: "Weekly Guide", icon: Truck },
            ]}
          />
        </div>
      </div>

      {/* ─── View Tab 1: Monthly Calendar ─── */}
      {activeTab === "CALENDAR" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 items-start">
          {/* Main Interactive Calendar */}
          <div className="lg:col-span-2 space-y-4">
            <CalendarGrid
              currentDate={currentDate}
              selectedDateStr={selectedDateStr}
              events={events}
              scheduleColorById={scheduleColorById}
              onSelectDate={setSelectedDateStr}
              onPrevMonth={() => changeMonth(-1)}
              onNextMonth={() => changeMonth(1)}
              onGoToday={goToday}
              hideTodayButtonWhenOtherDateSelected
              compactMobileCells
              footer={
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                  <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Announcements
                  </span>
                  {selectedEvents.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No announcements for this date.</span>
                  ) : (
                    selectedEvents.map((event) => {
                      const color = scheduleColorById.get(event.id) || "hsl(160 72% 52%)";
                      const date = event.event_date.split("T")[0];
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelectedDateStr(date)}
                          className="inline-flex max-w-[180px] items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-muted/80 cursor-pointer"
                        >
                          <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                          <span className="truncate">{event.title}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              }
            />
          </div>

          {/* ─── Selected Day Detail Panel (Resident-Focused Info) ─── */}
          <div className="space-y-4 lg:col-span-1">
            <Card className="border border-border/80 bg-card rounded-2xl shadow-2xs overflow-hidden">
              <CardHeader className="border-b border-border/60 p-4 lg:p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="font-display text-base font-bold text-foreground truncate">
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </CardTitle>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      Barangay {barangayName} Collection Details
                    </p>
                  </div>
                  {isSelectedToday && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-border/70 text-muted-foreground bg-muted/60 shrink-0"
                    >
                      Today
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 lg:p-5 space-y-4">
                {/* 1. Regular Waste Collection Card for Selected Day */}
                <div className="rounded-xl border border-border/70 bg-muted/30 dark:bg-muted/20 p-4 space-y-3.5">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                      <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> Regular Collection
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs shrink-0 whitespace-nowrap ${isSelectedDayBio ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelectedDayBio ? "bg-emerald-500" : "bg-amber-500"}`} />
                      <span>{selectedDayCollection.title}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5 whitespace-nowrap">
                    <span className="text-muted-foreground flex items-center gap-1.5 shrink-0">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      Pickup Hours:
                    </span>
                    <span className="font-semibold text-foreground tabular-nums shrink-0">
                      {selectedDayCollection.timeWindow}
                    </span>
                  </div>

                  {/* Accepted items quick list */}
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <p className="text-[11px] font-medium text-foreground">Examples you can put out:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDayCollection.accepted.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center text-[11px] font-medium bg-background px-2.5 py-1 rounded-lg border border-border/70 text-foreground/80 transition-colors hover:border-primary/30"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground/85 italic leading-relaxed pt-0.5">
                    Tip: {selectedDayCollection.tips}
                  </p>
                </div>

                {/* 2. Official Announcement Events on this date */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Special Events ({selectedEvents.length})
                    </h3>
                  </div>

                  {selectedEvents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 bg-background/50 p-4 text-center text-xs text-muted-foreground space-y-1">
                      <CalendarDays className="mx-auto h-5 w-5 text-muted-foreground/60" />
                      <p className="font-semibold text-foreground">No special events</p>
                      <p className="text-[11px]">Regular municipal garbage collection proceeds as scheduled.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedEvents.map((evt) => (
                        <article
                          key={evt.id}
                          onClick={() => setSelectedEventModal(evt)}
                          className="group relative rounded-xl border border-border/80 bg-background p-3.5 shadow-2xs hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer space-y-2"
                        >
                          <div className="flex items-start gap-2 justify-between">
                            <div className="flex items-start gap-2 min-w-0">
                              <span
                                className="mt-1 h-2 w-2 shrink-0 rounded-full shadow-2xs group-hover:scale-125 transition-transform"
                                style={{ backgroundColor: scheduleColorById.get(evt.id) || "hsl(160 72% 52%)" }}
                              />
                              <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                                {evt.title}
                              </h4>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>

                          {(evt.start_time || evt.location) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                              {evt.start_time && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  {evt.start_time.slice(0, 5)}
                                  {evt.end_time ? ` – ${evt.end_time.slice(0, 5)}` : ""}
                                </span>
                              )}
                              {evt.location && (
                                <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                                  <MapPin className="w-3 h-3 text-muted-foreground" />
                                  {evt.location}
                                </span>
                              )}
                            </div>
                          )}

                          {evt.description && (
                            <p className="text-[11px] text-muted-foreground/90 line-clamp-2 leading-relaxed">
                              {evt.description}
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Quick Links for Resident */}
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/resident/tracking")}
                    className="w-full h-9 text-xs font-medium justify-between rounded-xl hover:bg-muted/80 hover:border-primary/30 hover:text-primary text-foreground border-border/80 cursor-pointer transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      Track Collection Truck in Real-Time
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/resident/report")}
                    className="w-full h-9 text-xs font-medium justify-between rounded-xl hover:bg-muted/80 hover:border-primary/30 hover:text-primary text-foreground border-border/80 cursor-pointer transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                      Report Missed Pickup or Waste Issue
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─── View Tab 2: Weekly Barangay Collection Guide ─── */}
      {activeTab === "WEEKLY_GUIDE" && (
        <div className="space-y-4">
          {/* 7-Day Cards Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredWeeklyGuide.map((day) => {
              const isExpanded = expandedWeeklyDay === day.dayIndex;

              return (
                <Card
                  key={day.dayName}
                  className={`rounded-2xl border bg-card p-3.5 shadow-2xs transition-all lg:p-5 lg:hover:shadow-md ${
                    day.dayIndex === today.getDay() ? "ring-2 ring-primary/40 border-primary/40" : "border-border/80"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedWeeklyDay((current) => current === day.dayIndex ? -1 : day.dayIndex)}
                    className="w-full text-left cursor-pointer lg:cursor-default"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="text-sm font-bold font-display text-foreground">{day.dayName}</span>
                        {day.dayIndex === today.getDay() && (
                          <span className="rounded-md border border-border/70 bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Today</span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${day.wasteType === "BIODEGRADABLE" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"}`}>
                          <span className={`size-1.5 rounded-full ${day.wasteType === "BIODEGRADABLE" ? "bg-emerald-500" : "bg-amber-500"}`} />
                          {day.title}
                        </span>
                        <ChevronDown className={`size-4 text-muted-foreground transition-transform md:hidden ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5 shrink-0" />
                      <span>Collection: <strong className="text-foreground">{day.timeWindow}</strong></span>
                    </div>
                  </button>

                  <div className={`${isExpanded ? "block" : "hidden"} space-y-3 border-t border-border/50 pt-3 lg:mt-3 lg:block`}>
                    <div className="space-y-1.5 text-xs">
                      <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                        <Check className="size-3.5 text-muted-foreground" /> Examples you can put out:
                      </p>
                      <ul className="list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                        {day.accepted.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-1.5 border-t border-border/50 pt-2 text-xs">
                      <p className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                        <CloseIcon className="size-3.5 text-muted-foreground" /> Items to avoid:
                      </p>
                      <ul className="list-disc space-y-1 pl-4 text-[11px] text-muted-foreground">
                        {day.prohibited.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="border-t border-border/50 pt-2.5 text-[11px] italic text-muted-foreground/90">Tip: {day.tips}</div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Legal / Policy Notice Card */}
          <div className="flex items-start gap-3 rounded-2xl border border-border/80 bg-muted/20 p-3.5 text-xs text-muted-foreground lg:items-center lg:gap-3.5 lg:p-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted text-muted-foreground">
              <Info className="w-4 h-4" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="font-semibold leading-snug text-foreground">
                Municipal Solid Waste Management Policy (R.A. 9003)
              </p>
              <p className="leading-relaxed">
                Garbage must be segregated at source. Unsegregated garbage, hazardous waste, or waste placed outside collection hours will not be hauled by the collection fleet.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Event Details Modal ─── */}
      <Dialog
        open={Boolean(selectedEventModal)}
        onOpenChange={(open) => {
          if (!open) setSelectedEventModal(null);
        }}
      >
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] lg:max-w-md max-h-[90vh] flex flex-col p-0 gap-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden animate-in fade-in-0 zoom-in-95 duration-200">
          {selectedEventModal && (() => {
            const badgeInfo = getEventBadgeInfo(selectedEventModal);
            const displayDate = formatEventDisplayDate(selectedEventModal);

            return (
              <>
                {/* Header */}
                <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 text-left shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl ${badgeInfo.iconClass} border flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <DialogTitle className="text-sm lg:text-base font-bold font-display text-foreground tracking-tight truncate">
                        Announcement
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                        MENRO Candelaria Official Notice
                      </DialogDescription>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEventModal(null)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="px-5 py-4 space-y-3 text-left overflow-y-auto max-h-[calc(85vh-130px)] scrollbar-thin">
                  {/* Title, Category & Date Lockup (No container) */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold font-display text-foreground leading-snug tracking-tight break-words [overflow-wrap:anywhere]">
                        {selectedEventModal.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold rounded-md px-2 py-0.5 border shrink-0 ${badgeInfo.badgeClass}`}
                      >
                        {badgeInfo.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-normal">
                      <span>{displayDate}</span>
                    </p>
                  </div>

                  {/* Description container */}
                  <div className="text-xs lg:text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-muted/20 border border-border/60 rounded-xl p-3.5 lg:p-4 max-h-[38vh] overflow-y-auto scrollbar-thin">
                    {selectedEventModal.description || "No additional details or instructions provided."}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end shrink-0">
                  <Button
                    type="button"
                    onClick={() => setSelectedEventModal(null)}
                    className="w-full lg:w-auto h-9 px-6 rounded-xl text-xs lg:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-xs cursor-pointer"
                  >
                    Close
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResidentSchedule;

