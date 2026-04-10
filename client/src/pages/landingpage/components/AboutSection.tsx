import { CheckCircle, Leaf, Eye, Settings, LucideIcon } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { AboutContent, DEFAULT_CONTENT } from "@/pages/admin/components/landingmanager/types";

const pillarIcons: LucideIcon[] = [Leaf, Eye, Settings];

interface AboutSectionProps {
  content?: AboutContent;
}

const AboutSection = ({ content = DEFAULT_CONTENT.about }: AboutSectionProps) => {
  const leftRef = useScrollReveal();
  const rightRef = useScrollReveal({ rootMargin: "0px 0px -60px 0px" });

  return (
    <section id="about" className="py-10 sm:py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 bg-primary/3 rounded-full blur-3xl pointer-events-none hidden sm:block" />

      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-start">
          <div ref={leftRef} className="space-y-4 sm:space-y-6">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <span className="w-8 h-px bg-primary" />
              {content.sectionLabel}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight whitespace-pre-line">{content.heading}</h2>

            <p className="text-muted-foreground leading-relaxed">{content.paragraph1}</p>
            <p className="text-muted-foreground leading-relaxed">{content.paragraph2}</p>

            <div className="flex flex-wrap gap-3 pt-2">
              {content.badges.map((badge) => (
                <span key={badge} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                  <CheckCircle className="w-3.5 h-3.5" /> {badge}
                </span>
              ))}
            </div>
          </div>

          <div ref={rightRef} className="bg-card border border-border/60 rounded-xl sm:rounded-2xl p-5 sm:p-8 space-y-4 sm:space-y-6 shadow-lg shadow-primary/3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <span className="w-8 h-px bg-primary" />
              Our Commitment
            </span>
            {content.pillars.map((pillar, index) => {
              const Icon = pillarIcons[index % pillarIcons.length];

              return (
                <div key={pillar.id} className="group space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      <Icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                    </div>
                    <h4 className="font-display font-semibold">{pillar.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-[52px]">{pillar.description}</p>
                  {index < content.pillars.length - 1 && <div className="ml-[52px] h-px bg-border/60 mt-4" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
