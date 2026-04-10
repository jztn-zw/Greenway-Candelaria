import { Star, Quote } from "lucide-react";
import { useScrollReveal, useStaggerReveal } from "@/hooks/useScrollReveal";
import MobileCarousel from "@/components/MobileCarousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { DEFAULT_CONTENT, TestimonialsContent } from "@/pages/admin/components/landingmanager/types";

const TestimonialCard = ({ t }: { t: TestimonialsContent["items"][number] }) => (
  <div className="group bg-card rounded-xl sm:rounded-2xl border border-border/60 p-4 sm:p-6 space-y-2.5 sm:space-y-4 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 relative h-full">
    <Quote className="w-6 h-6 sm:w-8 sm:h-8 text-primary/10 absolute top-3 right-3 sm:top-4 sm:right-4" />
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${index < t.rating ? "text-primary fill-primary" : "text-muted-foreground/20"}`}
        />
      ))}
    </div>
    <p className="text-xs sm:text-sm leading-relaxed text-foreground/80 italic">"{t.quote}"</p>
    <div className="pt-2 sm:pt-3 border-t border-border/60">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs sm:text-sm shrink-0">
          {t.name.charAt(0)}
        </div>
        <div>
          <div className="font-display font-semibold text-xs sm:text-sm">{t.name}</div>
          <div className="text-[11px] sm:text-xs text-muted-foreground">{t.role}</div>
        </div>
      </div>
    </div>
  </div>
);

interface TestimonialsSectionProps {
  content?: TestimonialsContent;
}

const TestimonialsSection = ({ content = DEFAULT_CONTENT.testimonials }: TestimonialsSectionProps) => {
  const headRef = useScrollReveal();
  const gridRef = useStaggerReveal(content.items.length);
  const isMobile = useIsMobile();

  return (
    <section id="testimonials" className="py-10 sm:py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none hidden sm:block">
        <div className="absolute bottom-20 right-0 w-72 h-72 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="container space-y-6 sm:space-y-10 relative">
        <div ref={headRef} className="text-center space-y-3 sm:space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mx-auto">
            <span className="w-8 h-px bg-primary" />
            {content.sectionLabel}
            <span className="w-8 h-px bg-primary" />
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold whitespace-pre-line">{content.heading}</h2>
        </div>

        <MobileCarousel autoScrollInterval={4000} cardClassName="w-[75vw] shrink-0 snap-center">
          {content.items.map((testimonial) => (
            <TestimonialCard key={testimonial.id} t={testimonial} />
          ))}
        </MobileCarousel>

        {!isMobile && (
          <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {content.items.map((testimonial) => (
              <TestimonialCard key={testimonial.id} t={testimonial} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
