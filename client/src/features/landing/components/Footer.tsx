import GreenWayLogo from "@/components/common/GreenWayLogo";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { CONTENT, type FooterContent } from "../landingContent";
import "./Footer.css";

interface FooterProps {
  content?: FooterContent;
}

const footerLinkClass = "landing-footer-link inline-flex min-h-11 items-center rounded-sm text-sm text-canopy-foreground/80 transition-colors underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-canopy";

export default function Footer({ content = CONTENT.footer }: FooterProps) {
  return (
    <footer className="landing-footer relative isolate overflow-hidden bg-canopy text-canopy-foreground">
      <div className="container grid min-w-0 gap-7 py-8 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,0.65fr)] sm:gap-12 sm:py-10 lg:gap-24">
        <div className="min-w-0">
          <a href="#home" aria-label="GreenWay Home" className="inline-flex max-w-full items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy-foreground focus-visible:ring-offset-4 focus-visible:ring-offset-canopy">
            <GreenWayLogo alt="" className="h-10 w-14 text-canopy-foreground" />
            <GreenWayLogo variant="wordmark" alt="" className="h-6 w-40 text-canopy-foreground sm:h-7 sm:w-48" />
          </a>
          <p className="mt-3 text-xs font-medium tracking-wide text-canopy-foreground/75">MENRO · Candelaria, Quezon</p>
          <p className="mt-3 max-w-sm text-pretty text-sm leading-6 text-canopy-foreground/80">{content.tagline}</p>
        </div>

        <nav aria-label="Footer Navigation" className="min-w-0 border-t border-canopy-foreground/15 pt-5 sm:border-t-0 sm:pt-1">
          <h2 className="mb-2 text-sm font-semibold">Explore GreenWay</h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
            {content.links.map(link => <li key={link.href}><a href={link.href} className={`${footerLinkClass} landing-footer-nav-link group gap-2`}>{link.label}<ArrowRight aria-hidden="true" className="landing-footer-link-arrow h-3.5 w-3.5 shrink-0 -translate-x-1 opacity-0 transition-[transform,opacity] duration-200 group-focus-visible:translate-x-0 group-focus-visible:opacity-75" /></a></li>)}
          </ul>
        </nav>

      </div>

      <div className="container">
        <div aria-hidden="true" className="landing-footer-divider h-px" />
        <div className="flex flex-col gap-1 pb-4 pt-3 text-xs leading-5 text-canopy-foreground/75 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p>{content.copyright}</p>
          <a href={`${import.meta.env.BASE_URL}media/greenway-resident-demo-v9-credits.html`} target="_blank" rel="noopener noreferrer"
            className={`${footerLinkClass} gap-1 text-xs`}>Video Credits <ArrowUpRight aria-hidden="true" className="size-3.5" /></a>
        </div>
      </div>
    </footer>
  );
}
