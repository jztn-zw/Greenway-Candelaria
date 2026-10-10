import { useId, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Leaf, Package, ShieldCheck, X } from "lucide-react";
import { getCategoryBadgeColors } from "@/components/ui/badgeStyles";
import { COLLECTION_WASTE_MAP } from "@/lib/collectionSchedule";
import { useSystemTime } from "@/hooks/useSystemTime";
import { getManilaNow } from "@/utils/date";
import { CONTENT, type CollectionScheduleGuideContent } from "../landingContent";
import "./CollectionScheduleGuide.css";

const stepIcons = [CalendarDays, Leaf, ShieldCheck];

export default function CollectionScheduleGuide({ content = CONTENT.collectionScheduleGuide }: { content?: CollectionScheduleGuideContent }) {
  const detailsId = useId();
  const now = useSystemTime();
  const today = now === null ? null : getManilaNow(new Date(now));
  const dateKey = today?.dateKey ?? "";
  const [selection, setSelection] = useState<{ dateKey: string; index: number } | null>(null);
  // Manual choices last for this Philippine date; a new day follows today again.
  const selectedIndex = selection?.dateKey === dateKey ? selection.index
    : Math.max(0, content.days.findIndex(day => day.day === today?.weekday));
  const selected = content.days[selectedIndex] ?? content.days[0];
  const waste = COLLECTION_WASTE_MAP[selected.day];
  const Icon = waste.type === "biodegradable" ? Leaf : Package;
  const badge = getCategoryBadgeColors(waste.label);

  return (
    <section id="collection-schedule" aria-labelledby="collection-schedule-heading" className="collection-guide relative isolate overflow-hidden bg-background py-12 sm:py-16">
      <div className="container relative grid items-center gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-10 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] xl:gap-14">
        <div className="min-w-0">
          <p className="mb-3 flex items-center gap-3 text-xs font-semibold tracking-wide text-primary dark:text-accent-foreground">
            <span aria-hidden="true" className="h-px w-8 bg-primary/60" />{content.sectionLabel}
          </p>
          <h2 id="collection-schedule-heading" className="max-w-lg text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">{content.heading}</h2>
          <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-muted-foreground dark:text-foreground/75">{content.description}</p>
          <ol className="mt-5 hidden space-y-3 lg:block">
            {content.steps.map((step, index) => {
              const StepIcon = stepIcons[index % stepIcons.length];
              return (
                <li key={step.title} className="flex items-start gap-3">
                  <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary dark:text-accent-foreground"><StepIcon className="h-4 w-4" strokeWidth={1.8} /></span>
                  <div className="min-w-0"><h3 className="text-sm font-semibold text-foreground">{step.title}</h3><p className="mt-0.5 max-w-sm text-sm leading-5 text-muted-foreground dark:text-foreground/75">{step.description}</p></div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="collection-guide-panel mx-auto w-full min-w-0 max-w-2xl overflow-hidden rounded-2xl border border-border/70 bg-card lg:mx-0 lg:justify-self-end">
          <div className="collection-guide-panel-header px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-medium text-forest dark:text-accent-foreground">Your Weekly Routine</p><h3 className="mt-0.5 font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">Know What to Set Out</h3></div>
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-card/70 text-primary dark:text-accent-foreground"><CalendarDays className="h-4 w-4" strokeWidth={1.8} /></span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Choose a day to see its waste type and tips.</p>
            <div role="group" aria-label="Choose a weekday" className="mt-3 grid grid-cols-4 gap-1 min-[400px]:grid-cols-7 sm:gap-2">
              {content.days.map((day, index) => (
                <button key={day.day} type="button" aria-label={day.day} aria-pressed={selected.day === day.day} aria-controls={detailsId} onClick={() => setSelection({ dateKey, index })} className={`collection-guide-day flex min-h-11 min-w-0 items-center justify-center rounded-lg border px-0.5 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:text-sm ${selected.day === day.day ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/70 bg-card text-muted-foreground"}`}>
                  {day.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div id={detailsId} role="region" aria-label={`${selected.day} preparation advice`} aria-live="polite" aria-atomic="true" className="border-t border-border/60 px-4 py-4 sm:px-6">
            <div key={selected.day} className="collection-guide-details">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-base font-semibold text-foreground"><Icon aria-hidden="true" className="h-4 w-4 text-primary dark:text-accent-foreground" strokeWidth={1.8} />{selected.day}</h4>
                <span className={`rounded-md border px-2 py-1 text-xs font-medium ${badge.className}`}>{waste.label}</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:gap-3">
                <div className="rounded-xl border border-primary/10 bg-primary/[0.04] p-3 sm:p-4">
                  <h5 className="mb-2 text-xs font-semibold text-foreground sm:text-sm">What to Put Out</h5>
                  <ul className="space-y-1.5">{selected.guidance.accepted.map(item => <li key={item} className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground dark:text-foreground/75 sm:text-sm"><Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary dark:text-accent-foreground" />{item}</li>)}</ul>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/25 p-3 sm:p-4">
                  <h5 className="mb-2 text-xs font-semibold text-foreground sm:text-sm">What to Avoid</h5>
                  <ul className="space-y-1.5">{selected.guidance.avoid.map(item => <li key={item} className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground dark:text-foreground/75 sm:text-sm"><X aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />{item}</li>)}</ul>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-accent-foreground" />{selected.guidance.tip}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-2 border-t border-border/60 bg-primary/[0.03] px-4 py-2 text-xs sm:px-6"><span className="hidden text-muted-foreground sm:inline">A fixed routine. A cleaner Candelaria.</span><a href="#contact" className="landing-text-link flex min-h-11 items-center gap-1 rounded-md font-medium text-primary underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-accent-foreground">Contact MENRO <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></a></div>
        </div>
      </div>
    </section>
  );
}
