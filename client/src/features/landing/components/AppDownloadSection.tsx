import { BatteryFull, CalendarDays, ClipboardList, MapPin, Signal, Smartphone, Truck, Wifi } from "lucide-react";
import { CONTENT, type AppDownloadContent } from "../landingContent";
import InstallAppButton from "./InstallAppButton";
import "./AppDownloadSection.css";

const benefitIcons = [CalendarDays, Truck, ClipboardList];

export default function AppDownloadSection({ content = CONTENT.appDownload }: { content?: AppDownloadContent }) {
  return (
    <section id="greenway-app" aria-labelledby="greenway-app-heading" className="app-download bg-background py-12 sm:py-16">
      <div className="container">
        <div className="app-download-panel relative isolate overflow-hidden rounded-2xl border border-primary/20 bg-card">
          <div className="grid items-center md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="relative z-10 min-w-0 p-5 sm:p-8 lg:p-10">
              <p className="mb-4 flex items-center gap-3 text-xs font-semibold tracking-wide text-forest dark:text-accent-foreground">
                <span aria-hidden="true" className="h-px w-8 bg-primary/60" />{content.sectionLabel}
              </p>
              <h2 id="greenway-app-heading" className="max-w-lg text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">{content.heading}</h2>
              <p className="mt-4 max-w-lg text-pretty text-sm leading-6 text-muted-foreground sm:text-base">{content.description}</p>

              <ul className="mt-6 space-y-4">
                {content.benefits.map((benefit, index) => {
                  const Icon = benefitIcons[index % benefitIcons.length];
                  return (
                    <li key={benefit.id} className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-card text-primary dark:text-accent-foreground">
                        <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">{benefit.title}</h3>
                        <p className="mt-1 max-w-md text-sm leading-5 text-muted-foreground">{benefit.description}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-7">
                <InstallAppButton className="h-12 w-full px-5 sm:w-auto dark:disabled:opacity-70" />
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs leading-5 text-muted-foreground">
                <Smartphone aria-hidden="true" className="h-3.5 w-3.5" />Android APK <span aria-hidden="true">•</span> Direct Install
              </p>
            </div>

            <figure className="app-download-preview relative m-0 hidden min-w-0 flex-col items-center justify-center gap-5 px-6 py-8 md:flex lg:py-10">
              <div aria-hidden="true" className="app-download-orbit pointer-events-none absolute rounded-full border border-primary/15" />
              <div aria-hidden="true" className="app-download-phone relative w-full max-w-60 p-2">
                <span className="app-download-phone-switch absolute rounded-full" />
                <span className="app-download-phone-volume absolute rounded-full" />
                <span className="app-download-phone-power absolute rounded-full" />
                <div className="app-download-phone-screen relative flex h-full flex-col overflow-hidden bg-background">
                  <div className="relative flex h-12 shrink-0 items-center justify-between px-4 text-foreground">
                    <span className="text-[10px] font-semibold tabular-nums">9:41</span>
                    <span className="app-download-phone-island absolute left-1/2 top-2.5 flex h-5 w-20 -translate-x-1/2 items-center justify-end rounded-full pr-2"><span className="app-download-phone-camera h-1.5 w-1.5 rounded-full" /></span>
                    <span className="flex items-center gap-0.5"><Signal className="h-2.5 w-2.5" /><Wifi className="h-2.5 w-2.5" /><BatteryFull className="h-3.5 w-3.5" /></span>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary dark:text-accent-foreground">
                      <img src="/greenway.svg" alt="" width={24} height={24} loading="lazy" />GreenWay
                    </div>
                    <div className="app-download-screen-placeholder mt-4 flex min-h-32 flex-1 flex-col items-center justify-center rounded-xl border border-primary/15 px-3 py-5 text-center">
                      <Smartphone className="mb-3 h-8 w-8 text-primary dark:text-accent-foreground" strokeWidth={1.5} />
                      <p className="text-sm font-semibold text-foreground">App Preview</p>
                      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Your GreenWay screen goes here</p>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      {content.benefits.map((benefit, index) => {
                        const Icon = benefitIcons[index % benefitIcons.length];
                        return (
                          <div key={benefit.id} className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-card px-3 py-3">
                            <Icon className="h-4 w-4 shrink-0 text-primary dark:text-accent-foreground" strokeWidth={1.8} />
                            <div className="flex-1 space-y-1.5">
                              <span className="block h-1.5 w-3/4 rounded-full bg-muted-foreground/20" />
                              <span className="block h-1 w-1/2 rounded-full bg-muted-foreground/10" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mx-auto mb-2.5 h-1 w-20 shrink-0 rounded-full bg-foreground/75" />
                </div>
              </div>
              <figcaption className="relative rounded-lg bg-card/95 px-4 py-2 text-center text-xs leading-5 text-muted-foreground">
                <span className="mb-1 flex items-center justify-center gap-1.5 font-medium text-foreground"><MapPin aria-hidden="true" className="h-3.5 w-3.5 text-primary dark:text-accent-foreground" />Made for Candelaria</span>
                Placeholder app design
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
