import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.webp";
import { CalendarDays, CalendarCheck, MapPin, Bell, Sparkles, LucideIcon } from "lucide-react";
import { useScrollReveal, useStaggerReveal } from "@/hooks/useScrollReveal";
import MobileCarousel from "@/components/MobileCarousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { CONTENT, HeroContent } from "../landingContent";
import { useNavigate } from "react-router-dom";
import { handleLandingNavigation } from "../utils/navigation";

const days = [
  { day: "Monday", type: "Biodegradable (Nabubulok)", color: "bg-primary/10 text-primary" },
  { day: "Tuesday", type: "Non-Biodegradable (Di-Nabubulok)", color: "bg-muted text-muted-foreground" },
  { day: "Wednesday", type: "Biodegradable (Nabubulok)", color: "bg-primary/10 text-primary" },
  { day: "Thursday", type: "Non-Biodegradable (Di-Nabubulok)", color: "bg-muted text-muted-foreground" },
  { day: "Friday", type: "Biodegradable (Nabubulok)", color: "bg-primary/10 text-primary" },
  { day: "Saturday", type: "Non-Biodegradable (Di-Nabubulok)", color: "bg-muted text-muted-foreground" },
  { day: "Sunday", type: "Biodegradable (Nabubulok)", color: "bg-primary/10 text-primary" },
];

const serviceIcons: LucideIcon[] = [CalendarCheck, MapPin, Bell];

const todayIndex = new Date().getDay();
const adjustedIndex = todayIndex === 0 ? 6 : todayIndex - 1;

const HeroServiceCard = ({ c }: { c: { icon: LucideIcon; title: string; desc: string } }) => (
  <div className="group bg-card rounded-xl border border-border/50 p-5 sm:p-6 lg:p-6 space-y-2.5 sm:space-y-4 hover:border-primary/30 transition-all duration-300 h-full">
    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
      <c.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
    </div>
    <h3 className="gw-heading text-base sm:text-lg ">{c.title}</h3>
    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
  </div>
);

interface HeroSectionProps {
  content?: HeroContent;
}

const HeroSection = ({ content = CONTENT.hero }: HeroSectionProps) => {
  const navigate = useNavigate();
  const leftRef = useScrollReveal();
  const rightRef = useScrollReveal({ rootMargin: "0px 0px -20px 0px" });
  const cardsRef = useStaggerReveal(content.serviceCards.length);
  const isMobile = useIsMobile();
  const serviceCards = content.serviceCards.map((card, index) => ({
    icon: serviceIcons[index % serviceIcons.length],
    title: card.title,
    desc: card.description,
  }));

  return (
    <section id="home" className="relative overflow-x-hidden">
      <div className="absolute inset-0">
        <img src={heroBg} alt="" className="w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-primary/5 dark:from-background/95 dark:via-background/90 dark:to-primary/5" />
      </div>

      <div className="container relative py-10 sm:py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center">
          <div ref={leftRef} className="space-y-4 sm:space-y-6">
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md bg-primary/10 text-primary text-ui-caption sm:text-xs font-semibold border border-primary/20">
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {content.badge}
            </span>

            <h1 className="gw-heading text-3xl sm:text-5xl lg:text-6xl leading-[1.1] tracking-tight whitespace-pre-line">
              {content.headline}
            </h1>

            <p className="text-muted-foreground max-w-lg leading-relaxed text-sm sm:text-base">{content.subtitle}</p>

            <div className="flex flex-wrap gap-2 sm:gap-3 pt-1 sm:pt-2">
              <Button
                variant="hero"
                size="default"
                className="sm:text-base sm:px-6 sm:py-3"
                onClick={() =>
                  handleLandingNavigation(content.ctaPrimaryLink, navigate)
                }
              >
                {content.ctaPrimaryLabel}
              </Button>
              <Button
                variant="hero-outline"
                size="default"
                className="sm:text-base sm:px-6 sm:py-3"
                onClick={() =>
                  handleLandingNavigation(content.ctaSecondaryLink, navigate)
                }
              >
                {content.ctaSecondaryLabel}
              </Button>
            </div>
          </div>

          <div ref={rightRef} className="bg-card rounded-xl border border-border/60 p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              </div>
              Weekly Collection Schedule
            </div>
            <div className="space-y-1">
              {days.map((d, i) => (
                <div
                  key={d.day}
                  className={`flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm transition-colors ${
                    i === adjustedIndex
                      ? "bg-primary text-primary-foreground font-semibold "
                      : d.color
                  }`}
                >
                  <span className="font-medium">{d.day}</span>
                  <span className="text-ui-caption sm:text-xs">{d.type}</span>
                </div>
              ))}
            </div>
            <p className="text-ui-caption sm:text-xs text-muted-foreground text-center">Current day is automatically highlighted</p>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 lg:mt-16">
          <MobileCarousel autoScrollInterval={3500} cardClassName="w-[75vw] shrink-0 snap-center">
            {serviceCards.map((card) => (
              <HeroServiceCard key={card.title} c={card} />
            ))}
          </MobileCarousel>

          {!isMobile && (
            <div ref={cardsRef} className="grid sm:grid-cols-3 gap-4 lg:gap-6">
              {serviceCards.map((card) => (
                <HeroServiceCard key={card.title} c={card} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
