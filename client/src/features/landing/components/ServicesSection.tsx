import { CalendarClock, Truck, BellRing, BarChart3, Users, ShieldCheck, LucideIcon } from "lucide-react";
import { useScrollReveal, useStaggerReveal } from "@/hooks/useScrollReveal";
import MobileCarousel from "@/components/MobileCarousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { CONTENT, ServicesContent } from "../landingContent";

const serviceIcons: LucideIcon[] = [CalendarClock, Truck, BellRing, BarChart3, Users, ShieldCheck];
const accents = [
  "from-primary/10 to-primary/5",
  "from-leaf/10 to-leaf/5",
  "from-primary/10 to-primary/5",
  "from-leaf/10 to-leaf/5",
  "from-primary/10 to-primary/5",
  "from-leaf/10 to-leaf/5",
];

const ServiceCard = ({ s }: { s: { icon: LucideIcon; title: string; desc: string; accent: string } }) => (
  <div className="group bg-card rounded-xl sm:rounded-2xl border border-border/60 p-4 sm:p-5 lg:p-7 space-y-2.5 sm:space-y-4 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden h-full">
    <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    <div className="relative">
      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
        <s.icon className="w-4 h-4 sm:w-6 sm:h-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
      </div>
      <h3 className="font-display text-sm sm:text-base lg:text-lg font-semibold mt-2 sm:mt-4">{s.title}</h3>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1 sm:mt-2">{s.desc}</p>
    </div>
  </div>
);

interface ServicesSectionProps {
  content?: ServicesContent;
}

const ServicesSection = ({ content = CONTENT.services }: ServicesSectionProps) => {
  const headRef = useScrollReveal();
  const gridRef = useStaggerReveal(content.items.length);
  const isMobile = useIsMobile();
  const services = content.items.map((item, index) => ({
    icon: serviceIcons[index % serviceIcons.length],
    title: item.title,
    desc: item.description,
    accent: accents[index % accents.length],
  }));

  return (
    <section id="services" className="py-10 sm:py-16 lg:py-20 bg-gradient-to-b from-secondary/50 to-background relative overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none hidden sm:block">
        <div className="absolute top-40 -left-20 w-60 h-60 bg-primary/3 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-leaf/3 rounded-full blur-3xl" />
      </div>

      <div className="container space-y-6 sm:space-y-10 lg:space-y-12 relative">
        <div ref={headRef} className="text-center max-w-2xl mx-auto space-y-3 sm:space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mx-auto">
            <span className="w-8 h-px bg-primary" />
            {content.sectionLabel}
            <span className="w-8 h-px bg-primary" />
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold whitespace-pre-line">{content.heading}</h2>
        </div>

        <MobileCarousel autoScrollInterval={3000} cardClassName="w-[70vw] shrink-0 snap-center pt-1">
          {services.map((service) => (
            <ServiceCard key={service.title} s={service} />
          ))}
        </MobileCarousel>

        {!isMobile && (
          <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 pt-1">
            {services.map((service) => (
              <ServiceCard key={service.title} s={service} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ServicesSection;
