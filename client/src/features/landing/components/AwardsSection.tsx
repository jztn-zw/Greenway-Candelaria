import { Award, Trophy } from "lucide-react";
import { useScrollReveal, useStaggerReveal } from "@/hooks/useScrollReveal";
import MobileCarousel from "@/components/MobileCarousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { AwardsContent, CONTENT } from "../landingContent";

const AwardCard = ({
  item,
  index,
}: {
  item: AwardsContent["items"][number];
  index: number;
}) => (
  <div className="group bg-card rounded-xl border border-border/60 p-4 sm:p-6 text-center space-y-2 sm:space-y-3 hover:border-primary/30 transition-all duration-300 h-full">
    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto group-hover:bg-primary transition-colors duration-300">
      {index === 0 ? (
        <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
      ) : (
        <Award className="w-5 h-5 sm:w-6 sm:h-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
      )}
    </div>
    <h3 className="gw-heading text-sm leading-snug">{item.name}</h3>
    <p className="text-xs text-muted-foreground">{item.awardingBody}</p>
    <p className="text-xs text-muted-foreground">{item.description}</p>
    <span className="inline-block text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-md">{item.year}</span>
  </div>
);

interface AwardsSectionProps {
  content?: AwardsContent;
}

const AwardsSection = ({ content = CONTENT.awards }: AwardsSectionProps) => {
  const headRef = useScrollReveal();
  const gridRef = useStaggerReveal(content.items.length);
  const isMobile = useIsMobile();

  return (
    <section id="awards" className="py-10 sm:py-16 lg:py-20 relative overflow-hidden">

      <div className="container space-y-6 sm:space-y-10 relative">
        <div ref={headRef} className="text-center space-y-3 sm:space-y-4">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mx-auto">
            <span className="w-8 h-px bg-primary" />
            {content.sectionLabel}
            <span className="w-8 h-px bg-primary" />
          </span>
          <h2 className="gw-heading text-2xl sm:text-3xl lg:text-4xl whitespace-pre-line">{content.heading}</h2>
        </div>

        <MobileCarousel cardClassName="w-[65vw] shrink-0 snap-center">
          {content.items.map((item, index) => (
            <AwardCard key={item.id} item={item} index={index} />
          ))}
        </MobileCarousel>

        {!isMobile && (
          <div ref={gridRef} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {content.items.map((item, index) => (
              <AwardCard key={item.id} item={item} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AwardsSection;
