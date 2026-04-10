import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Leaf, Trash2, ChevronDown, ChevronUp, Bell, Info, MapPin } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeaderSkeleton, ScheduleGridSkeleton } from "@/components/PageLoadingSkeletons";

type WasteType = "biodegradable" | "non-biodegradable";

interface DaySchedule {
  day: string;
  shortDay: string;
  wasteType: WasteType;
  localName: string;
  barangays: string[];
}

const schedule: DaySchedule[] = [
  { day: "Monday", shortDay: "Mon", wasteType: "biodegradable", localName: "Nabulok", barangays: ["Malabanban Norte", "Malabanban Sur", "Mangilag Norte", "Mangilag Sur", "Masalukot I"] },
  { day: "Tuesday", shortDay: "Tue", wasteType: "non-biodegradable", localName: "Di-Nabulok", barangays: ["Bukal Norte", "Bukal Sur", "Candelaria Proper", "Kinatihan I", "Kinatihan II"] },
  { day: "Wednesday", shortDay: "Wed", wasteType: "biodegradable", localName: "Nabulok", barangays: ["Malabanban Norte", "Malabanban Sur", "Mangilag Norte", "Mangilag Sur", "Masalukot I"] },
  { day: "Thursday", shortDay: "Thu", wasteType: "non-biodegradable", localName: "Di-Nabulok", barangays: ["Bukal Norte", "Bukal Sur", "Candelaria Proper", "Kinatihan I", "Kinatihan II"] },
  { day: "Friday", shortDay: "Fri", wasteType: "biodegradable", localName: "Nabulok", barangays: ["Malabanban Norte", "Malabanban Sur", "Mangilag Norte", "Mangilag Sur", "Masalukot I"] },
  { day: "Saturday", shortDay: "Sat", wasteType: "non-biodegradable", localName: "Di-Nabulok", barangays: ["Bukal Norte", "Bukal Sur", "Candelaria Proper", "Kinatihan I", "Kinatihan II"] },
  { day: "Sunday", shortDay: "Sun", wasteType: "biodegradable", localName: "Nabulok", barangays: ["Malabanban Norte", "Malabanban Sur", "Mangilag Norte", "Mangilag Sur", "Masalukot I"] },
];

const todayIndex = new Date().getDay(); // 0=Sun
const reorderedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1; // Mon=0

const AdminCollectionSchedule = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [reminderTiming, setReminderTiming] = useState("3h");
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedDay(expandedDay === idx ? null : idx);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-8">
        <PageHeaderSkeleton showButton={false} />
        <ScheduleGridSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-8">
      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">Collection Schedule</h1>
            <p className="text-sm text-muted-foreground">Fixed weekly schedule set by MENRO Candelaria · View only</p>
          </div>
        </div>
        <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-muted/50 border border-border">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            This schedule is permanent and cannot be edited. Collections operate every day including holidays and regardless of weather conditions. Use the reminder settings below to control when residents are notified.
          </p>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-xs font-medium text-foreground">Biodegradable (Nabulok)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground/40" />
          <span className="text-xs font-medium text-foreground">Non-Biodegradable (Di-Nabulok)</span>
        </div>
        <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary bg-primary/5">
          Today
        </Badge>
      </div>

      {/* ── Weekly Schedule Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {schedule.map((item, idx) => {
          const isToday = idx === reorderedTodayIndex;
          const isBio = item.wasteType === "biodegradable";

          return (
            <Collapsible
              key={item.day}
              open={expandedDay === idx}
              onOpenChange={() => toggleExpand(idx)}
            >
              <Card
                className={`relative overflow-hidden transition-all duration-300 ${
                  isToday
                    ? "ring-2 ring-primary shadow-lg shadow-primary/10 border-primary/30"
                    : "border-border hover:border-primary/20 hover:shadow-sm"
                }`}
              >
                {/* Top accent bar */}
                <div
                  className={`h-1 w-full ${
                    isBio ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />

                <CardHeader className="p-3 pb-2 space-y-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {item.shortDay}
                      </span>
                      {isToday && (
                        <Badge className="text-[9px] h-4 px-1.5 bg-primary text-primary-foreground">
                          Today
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 hidden lg:block">
                    {item.day}
                  </p>
                </CardHeader>

                <CardContent className="p-3 pt-0 space-y-2">
                  {/* Waste type icon + label */}
                  <div className="flex flex-col items-center gap-1.5 py-2">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isBio
                          ? "bg-primary/10"
                          : "bg-muted"
                      }`}
                    >
                      {isBio ? (
                        <Leaf className="w-5 h-5 text-primary" />
                      ) : (
                        <Trash2 className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-semibold ${isBio ? "text-primary" : "text-foreground"}`}>
                        {isBio ? "Biodegradable" : "Non-Biodegradable"}
                      </p>
                      <p className="text-[10px] text-muted-foreground italic">
                        {item.localName}
                      </p>
                    </div>
                  </div>

                  {/* Expand trigger */}
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      {item.barangays.length} barangays
                      {expandedDay === idx ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-1">
                    <div className="border-t border-border pt-2 space-y-1">
                      {item.barangays.map((brgy) => (
                        <div
                          key={brgy}
                          className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                        >
                          <div className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                          {brgy}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* ── Reminder Settings ── */}
      <Card className="border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Reminder Settings</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Control when residents receive collection day notifications
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-sm font-medium text-foreground whitespace-nowrap">
              Send reminders
            </label>
            <Select value={reminderTiming} onValueChange={setReminderTiming}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 hour before collection</SelectItem>
                <SelectItem value="3h">3 hours before collection</SelectItem>
                <SelectItem value="1d">1 day before collection</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="sm:ml-2">
              Save
            </Button>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-muted/40">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Changing this setting will affect when all residents receive their collection day notification. Currently set to send reminders <span className="font-semibold text-foreground">{reminderTiming === "1h" ? "1 hour" : reminderTiming === "3h" ? "3 hours" : "1 day"}</span> before the scheduled collection.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCollectionSchedule;
