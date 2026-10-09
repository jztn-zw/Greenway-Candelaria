import { MessageCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CONTENT, type FAQContent } from "../landingContent";
import "./FAQSection.css";

export default function FAQSection({ content = CONTENT.faq }: { content?: FAQContent }) {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="landing-faq relative isolate overflow-hidden bg-background py-12 sm:py-16">
      <div className="container grid items-start gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12 xl:gap-16">
        <div className="min-w-0">
          <p className="mb-4 flex items-center gap-3 text-xs font-semibold tracking-wide text-forest dark:text-accent-foreground">
            <span aria-hidden="true" className="h-px w-8 bg-primary/60" />{content.sectionLabel}
          </p>
          <h2 id="faq-heading" className="max-w-md text-balance font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">{content.heading}</h2>
          <p className="mt-4 max-w-md text-pretty text-sm leading-6 text-muted-foreground sm:text-base">{content.subtitle}</p>

          <aside className="landing-faq-note mt-6 rounded-xl border border-primary/20 bg-card p-5 sm:p-6">
            <p className="mb-3 text-xs font-semibold text-forest dark:text-accent-foreground">Good to Know</p>
            <h3 className="text-base font-semibold leading-6 text-foreground">{content.featuredQuestion}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{content.featuredAnswer}</p>
          </aside>

        </div>

        <div className="landing-faq-answers overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2.5 border-b border-border px-5 py-4 sm:px-6">
            <MessageCircle aria-hidden="true" className="h-4 w-4 text-primary dark:text-accent-foreground" strokeWidth={1.8} />
            <p className="text-xs font-semibold text-foreground">Using GreenWay</p>
          </div>
          <Accordion type="single" collapsible>
            {content.items.map((item, index) => (
              <AccordionItem key={item.id} value={item.id} className="landing-faq-item border-border/70 px-4 last:border-b-0 sm:px-6">
                <AccordionTrigger className="gap-4 rounded-lg py-5 text-left text-sm font-semibold leading-6 text-foreground hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&>svg]:text-primary dark:[&>svg]:text-accent-foreground">
                  <span className="flex items-baseline gap-3">
                    <span aria-hidden="true" className="hidden shrink-0 text-xs font-medium tabular-nums text-muted-foreground sm:inline">{String(index + 1).padStart(2, "0")}</span>
                    {item.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pr-5 text-sm leading-6 text-muted-foreground sm:pl-7">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
