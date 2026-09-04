import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Truck, Leaf, MapPin, ChevronDown, ChevronUp, Bell, Info, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { updateReminderSettings } from "@/services/scheduleService";

const DEFAULT_WEEKLY = [
  { day: "Monday", shortDay: "Mon", wasteType: "BIODEGRADABLE", localName: "Nabulok", barangays: ["Malabanban Norte", "Malabanban Sur", "Mangilag Norte", "Mangilag Sur", "Masalukot I"] },
  { day: "Tuesday", shortDay: "Tue", wasteType: "NON_BIODEGRADABLE", localName: "Di-Nabulok", barangays: ["Bukal Norte", "Bukal Sur", "Candelaria Proper", "Kinatihan I", "Kinatihan II"] },
  { day: "Wednesday", shortDay: "Wed", wasteType: "BIODEGRADABLE", localName: "Nabulok", barangays: ["Malabanban Norte", "Malabanban Sur", "Mangilag Norte", "Mangilag Sur", "Masalukot I"] },
  { day: "Thursday", shortDay: "Thu", wasteType: "NON_BIODEGRADABLE", localName: "Di-Nabulok", barangays: ["Bukal Norte", "Bukal Sur", "Candelaria Proper", "Kinatihan I", "Kinatihan II"] },
  { day: "Friday", shortDay: "Fri", wasteType: "BIODEGRADABLE", localName: "Nabulok", barangays: ["Malabanban Norte", "Malabanban Sur", "Mangilag Norte", "Mangilag Sur", "Masalukot I"] },
  { day: "Saturday", shortDay: "Sat", wasteType: "NON_BIODEGRADABLE", localName: "Di-Nabulok", barangays: ["Bukal Norte", "Bukal Sur", "Candelaria Proper", "Kinatihan I", "Kinatihan II"] },
  { day: "Sunday", shortDay: "Sun", wasteType: "BIODEGRADABLE", localName: "Nabulok", barangays: ["Malabanban Norte", "Malabanban Sur", "Mangilag Norte", "Mangilag Sur", "Masalukot I"] },
];

interface WeeklyRulesProps {
  initialReminderTiming: string;
}

export const WeeklyRules: React.FC<WeeklyRulesProps> = ({ initialReminderTiming }) => {
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [reminderTiming, setReminderTiming] = useState(initialReminderTiming);
  const [isSaving, setIsSaving] = useState(false);

  const todayIndex = new Date().getDay();
  const reorderedTodayIndex = todayIndex === 0 ? 6 : todayIndex - 1;

  const handleSaveReminder = async () => {
    try {
      setIsSaving(true);
      const hours = reminderTiming === "1d" ? 24 : reminderTiming === "3h" ? 3 : 1;
      await updateReminderSettings(hours);
      toast.success("Resident notification timing updated successfully");
    } catch (err) {
      toast.error("Failed to update reminder setting");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground font-display">
              Permanent Weekly Municipal Collection Rules
            </h2>
            <p className="text-xs text-muted-foreground">
              Standard municipal waste segregation routine (Mon/Wed/Fri/Sun Biodegradable · Tue/Thu/Sat Non-Biodegradable)
            </p>
          </div>
        </div>
      </div>

      {/* 7-Day Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {DEFAULT_WEEKLY.map((item, idx) => {
          const isToday = idx === reorderedTodayIndex;
          const isBio = item.wasteType === "BIODEGRADABLE";

          return (
            <Collapsible
              key={item.day}
              open={expandedDay === idx}
              onOpenChange={() => setExpandedDay(expandedDay === idx ? null : idx)}
            >
              <Card
                className={`relative overflow-hidden transition-all duration-300 ${
                  isToday
                    ? "ring-2 ring-primary shadow-md shadow-primary/10 border-primary/40"
                    : "border-border hover:border-primary/20 hover:shadow-xs"
                }`}
              >
                <div
                  className={`h-1 w-full ${
                    isBio ? "bg-emerald-500" : "bg-sky-500"
                  }`}
                />
                <CardHeader className="p-3 pb-2 space-y-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {item.shortDay}
                    </span>
                    {isToday && (
                      <Badge className="text-[9px] h-4 px-1.5 bg-primary text-primary-foreground font-bold">
                        Today
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-3 pt-0 space-y-2">
                  <div className="flex flex-col items-center gap-1.5 py-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isBio
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                      }`}
                    >
                      {isBio ? <Leaf className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-semibold ${isBio ? "text-emerald-700 dark:text-emerald-400" : "text-sky-700 dark:text-sky-400"}`}>
                        {isBio ? "Biodegradable" : "Non-Biodegradable"}
                      </p>
                      <p className="text-[10px] text-muted-foreground italic">
                        {item.localName}
                      </p>
                    </div>
                  </div>

                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-[10px] text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                    >
                      <MapPin className="w-3 h-3" />
                      {item.barangays.length} sectors
                      {expandedDay === idx ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-1">
                    <div className="border-t border-border/60 pt-2 space-y-1 max-h-36 overflow-y-auto">
                      {item.barangays.map((brgy) => (
                        <div
                          key={brgy}
                          className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                        >
                          <div className="w-1 h-1 rounded-full bg-primary/60 shrink-0" />
                          <span className="truncate">{brgy}</span>
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

      {/* Automated Reminder Settings */}
      <Card className="border border-border/80 shadow-2xs rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold font-display">Automated Resident Reminders</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure automated push notifications dispatched to residents before truck pickup
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-semibold text-foreground whitespace-nowrap">
              Notification Trigger:
            </label>
            <Select value={reminderTiming} onValueChange={setReminderTiming}>
              <SelectTrigger className="w-full sm:w-64 h-9 text-xs rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 hour before collection (5:00 AM)</SelectItem>
                <SelectItem value="3h">3 hours before collection (3:00 AM)</SelectItem>
                <SelectItem value="1d">1 day before collection (Evening prior)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleSaveReminder}
              disabled={isSaving}
              className="sm:ml-2 h-9 text-xs font-semibold rounded-xl cursor-pointer active:scale-95 shadow-xs"
            >
              {isSaving ? "Saving..." : "Save Setting"}
            </Button>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Changing this setting applies to all registered residents across Candelaria. Currently configured to dispatch reminders <strong className="text-foreground">{reminderTiming === "1h" ? "1 hour" : reminderTiming === "3h" ? "3 hours" : "1 day"}</strong> prior to standard route collection.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
