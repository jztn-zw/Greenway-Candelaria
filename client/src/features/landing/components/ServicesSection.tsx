import { CalendarClock, Truck, BellRing, BarChart3, Users, ShieldCheck, LucideIcon } from "lucide-react";
import { useScrollReveal, useStaggerReveal } from "@/hooks/useScrollReveal";
import MobileCarousel from "@/components/MobileCarousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { CONTENT, ServicesContent } from "../landingContent";

const serviceIcons: LucideIcon[] = [CalendarClock, Truck, BellRing, BarChart3, Users, ShieldCheck];

const ServiceCard = ({ s }: { s: { icon: LucideIcon; title: string; desc: string } }) => (
  <div className="group bg-card rounded-xl border border-border/60 p-4 sm:p-5 lg:p-5 space-y-2.5 sm:space-y-4 hover:border-primary/30 transition-colors duration-150 relative overflow-hidden h-full">
    <div className="relative">
      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
        <s.icon className="w-4 h-4 sm:w-6 sm:h-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
      </div>
      <h3 className="gw-heading text-sm sm:text-base lg:text-lg mt-2 sm:mt-4">{s.title}</h3>
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
  }));

  return (
    <section id="services" className="py-10 sm:py-16 lg:py-20 bg-secondary/30 relative overflow-x-hidden">

      <div className="container space-y-6 sm:space-y-10 lg:space-y-12 relative">
        <div ref={headRef} className="text-center max-w-2xl mx-auto space-y-3 sm:space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mx-auto">
            <span className="w-8 h-px bg-primary" />
            {content.sectionLabel}
            <span className="w-8 h-px bg-primary" />
          </span>
          <h2 className="gw-heading text-2xl sm:text-3xl lg:text-4xl whitespace-pre-line">{content.heading}</h2>
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
