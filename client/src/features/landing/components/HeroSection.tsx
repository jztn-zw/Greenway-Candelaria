import { ArrowDownToLine, ArrowRight, CalendarDays, Leaf, MapPin, Smartphone, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import useAuthStore from "@/store/authStore";
import { CONTENT, type HeroContent } from "../landingContent";
import { handleLandingNavigation } from "../utils/navigation";
import HeroNeighborhood from "./HeroNeighborhood";
import InstallAppButton from "./InstallAppButton";

const featureIcons = [CalendarDays, Truck, Leaf];

interface HeroSectionProps {
  content?: HeroContent;
}

export default function HeroSection({ content = CONTENT.hero }: HeroSectionProps) {
  const navigate = useNavigate();
  const brandIndex = content.headline.indexOf("GreenWay");
  const startTracking = () => {
    const { isAuthenticated, token } = useAuthStore.getState();
    handleLandingNavigation(isAuthenticated && token ? content.ctaPrimaryLink : "/login", navigate);
  };

  return (
    <section id="home" className="relative isolate overflow-hidden bg-background">
      <div className="container hero-layout">
        <div className="hero-copy relative z-10 min-w-0">
          <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary dark:bg-card/80 dark:text-accent-foreground sm:px-4 sm:text-sm">
            {content.badge}
          </span>

          <h1 className="hero-heading gw-heading mt-6 tracking-tight lg:mt-4">
            {brandIndex < 0 ? content.headline : <>
              {content.headline.slice(0, brandIndex)}<span className="text-primary dark:text-accent-foreground">GreenWay</span>
              <span className="block">{content.headline.slice(brandIndex + "GreenWay".length).trim()}</span>
            </>}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground dark:text-foreground/75 sm:text-lg lg:mt-4">
            {content.subtitle}
          </p>

          <div className="hero-actions mt-6 flex flex-wrap gap-3 sm:mt-7 lg:mt-5">
            <Button variant="hero" className="h-12 w-full px-5 sm:h-14 sm:w-auto sm:px-6 sm:text-base lg:h-12" onClick={startTracking}>
              <MapPin aria-hidden="true" />{content.ctaPrimaryLabel}<ArrowRight aria-hidden="true" />
            </Button>
            <Button variant="hero-outline" className="h-12 w-full px-6 sm:h-14 sm:w-auto sm:px-8 sm:text-base lg:h-12" onClick={() => handleLandingNavigation(content.ctaSecondaryLink, navigate)}>
              {content.ctaSecondaryLabel}
            </Button>
          </div>

          <div className="hero-app-card mt-6 rounded-xl border border-primary/15 bg-card/95 px-4 py-3 lg:mt-4">
            <div aria-hidden="true" className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:text-accent-foreground">
              <Smartphone className="h-8 w-8" strokeWidth={1.7} />
              <ArrowDownToLine className="absolute h-4 w-4" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">Get the GreenWay App</h2>
              <p className="mt-1 text-sm leading-5 text-muted-foreground dark:text-foreground/75">Download the Android app to your phone.</p>
              <p className="mt-1 text-xs text-muted-foreground">Android only <span aria-hidden="true">•</span> APK download</p>
            </div>
            <InstallAppButton className="hero-app-action h-11 px-4 dark:disabled:opacity-70" />
          </div>

          <ul className="hero-highlights mt-6 border-t border-border/60 pt-5 sm:pt-6 lg:mt-4 lg:pt-4">
            {content.serviceCards.map((feature, index) => {
              const Icon = featureIcons[index % featureIcons.length];
              return (
                <li key={feature.id} className="flex min-w-0 items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:text-accent-foreground">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-sm font-semibold leading-5 text-foreground">{feature.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{feature.description}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="hero-neighborhood-slot relative hidden min-w-0 lg:block">
          <HeroNeighborhood />
          <ul aria-label="GreenWay features" className="hero-scene-labels hidden sm:block">
            <li className="hero-scene-label hero-scene-label--tracking"><MapPin aria-hidden="true" /><span>Real-Time Tracking</span></li>
            <li className="hero-scene-label hero-scene-label--schedule"><CalendarDays aria-hidden="true" /><span>Collection Schedule</span></li>
            <li className="hero-scene-label hero-scene-label--community"><Truck aria-hidden="true" /><span>Cleaner Community</span></li>
          </ul>
        </div>
      </div>
    </section>
  );
}
