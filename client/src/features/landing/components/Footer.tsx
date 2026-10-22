import GreenWayLogo from "@/components/common/GreenWayLogo";
import { ArrowRight, Leaf, Mail, MapPin, Phone } from "lucide-react";
import { CONTENT, type ContactContent, type FooterContent } from "../landingContent";
import "./Footer.css";

interface FooterProps {
  content?: FooterContent;
  contactContent?: ContactContent;
}

const footerLinkClass = "landing-footer-link inline-flex min-h-11 items-center rounded-sm text-sm text-canopy-foreground/80 transition-colors underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-canopy";

export default function Footer({ content = CONTENT.footer, contactContent = CONTENT.contact }: FooterProps) {
  return (
    <footer className="landing-footer relative isolate overflow-hidden bg-canopy text-canopy-foreground">
      <Leaf aria-hidden="true" className="landing-footer-leaf pointer-events-none absolute -bottom-14 -right-10 -z-10 h-72 w-72 rotate-[-20deg] text-canopy-foreground/[0.045] sm:right-4" strokeWidth={0.7} />
      <div className="container grid gap-8 pb-8 pt-10 sm:grid-cols-2 sm:gap-10 sm:pt-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.7fr)_minmax(0,1.15fr)] lg:gap-12">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="mb-4 text-xs font-medium tracking-wide text-canopy-foreground/75">MENRO Candelaria, Quezon</p>
          <a href="#home" aria-label="GreenWay Home" className="inline-flex items-center gap-3 rounded-lg font-display text-3xl font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy-foreground sm:text-4xl">
            <span className="landing-footer-logo flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-canopy-foreground/95"><GreenWayLogo alt="" className="size-9 text-canopy" /></span>GreenWay
          </a>
          <p className="mt-4 max-w-xs text-pretty text-sm leading-6 text-canopy-foreground/80">{content.tagline}</p>
        </div>

        <nav aria-label="Footer Navigation" className="lg:pt-1">
          <h2 className="mb-3 text-sm font-semibold">Explore GreenWay</h2>
          <ul className="grid grid-cols-2 gap-x-5 sm:grid-cols-1">
            {content.links.map(link => <li key={link.href}><a href={link.href} className={`${footerLinkClass} landing-footer-nav-link group gap-2`}>{link.label}<ArrowRight aria-hidden="true" className="landing-footer-link-arrow h-3.5 w-3.5 shrink-0 -translate-x-1 opacity-0 transition-[transform,opacity] duration-200 group-focus-visible:translate-x-0 group-focus-visible:opacity-75" /></a></li>)}
          </ul>
        </nav>

        <div className="min-w-0 border-t border-canopy-foreground/15 pt-6 sm:border-t-0 sm:pt-0 lg:border-l lg:pl-8 lg:pt-1">
          <h2 className="mb-4 text-sm font-semibold">Reach MENRO</h2>
          <address className="not-italic">
            <div className="flex items-start gap-3 text-sm leading-6 text-canopy-foreground/80">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canopy-foreground/[0.07]"><MapPin aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} /></span>
              <p className="text-pretty">{contactContent.address}</p>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canopy-foreground/[0.07]"><Phone aria-hidden="true" className="h-4 w-4 text-canopy-foreground/80" strokeWidth={1.8} /></span>
              <a href={contactContent.phoneHref} className={footerLinkClass}>{contactContent.phone}</a>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canopy-foreground/[0.07]"><Mail aria-hidden="true" className="h-4 w-4 text-canopy-foreground/80" strokeWidth={1.8} /></span>
              <a href={`mailto:${contactContent.email}`} className={`${footerLinkClass} min-w-0 break-all`}>{contactContent.email}</a>
            </div>
          </address>
        </div>
      </div>

      <div className="container">
        <div aria-hidden="true" className="landing-footer-divider h-px" />
        <div className="flex flex-col gap-2 py-5 text-xs leading-5 text-canopy-foreground/75 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p>{content.copyright}</p>
          <p>{content.bottomTagline}</p>
        </div>
      </div>
    </footer>
  );
}
