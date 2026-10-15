import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Moon, ShieldCheck, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeMode } from "@/hooks/useThemeMode";
import { toggleThemeMode } from "@/lib/theme";
import { CONTENT } from "../landingContent";
import { LEGAL_DOCUMENTS, LEGAL_PREPARED_DATE, LEGAL_REVIEW_NOTE, type LegalDocumentId } from "./legalContent";
import "../LandingPage.css";

const linkClass = "rounded-sm text-primary underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function LegalPage({ policy }: { policy: LegalDocumentId }) {
  const document = LEGAL_DOCUMENTS[policy];
  const dark = useThemeMode() === "dark";
  const Icon = policy === "privacy" ? ShieldCheck : FileText;
  useEffect(() => {
    const previous = window.document.title;
    window.document.title = `${document.title} | GreenWay`;
    return () => { window.document.title = previous; };
  }, [document.title]);

  return (
    <div className="landing-page min-h-dvh">
      <a href="#legal-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3 focus:text-foreground">Skip to Document</a>
      <header className="border-b border-border/70 bg-card/80">
        <div className="container flex min-h-20 items-center justify-between gap-4 py-3">
          <Link to="/" className="flex items-center gap-2.5 rounded-lg font-display text-xl font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <img src="/greenway.svg" width={36} height={36} alt="" />GreenWay
          </Link>
          <div className="flex items-center gap-2 print:hidden">
            <Button type="button" variant="ghost" size="icon" onClick={toggleThemeMode} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>{dark ? <Sun /> : <Moon />}</Button>
            <Button asChild variant="outline" className="h-11"><Link to="/"><ArrowLeft aria-hidden="true" /><span className="hidden sm:inline">Back to </span>Home</Link></Button>
          </div>
        </div>
      </header>

      <main id="legal-content" className="container pb-12 pt-8 sm:pb-16 sm:pt-12">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Icon className="size-4" aria-hidden="true" />GreenWay Policies</div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{document.title}</h1>
          <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground">{document.description}</p>
          <p className="mt-4 text-xs text-muted-foreground">Review draft · Prepared {LEGAL_PREPARED_DATE}</p>
        </div>

        <aside aria-label="Document Review Status" className="my-7 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-warning-foreground">
          <p className="font-semibold">For MENRO Review</p>
          <p className="mt-1">{LEGAL_REVIEW_NOTE}</p>
        </aside>

        <nav aria-label="Policy Documents" className="mb-8 flex flex-wrap gap-2 print:hidden">
          {(["terms", "privacy"] as const).map(id => <Button key={id} asChild variant={id === policy ? "default" : "outline"} className="h-11"><Link to={`/${id}`} aria-current={id === policy ? "page" : undefined}>{LEGAL_DOCUMENTS[id].title}</Link></Button>)}
        </nav>

        <div className="grid items-start gap-7 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
          <nav aria-label="On This Page" className="rounded-xl border border-border/80 bg-card p-5 lg:sticky lg:top-6 print:hidden">
            <h2 className="text-sm font-semibold">On This Page</h2>
            <ol className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-1">
              {document.sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`} className="flex min-h-11 items-start gap-2 rounded-lg px-2 py-2.5 text-xs leading-5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="tabular-nums text-primary">{String(index + 1).padStart(2, "0")}</span>{section.title}</a></li>)}
            </ol>
          </nav>

          <article aria-label={document.title} className="min-w-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xs">
            <div className="landing-surface border-b border-border/70 p-5 sm:p-8">
              <h2 className="text-sm font-semibold text-primary">At a Glance</h2>
              <p className="mt-2 max-w-prose text-sm leading-7 text-muted-foreground">{document.summary}</p>
            </div>
            <div className="divide-y divide-border/60 px-5 sm:px-8">
              {document.sections.map((section, index) => <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-6 py-6 sm:py-8">
                <h2 id={`${section.id}-title`} className="flex items-baseline gap-3 font-display text-lg font-semibold tracking-tight sm:text-xl"><span aria-hidden="true" className="text-xs font-medium tabular-nums text-primary">{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
                  {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                  {section.points && <ul className="list-disc space-y-2 pl-5 marker:text-primary/60">{section.points.map(point => <li key={point} className="pl-1">{point}</li>)}</ul>}
                </div>
              </section>)}
              <section aria-labelledby="legal-contact-title" className="py-6 sm:py-8">
                <h2 id="legal-contact-title" className="font-display text-lg font-semibold">MENRO Service Contact</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">For municipal waste-service questions. The designated privacy contact is pending confirmation for deployment.</p>
                <address className="mt-3 space-y-1 text-sm not-italic leading-7 text-muted-foreground">
                  <p>{CONTENT.contact.officeName}</p><p>{CONTENT.contact.address}</p>
                  <p><a className={linkClass} href={`mailto:${CONTENT.contact.email}`}>{CONTENT.contact.email}</a></p>
                  <p><a className={linkClass} href={CONTENT.contact.phoneHref}>{CONTENT.contact.phone}</a> · {CONTENT.contact.hours}</p>
                </address>
                {policy === "privacy" && <div className="mt-5 border-t border-border/60 pt-4 text-xs leading-6 text-muted-foreground"><p className="font-semibold text-foreground">Philippine Privacy References</p><p><a href="https://privacy.gov.ph/data-privacy-act-/" target="_blank" rel="noopener noreferrer" className={linkClass}>Data Privacy Act of 2012</a> · <a href="https://privacy.gov.ph/the-right-to-be-informed/" target="_blank" rel="noopener noreferrer" className={linkClass}>NPC: Right to Be Informed</a></p></div>}
              </section>
            </div>
          </article>
        </div>
      </main>
      <footer className="border-t border-border/70 bg-card/60 py-5">
        <div className="container flex flex-wrap items-center justify-between gap-4 text-xs leading-6 text-muted-foreground"><p>GreenWay · Candelaria, Quezon</p><Link className={linkClass} to={policy === "terms" ? "/privacy" : "/terms"}>{policy === "terms" ? "Privacy Notice" : "Terms of Use"}</Link></div>
      </footer>
    </div>
  );
}
