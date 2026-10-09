import { CalendarDays, MapPin, Truck, UserRound } from "lucide-react";
import { CONTENT, type HowItWorksContent } from "../landingContent";
import "./HowItWorksSection.css";

const stepIcons = [UserRound, CalendarDays, Truck];

export default function HowItWorksSection({ content = CONTENT.howItWorks }: { content?: HowItWorksContent }) {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="how-it-works relative isolate overflow-hidden bg-background py-12 sm:py-16">
      <div className="container grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12 xl:gap-16">
        <div className="how-it-works-intro relative overflow-hidden rounded-2xl border border-primary/15 bg-card p-5 sm:p-8">
          <p className="mb-4 flex items-center gap-3 text-xs font-semibold tracking-wide text-forest dark:text-accent-foreground">
            <span aria-hidden="true" className="h-px w-8 bg-primary/60" />{content.sectionLabel}
          </p>
          <h2 id="how-it-works-heading" className="max-w-md text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">{content.heading}</h2>
          <p className="mt-4 max-w-md text-pretty text-base leading-relaxed text-muted-foreground dark:text-foreground/75">{content.subtitle}</p>
          <div className="mt-6 hidden items-center gap-2 border-t border-primary/10 pt-4 text-xs text-muted-foreground sm:flex">
            <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-primary dark:text-accent-foreground" strokeWidth={1.8} />Made for residents of Candelaria.
          </div>
        </div>

        <ol className="how-it-works-steps space-y-4">
          {content.steps.map((step, index) => {
            const Icon = stepIcons[index % stepIcons.length];
            return (
              <li key={step.id} className="relative grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 sm:gap-4">
                {index < content.steps.length - 1 && <span aria-hidden="true" className="how-it-works-connector pointer-events-none absolute -bottom-8 left-5 top-14 w-px" />}
                <span aria-hidden="true" className="how-it-works-number relative mt-4 flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-card font-display text-sm font-semibold tabular-nums text-primary dark:text-accent-foreground">{String(index + 1).padStart(2, "0")}</span>
                <div className="how-it-works-step min-w-0 rounded-xl border border-primary/15 bg-card px-4 py-3 sm:px-5 sm:py-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold leading-6 tracking-tight text-foreground sm:text-lg">{step.title}</h3>
                    <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/[0.07] text-primary dark:text-accent-foreground min-[400px]:flex"><Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} /></span>
                  </div>
                  <p className="mt-1.5 max-w-md text-pretty text-sm leading-6 text-muted-foreground dark:text-foreground/75">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
