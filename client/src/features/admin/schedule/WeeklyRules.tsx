import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Clock, Save, Truck } from "lucide-react";
import { toast } from "@/lib/toast";
import { CollectionScheduleDay, createCollectionSchedule, updateCollectionSchedule, updateReminderSettings } from "@/services/scheduleService";

const DAYS = [["MONDAY", "Mon"], ["TUESDAY", "Tue"], ["WEDNESDAY", "Wed"], ["THURSDAY", "Thu"], ["FRIDAY", "Fri"], ["SATURDAY", "Sat"], ["SUNDAY", "Sun"]] as const;
type Draft = { waste_type: CollectionScheduleDay["waste_type"]; start_time: string; end_time: string };

interface WeeklyRulesProps {
  initialReminderTiming: string;
  rules: CollectionScheduleDay[];
  onRulesChanged: () => Promise<void>;
}

export const WeeklyRules: React.FC<WeeklyRulesProps> = ({ initialReminderTiming, rules, onRulesChanged }) => {
  const [reminderTiming, setReminderTiming] = useState(initialReminderTiming);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newRuleDrafts, setNewRuleDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => setReminderTiming(initialReminderTiming), [initialReminderTiming]);
  useEffect(() => {
    setDrafts(Object.fromEntries(rules.map((rule) => [rule.id, {
      waste_type: rule.waste_type,
      start_time: rule.start_time?.slice(0, 5) || "",
      end_time: rule.end_time?.slice(0, 5) || "",
    }])));
  }, [rules]);

  const rulesByDay = useMemo(() => new Map(rules.map((rule) => [rule.day_of_week, rule])), [rules]);

  const saveRule = async (rule: CollectionScheduleDay) => {
    const draft = drafts[rule.id];
    if (!draft?.start_time) return toast.error("A collection start time is required.");
    if (draft.end_time && draft.end_time <= draft.start_time) return toast.error("End time must be later than start time.");
    try {
      setSavingId(rule.id);
      await updateCollectionSchedule(rule.id, { waste_type: draft.waste_type, start_time: draft.start_time, end_time: draft.end_time || null });
      await onRulesChanged();
      toast.success(`${rule.day_of_week.toLowerCase()} collection rule saved.`);
    } catch {
      toast.error("Failed to save the collection rule.");
    } finally {
      setSavingId(null);
    }
  };

  const createRule = async (day: string) => {
    const draft = newRuleDrafts[day];
    if (!draft?.start_time) return toast.error("Choose a waste type and collection start time.");
    if (draft.end_time && draft.end_time <= draft.start_time) return toast.error("End time must be later than start time.");
    try {
      setSavingId(day);
      await createCollectionSchedule({ day_of_week: day, waste_type: draft.waste_type, start_time: draft.start_time, end_time: draft.end_time || null });
      await onRulesChanged();
      setNewRuleDrafts((current) => { const next = { ...current }; delete next[day]; return next; });
      toast.success(`${day.toLowerCase()} collection rule created.`);
    } catch {
      toast.error("Failed to create the collection rule.");
    } finally {
      setSavingId(null);
    }
  };

  const saveReminder = async () => {
    try {
      setSavingReminder(true);
      await updateReminderSettings(reminderTiming === "1d" ? 24 : reminderTiming === "3h" ? 3 : 1);
      toast.success("Collection reminder timing saved.");
    } catch {
      toast.error("Failed to save reminder timing.");
    } finally {
      setSavingReminder(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-foreground font-display">Weekly Collection Rules</h2>
        <p className="text-xs text-muted-foreground mt-1">Live database rules shown to residents and used for automatic collection reminders.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
        {DAYS.map(([day, shortDay]) => {
          const rule = rulesByDay.get(day);
          const draft = rule ? drafts[rule.id] : null;
          const newDraft = newRuleDrafts[day] || { waste_type: "BIODEGRADABLE" as const, start_time: "", end_time: "" };
          const biodegradable = draft?.waste_type === "BIODEGRADABLE";
          return <Card key={day} className="border-border rounded-2xl overflow-hidden">
            <div className={biodegradable ? "h-1 bg-emerald-500" : "h-1 bg-sky-500"} />
            <CardHeader className="p-3 pb-2"><div className="flex items-center justify-between gap-2"><CardTitle className="text-xs font-bold">{shortDay}</CardTitle><Badge variant="outline" className="text-[9px]">{rule ? "Live rule" : "Not set"}</Badge></div></CardHeader>
            <CardContent className="p-3 pt-1 space-y-2.5">{rule && draft ? <>
              <Select value={draft.waste_type} onValueChange={(value: CollectionScheduleDay["waste_type"]) => setDrafts((current) => ({ ...current, [rule.id]: { ...draft, waste_type: value } }))}><SelectTrigger className="h-8 text-[11px] rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BIODEGRADABLE" className="text-xs">Biodegradable</SelectItem><SelectItem value="NON_BIODEGRADABLE" className="text-xs">Non-biodegradable</SelectItem></SelectContent></Select>
              <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />Start time</label><input type="time" value={draft.start_time} onChange={(event) => setDrafts((current) => ({ ...current, [rule.id]: { ...draft, start_time: event.target.value } }))} className="h-8 w-full rounded-lg border border-input bg-background px-2 text-[11px]" /></div>
              <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground">End time <span className="font-normal">(optional)</span></label><input type="time" value={draft.end_time} onChange={(event) => setDrafts((current) => ({ ...current, [rule.id]: { ...draft, end_time: event.target.value } }))} className="h-8 w-full rounded-lg border border-input bg-background px-2 text-[11px]" /></div>
              <Button size="sm" onClick={() => saveRule(rule)} disabled={savingId === rule.id} className="h-8 w-full rounded-lg text-[11px] gap-1.5"><Save className="w-3 h-3" />{savingId === rule.id ? "Saving..." : "Save rule"}</Button>
            </> : <>
              <p className="text-[11px] text-muted-foreground">No database rule exists for this day.</p>
              <Select value={newDraft.waste_type} onValueChange={(value: CollectionScheduleDay["waste_type"]) => setNewRuleDrafts((current) => ({ ...current, [day]: { ...newDraft, waste_type: value } }))}><SelectTrigger className="h-8 text-[11px] rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BIODEGRADABLE" className="text-xs">Biodegradable</SelectItem><SelectItem value="NON_BIODEGRADABLE" className="text-xs">Non-biodegradable</SelectItem></SelectContent></Select>
              <div className="space-y-1"><label className="text-[10px] font-medium text-muted-foreground">Start time</label><input type="time" value={newDraft.start_time} onChange={(event) => setNewRuleDrafts((current) => ({ ...current, [day]: { ...newDraft, start_time: event.target.value } }))} className="h-8 w-full rounded-lg border border-input bg-background px-2 text-[11px]" /></div>
              <Button size="sm" onClick={() => createRule(day)} disabled={savingId === day} className="h-8 w-full rounded-lg text-[11px] gap-1.5"><Save className="w-3 h-3" />{savingId === day ? "Creating..." : "Create rule"}</Button>
            </>}</CardContent>
          </Card>;
        })}
      </div>
      <Card className="border border-border/80 rounded-2xl"><CardHeader className="pb-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center"><Bell className="w-4 h-4" /></div><div><CardTitle className="text-sm font-bold font-display">Automatic Resident Reminders</CardTitle><p className="text-xs text-muted-foreground mt-0.5">Sent once per collection rule to residents who allow collection reminders.</p></div></div></CardHeader><CardContent className="flex flex-col sm:flex-row sm:items-center gap-3"><Select value={reminderTiming} onValueChange={setReminderTiming}><SelectTrigger className="w-full sm:w-64 h-9 text-xs rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1h">1 hour before collection</SelectItem><SelectItem value="3h">3 hours before collection</SelectItem><SelectItem value="1d">1 day before collection</SelectItem></SelectContent></Select><Button size="sm" onClick={saveReminder} disabled={savingReminder} className="h-9 rounded-xl text-xs gap-1.5"><Truck className="w-3.5 h-3.5" />{savingReminder ? "Saving..." : "Save reminder"}</Button></CardContent></Card>
    </div>
  );
};
