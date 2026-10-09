import { ArrowUpRight, Clock, Mail, MapPin, Phone } from "lucide-react";
import { CONTENT, type ContactContent } from "../landingContent";
import "./ContactSection.css";

const contactLinkClass = "landing-contact-link flex min-w-0 items-start gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5";

export default function ContactSection({ content = CONTENT.contact }: { content?: ContactContent }) {
  return (
    <section id="contact" aria-labelledby="contact-heading" className="landing-contact bg-background py-12 sm:py-16">
      <div className="container">
        <div className="landing-contact-panel grid items-center gap-6 rounded-2xl border border-primary/20 bg-card p-5 sm:p-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10 lg:p-10">
          <div className="min-w-0">
            <p className="mb-4 flex items-center gap-3 text-xs font-semibold tracking-wide text-forest dark:text-accent-foreground">
              <span aria-hidden="true" className="h-px w-8 bg-primary/60" />{content.sectionLabel}
            </p>
            <h2 id="contact-heading" className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">{content.heading}</h2>
            <p className="mt-4 max-w-md text-pretty text-sm leading-6 text-muted-foreground sm:text-base">{content.description}</p>
            <p className="mt-5 max-w-xs border-l-2 border-primary/30 pl-3 text-xs leading-5 text-muted-foreground">{content.officeName}</p>
          </div>

          <address className="min-w-0 overflow-hidden rounded-xl border border-border bg-card/95 not-italic">
            <div className="grid divide-y divide-border border-b border-border sm:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)] sm:divide-x sm:divide-y-0">
              <a href={content.phoneHref} className={contactLinkClass}>
                <Phone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-accent-foreground" strokeWidth={1.8} />
                <span className="min-w-0"><span className="block text-xs text-muted-foreground">Call MENRO</span><span className="mt-1 block text-sm font-semibold text-foreground">{content.phone}</span></span>
              </a>
              <a href={`mailto:${content.email}`} className={contactLinkClass}>
                <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-accent-foreground" strokeWidth={1.8} />
                <span className="min-w-0"><span className="block text-xs text-muted-foreground">Email</span><span className="mt-1 block break-all text-sm font-semibold text-foreground">{content.email}</span></span>
              </a>
            </div>
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-accent-foreground" strokeWidth={1.8} />
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Visit the MENRO Office</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{content.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 border-t border-border bg-primary/[0.03] px-4 py-3 sm:px-5">
              <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-accent-foreground" strokeWidth={1.8} />
              <div className="min-w-0 text-xs leading-5">
                <p className="text-muted-foreground">{content.hours}</p>
                <a href={content.website} target="_blank" rel="noopener noreferrer" className="landing-text-link mt-1 inline-flex min-h-11 items-center gap-1 rounded-sm font-medium text-primary underline decoration-primary/35 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-accent-foreground">Municipal Website <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></a>
              </div>
            </div>
          </address>
        </div>
      </div>
    </section>
  );
}
