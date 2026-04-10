import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { HelpCircle } from "lucide-react";
import { DEFAULT_CONTENT, FAQContent } from "@/pages/admin/components/landingmanager/types";

interface FAQSectionProps {
  content?: FAQContent;
}

const FAQSection = ({ content = DEFAULT_CONTENT.faq }: FAQSectionProps) => {
  const leftRef = useScrollReveal();
  const rightRef = useScrollReveal({ rootMargin: "0px 0px -60px 0px" });

  return (
    <section id="faq" className="py-10 sm:py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none hidden sm:block">
        <div className="absolute top-20 left-0 w-60 h-60 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="container relative">
        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          <div ref={leftRef} className="space-y-4 sm:space-y-6">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <span className="w-8 h-px bg-primary" />
              {content.sectionLabel}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold whitespace-pre-line">{content.heading}</h2>
            <p className="text-muted-foreground">{content.subtitle}</p>

            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6 space-y-3 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <HelpCircle className="w-8 h-8 text-primary/10" />
              </div>
              <h4 className="font-display font-semibold text-sm pr-8">{content.featuredQuestion}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{content.featuredAnswer}</p>
            </div>
          </div>

          <div ref={rightRef}>
            <Accordion type="single" collapsible className="space-y-2">
              {content.items.map((item) => (
                <AccordionItem key={item.id} value={item.id} className="border border-border/60 rounded-xl px-4 bg-card hover:border-primary/20 transition-colors duration-300 data-[state=open]:border-primary/30 data-[state=open]:shadow-md data-[state=open]:shadow-primary/5">
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
