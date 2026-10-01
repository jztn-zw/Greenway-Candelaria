import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { HelpCircle } from "lucide-react";
import { CONTENT, FAQContent } from "../landingContent";

interface FAQSectionProps {
  content?: FAQContent;
}

const FAQSection = ({ content = CONTENT.faq }: FAQSectionProps) => {
  const leftRef = useScrollReveal();
  const rightRef = useScrollReveal({ rootMargin: "0px 0px -60px 0px" });

  return (
    <section id="faq" className="py-10 sm:py-16 lg:py-20 relative overflow-hidden">

      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          <div ref={leftRef} className="space-y-4 sm:space-y-6">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <span className="w-8 h-px bg-primary" />
              {content.sectionLabel}
            </span>
            <h2 className="gw-heading text-2xl sm:text-3xl lg:text-4xl whitespace-pre-line">{content.heading}</h2>
            <p className="text-muted-foreground">{content.subtitle}</p>

            <div className="bg-muted/40 border-l-2 border-primary/30 p-4 space-y-3 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <HelpCircle className="w-8 h-8 text-primary/10" />
              </div>
              <h4 className="gw-heading text-sm pr-8">{content.featuredQuestion}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.featuredAnswer}</p>
            </div>
          </div>

          <div ref={rightRef}>
            <Accordion type="single" collapsible className="divide-y divide-border/70">
              {content.items.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border-0 px-1 transition-colors duration-150">
                  <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-4">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
