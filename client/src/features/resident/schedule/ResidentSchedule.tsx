import { getCategoryBadgeColors, badgeStyles } from "@/components/ui/badgeStyles";
import { FormDialogHeader } from "@/components/FormDialog";
import { formDialogStyles as modalStyles } from "@/components/formDialogStyles";
import { useResidentQuery } from "@/lib/residentQuery";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import { PageRetryContext } from "@/components/pageRetryContext";
import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
  X as CloseIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { ResidentScheduleSkeleton } from "@/components/PageLoadingSkeletons";
import {
  CalendarEvent,
  CollectionScheduleDay,
  fetchCalendarEvents,
  fetchCollectionSchedule,
} from "@/services/scheduleService";
import { SegmentedControl } from "@/components/common";
import useAuthStore from "@/store/authStore";
import { formatDateOnly, getManilaNow } from "@/utils/date";

const toDateString = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const eventColor = (id: string) => {
  let value = 0;
  for (let index = 0; index < id.length; index += 1) value = (value * 31 + id.charCodeAt(index)) >>> 0;
  return `hsl(var(--chart-${(value % 6) + 1}))`;
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
      badgeClass: getCategoryBadgeColors("Holiday Reminder").className,
      iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
  }
  if (titleLower.includes("cleanup") || titleLower.includes("clean-up")) {
    return {
      label: "Clean-up Drive",
      badgeClass: getCategoryBadgeColors("Clean-up Drive").className,
      iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  if (titleLower.includes("collection") || event.event_type === "COLLECTION_SCHEDULE") {
    return {
      label: "Collection Schedule",
      badgeClass: getCategoryBadgeColors("Collection Schedule").className,
      iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    };
  }
  if (event.event_type === "COMMUNITY_EVENT") {
    return {
      label: "Community Event",
      badgeClass: getCategoryBadgeColors("Community Event").className,
      iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
  }
  return {
    label: "Official Notice",
    badgeClass: getCategoryBadgeColors("Official Notice").className,
    iconClass: "bg-primary/10 text-primary border-primary/20",
  };
};

const formatEventDisplayDate = (event: CalendarEvent) => {
  const rawDate = event.event_date.split("T")[0];
  const formatted = formatDateOnly(rawDate, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }, event.event_date);

  return event.start_time
    ? `${formatted}, ${formatTime12(event.start_time)}`
    : formatted;
};

const wasteGuidance: Record<NonNullable<CollectionScheduleDay["waste_type"]>, {
  title: string;
  badgeClass: string;
  accepted: string[];
  prohibited: string[];
  tips: string;
}> = {
  BIODEGRADABLE: {
    title: "Biodegradable",
    badgeClass: getCategoryBadgeColors("Biodegradable").className,
    accepted: ["Food leftovers & peelings", "Fruit & vegetable scraps", "Garden clippings & dry leaves", "Eggshells & coffee grounds"],
    prohibited: ["Plastics & styrofoam", "Tin cans & scrap metals", "Hazardous chemicals", "Diapers & napkins"],
    tips: "Drain all liquids from organic waste before placing it curbside. Use compostable bags when possible.",
  },
  NON_BIODEGRADABLE: {
    title: "Non-Biodegradable",
    badgeClass: getCategoryBadgeColors("Non-Biodegradable").className,
    accepted: ["Plastics & styrofoam", "Tin cans & scrap metals", "Cartons & wrappers", "Glass bottles & jars"],
    prohibited: ["Wet food scraps", "Soil & garden waste", "Hazardous chemicals", "Medical waste"],
    tips: "Ensure all non-biodegradable waste is bagged securely before placing curbside.",
  },
};

const generalCollectionGuidance = {
  title: "Waste collection",
  badgeClass: getCategoryBadgeColors("Waste collection").className,
  accepted: [] as string[],
  prohibited: [] as string[],
  tips: "Follow your barangay's waste segregation guidance.",
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const formatScheduleWindow = (startTime?: string | null, endTime?: string | null) => {
  const start = formatTime12(startTime);
  const end = formatTime12(endTime);
  return [start, end].filter(Boolean).join(" – ") || "Time not set";
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

  const today = getManilaNow();
  const [activeTab, setActiveTab] = useState<ViewTab>("CALENDAR");
  const [expandedWeeklyDay, setExpandedWeeklyDay] = useState(today.weekdayIndex);
  const [selectedEventModal, setSelectedEventModal] = useState<CalendarEvent | null>(null);

  const [currentDate, setCurrentDate] = useState(() => new Date(today.year, today.month - 1, 1));
  const [selectedDateStr, setSelectedDateStr] = useState(() =>
    today.dateKey,
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = today.dateKey;

  const calendarQuery = useResidentQuery("schedule", ["calendar", year, month],
    () => fetchCalendarEvents({ month: `${year}-${String(month + 1).padStart(2, "0")}` }));
  const scheduleQuery = useResidentQuery("schedule", ["collection"], fetchCollectionSchedule);
  const events = useMemo(() => calendarQuery.data ?? [], [calendarQuery.data]);
  const collectionRules = useMemo(() => scheduleQuery.data ?? [], [scheduleQuery.data]);
  const isLoading = calendarQuery.isLoading || scheduleQuery.isLoading;
  const calendarError = calendarQuery.isError && calendarQuery.data === undefined;
  const scheduleError = scheduleQuery.isError && scheduleQuery.data === undefined;
  const retrySchedule = () => { if (calendarQuery.isError) void calendarQuery.refetch(); if (scheduleQuery.isError) void scheduleQuery.refetch(); };

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

  const selectedDayOfWeek = useMemo(() => {
    const [selectedYear, selectedMonth, selectedDay] = selectedDateStr.split("-").map(Number);
    return new Date(Date.UTC(selectedYear, selectedMonth - 1, selectedDay)).getUTCDay();
  }, [selectedDateStr]);
  const isSelectedToday = selectedDateStr === todayStr;

  // Route Manager is the source of collection days for this resident's address.
  const selectedDayCollection = useMemo(() => {
    const customRule = collectionRules.find(
      (r) => dayNameToIndex[r.day_of_week?.toUpperCase()] === selectedDayOfWeek,
    );
    if (!customRule) return null;
    const guidance = customRule.waste_type ? wasteGuidance[customRule.waste_type] : generalCollectionGuidance;
    return {
      ...guidance,
      dayName: dayNames[selectedDayOfWeek],
      wasteType: customRule.waste_type,
      routeName: customRule.route_name,
      timeWindow: formatScheduleWindow(customRule.start_time, customRule.end_time),
    };
  }, [selectedDayOfWeek, collectionRules]);

  const isSelectedDayBio = selectedDayCollection?.wasteType === "BIODEGRADABLE";

  const changeMonth = (amount: number) => {
    const next = new Date(year, month + amount, 1);
    setCurrentDate(next);
    setSelectedDateStr(toDateString(next.getFullYear(), next.getMonth(), 1));
  };

  const goToday = () => {
    setCurrentDate(new Date(today.year, today.month - 1, 1));
    setSelectedDateStr(todayStr);
  };

  // Filtered weekly guide items
  const filteredWeeklyGuide = useMemo(() => {
    return collectionRules
      .map((rule) => {
        const dayIndex = dayNameToIndex[rule.day_of_week?.toUpperCase()];
        if (dayIndex === undefined) return null;
        return {
          ...(rule.waste_type ? wasteGuidance[rule.waste_type] : generalCollectionGuidance),
          id: rule.id,
          routeName: rule.route_name,
          dayName: dayNames[dayIndex],
          dayIndex,
          wasteType: rule.waste_type,
          timeWindow: formatScheduleWindow(rule.start_time, rule.end_time),
        };
      })
      .filter((day): day is NonNullable<typeof day> => Boolean(day))
      .sort((a, b) => ((a.dayIndex + 6) % 7) - ((b.dayIndex + 6) % 7));
  }, [collectionRules]);

  if (isLoading) return <ResidentScheduleSkeleton />;
  if (calendarError && scheduleError) return <PageErrorState kind="unavailable" description="We couldn't load the calendar and collection schedule. Please try again." onRetry={retrySchedule} retrying={calendarQuery.isFetching || scheduleQuery.isFetching} homeHref="/resident" />;

  return (
    <PageRetryContext.Provider value={true}>
    <div className="mx-auto w-full max-w-[1400px] space-y-4 pb-8 animate-in fade-in duration-300 md:space-y-5 md:pb-10 lg:pb-12">
      {/* ─── Page Header ─── */}
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center md:gap-4">
        <div className="hidden md:block">
          <h1 className="gw-page-title sm:text-ui-page-lg text-foreground tracking-tight">
            Resident Calendar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
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

      {(calendarQuery.isError || scheduleQuery.isError) && <DataRefreshNotice primary message="Some schedule information couldn't load or refresh. Available information is still shown; previously loaded data may be outdated." onRetry={retrySchedule} retrying={calendarQuery.isFetching || scheduleQuery.isFetching} />}

      {/* ─── View Tab 1: Monthly Calendar ─── */}
      {activeTab === "CALENDAR" && (calendarError ? <PageErrorState kind="unavailable" variant="section" title="Calendar couldn't load" description="We couldn't load this month's announcements. Please try again." onRetry={() => void calendarQuery.refetch()} retrying={calendarQuery.isFetching} /> : (
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
                  <span className="mr-1 text-ui-caption font-bold uppercase tracking-wider text-muted-foreground">
                    Announcements
                  </span>
                  {selectedEvents.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No announcements for this date.</span>
                  ) : (
                    selectedEvents.map((event) => {
                      const color = scheduleColorById.get(event.id) || "hsl(var(--chart-1))";
                      const date = event.event_date.split("T")[0];
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setSelectedDateStr(date)}
                          className="gw-action-outline inline-flex max-w-[180px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors cursor-pointer"
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
                    <CardTitle className="gw-heading text-base text-foreground truncate">
                      {formatDateOnly(selectedDateStr, {
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
                      className={"text-ui-overline font-semibold px-2.5 py-0.5 rounded-md border shrink-0 " + badgeStyles.neutral.className}
                    >
                      Today
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 lg:p-5 space-y-4">
                {/* 1. Regular Waste Collection Card for Selected Day */}
                {scheduleError ? <PageErrorState kind="unavailable" variant="section" title="Collection details couldn't load" onRetry={() => void scheduleQuery.refetch()} retrying={scheduleQuery.isFetching} /> : selectedDayCollection ? (
                <div className="rounded-xl border border-border/70 bg-muted/30 dark:bg-muted/20 p-4 space-y-3.5">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-ui-caption font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                      <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> Regular Collection
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-ui-caption font-semibold border shadow-2xs shrink-0 whitespace-nowrap ${selectedDayCollection.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelectedDayBio ? "bg-emerald-500" : selectedDayCollection.wasteType ? "bg-amber-500" : "bg-sky-500"}`} />
                      <span>{selectedDayCollection.title}</span>
                    </span>
                  </div>

                  {selectedDayCollection.routeName && <p className="text-xs font-medium text-foreground">{selectedDayCollection.routeName}</p>}

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
                  {selectedDayCollection.accepted.length > 0 && <div className="pt-2 border-t border-border/50 space-y-2">
                    <p className="text-ui-caption font-medium text-foreground">Examples you can put out:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDayCollection.accepted.map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center text-ui-caption font-medium bg-background px-2.5 py-1 rounded-lg border border-border/70 text-foreground/80 transition-colors hover:border-primary/30"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>}

                  <p className="text-ui-caption text-muted-foreground/85 italic leading-relaxed pt-0.5">
                    Tip: {selectedDayCollection.tips}
                  </p>
                </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/80 bg-background/50 p-4 text-center text-xs text-muted-foreground space-y-1">
                    <CalendarDays className="mx-auto h-5 w-5 text-muted-foreground/60" />
                    <p className="font-semibold text-foreground">No collection schedule</p>
                    <p className="text-ui-caption">No active collection route covers your address on this day.</p>
                  </div>
                )}

                {/* 2. Official Announcement Events on this date */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="gw-heading text-xs uppercase tracking-wider text-muted-foreground">
                      Special Events ({selectedEvents.length})
                    </h3>
                  </div>

                  {selectedEvents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/80 bg-background/50 p-4 text-center text-xs text-muted-foreground space-y-1">
                      <CalendarDays className="mx-auto h-5 w-5 text-muted-foreground/60" />
                      <p className="font-semibold text-foreground">No special events</p>
                      <p className="text-ui-caption">
                        {selectedDayCollection
                          ? "Your scheduled collection route remains in effect."
                          : "No collection or special event is published for this date."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedEvents.map((evt) => (
                        <button
                          type="button"
                          key={evt.id}
                          onClick={() => setSelectedEventModal(evt)}
                          className="group relative w-full rounded-xl border border-border/80 bg-background p-3.5 text-left shadow-2xs hover:border-primary/30 hover:bg-[var(--button-neutral-hover)] transition-all cursor-pointer space-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="flex items-start gap-2 justify-between">
                            <div className="flex items-start gap-2 min-w-0">
                              <span
                                className="mt-1 h-2 w-2 shrink-0 rounded-full shadow-2xs group-hover:scale-125 transition-transform"
                                style={{ backgroundColor: scheduleColorById.get(evt.id) || "hsl(var(--chart-1))" }}
                              />
                              <h4 className="gw-heading text-xs text-foreground group-hover:text-primary transition-colors leading-snug">
                                {evt.title}
                              </h4>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>

                          {(evt.start_time || evt.location) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ui-caption text-muted-foreground pt-1 border-t border-border/40">
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
                            <p className="text-ui-caption text-muted-foreground/90 line-clamp-2 leading-relaxed">
                              {evt.description}
                            </p>
                          )}
                        </button>
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
                    className="w-full h-9 text-xs font-medium justify-between rounded-xl cursor-pointer transition-all"
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
                    className="w-full h-9 text-xs font-medium justify-between rounded-xl cursor-pointer transition-all"
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
      ))}
      {/* ─── View Tab 2: Weekly Barangay Collection Guide ─── */}
      {activeTab === "WEEKLY_GUIDE" && (
        <div className="space-y-4">
          {/* 7-Day Cards Grid */}
          {scheduleError ? (
            <PageErrorState kind="unavailable" variant="section" title="Weekly schedule couldn't load" onRetry={() => void scheduleQuery.refetch()} retrying={scheduleQuery.isFetching} />
          ) : filteredWeeklyGuide.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card p-8 text-center">
              <CalendarDays className="mx-auto size-6 text-muted-foreground/60" />
              <p className="mt-2 text-sm font-semibold text-foreground">No weekly schedule published</p>
              <p className="mt-1 text-xs text-muted-foreground">Collection days appear when an active route covers your address.</p>
            </div>
          ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredWeeklyGuide.map((day) => {
              const isExpanded = expandedWeeklyDay === day.dayIndex;

              return (
                <Card
                  key={day.id}
                  className={`rounded-2xl border bg-card p-3.5 shadow-2xs transition-all lg:p-5 ${
                    day.dayIndex === today.weekdayIndex ? "ring-2 ring-primary/40 border-primary/40" : "border-border/80"
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
                        <span className="text-sm font-semibold font-body text-foreground">{day.dayName}</span>
                        {day.dayIndex === today.weekdayIndex && (
                          <span className="rounded-md border border-border/70 bg-muted px-1.5 py-0.5 text-ui-overline font-semibold text-muted-foreground">Today</span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-ui-overline font-semibold ${day.badgeClass}`}>
                          <span className={`size-1.5 rounded-full ${day.wasteType === "BIODEGRADABLE" ? "bg-emerald-500" : day.wasteType ? "bg-amber-500" : "bg-sky-500"}`} />
                          {day.title}
                        </span>
                        <ChevronDown className={`size-4 text-muted-foreground transition-transform md:hidden ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5 shrink-0" />
                      <span>Collection: <strong className="text-foreground">{day.timeWindow}</strong></span>
                    </div>
                    {day.routeName && <p className="mt-1 text-xs text-muted-foreground">{day.routeName}</p>}
                  </button>

                  <div className={`${isExpanded ? "block" : "hidden"} space-y-3 border-t border-border/50 pt-3 lg:mt-3 lg:block`}>
                    {day.accepted.length > 0 && <div className="space-y-1.5 text-xs">
                      <p className="flex items-center gap-1.5 text-ui-caption font-medium text-foreground">
                        <Check className="size-3.5 text-muted-foreground" /> Examples you can put out:
                      </p>
                      <ul className="list-disc space-y-1 pl-4 text-ui-caption text-muted-foreground">
                        {day.accepted.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>}
                    {day.prohibited.length > 0 && <div className="space-y-1.5 border-t border-border/50 pt-2 text-xs">
                      <p className="flex items-center gap-1.5 text-ui-caption font-medium text-foreground">
                        <CloseIcon className="size-3.5 text-muted-foreground" /> Items to avoid:
                      </p>
                      <ul className="list-disc space-y-1 pl-4 text-ui-caption text-muted-foreground">
                        {day.prohibited.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>}
                    <div className="border-t border-border/50 pt-2.5 text-ui-caption italic text-muted-foreground/90">Tip: {day.tips}</div>
                  </div>
                </Card>
              );
            })}
          </div>
          )}

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
        <DialogContent className={modalStyles.content}>
          {selectedEventModal && (() => {
            const badgeInfo = getEventBadgeInfo(selectedEventModal);
            const displayDate = formatEventDisplayDate(selectedEventModal);

            return (
              <>
                <FormDialogHeader title="Announcement" description="MENRO Candelaria Official Notice" icon={<Calendar />} onClose={() => setSelectedEventModal(null)} />
                {/* Modal Body */}
                <div className={modalStyles.body}>
                  {/* Title, Category & Date Lockup (No container) */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="gw-heading text-base text-foreground leading-snug tracking-tight break-words [overflow-wrap:anywhere]">
                        {selectedEventModal.title}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-ui-overline font-semibold rounded-md px-2 py-0.5 border shrink-0 ${badgeInfo.badgeClass}`}
                      >
                        {badgeInfo.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-normal">
                      <span>{displayDate}</span>
                    </p>
                  </div>

                  {/* Description container */}
                  <div className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-muted/20 border border-border/60 rounded-md p-3.5 max-h-[38vh] overflow-y-auto scrollbar-thin">
                    {selectedEventModal.description || "No additional details or instructions provided."}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className={modalStyles.footer}>
                  <Button
                    type="button"
                    onClick={() => setSelectedEventModal(null)}
                    className={modalStyles.primaryButton}
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
    </PageRetryContext.Provider>
  );
};

export default ResidentSchedule;
