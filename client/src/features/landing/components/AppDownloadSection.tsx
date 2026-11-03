import { Bell, Camera, Smartphone } from "lucide-react";
import { CONTENT, type AppDownloadContent } from "../landingContent";
import InstallAppButton from "./InstallAppButton";
import ResidentAppVideo from "./ResidentAppVideo";
import "./AppDownloadSection.css";

const benefitIcons = [Bell, Smartphone, Camera];

export default function AppDownloadSection({ content = CONTENT.appDownload }: { content?: AppDownloadContent }) {
  return (
    <section id="greenway-app" aria-labelledby="greenway-app-heading" className="app-download bg-background py-12 sm:py-16">
      <div className="container">
        <div className="app-download-panel relative isolate overflow-hidden rounded-2xl border border-primary/20 bg-card">
          <div className="grid items-center lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
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
              <p className="mt-5 max-w-lg border-l-2 border-primary/30 pl-3 text-xs leading-5 text-muted-foreground">
                Browser alerts work while GreenWay is open, including background tabs. Your notification inbox is available on both the app and website.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                <InstallAppButton className="h-12 px-5" />
              </div>
            </div>

            <ResidentAppVideo />
          </div>
        </div>
      </div>
    </section>
  );
}
