import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, FileSearch2, RefreshCw, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";

type PageErrorKind = "not-found" | "unavailable" | "unexpected";

interface PageErrorStateProps {
  kind: PageErrorKind;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
  homeHref?: string;
  homeLabel?: string;
  fullScreen?: boolean;
}

const copy = {
  "not-found": {
    eyebrow: "404",
    title: "Page not found",
    description: "The address may have changed, or the page may no longer exist.",
    icon: FileSearch2,
  },
  unavailable: {
    eyebrow: "Unable to load",
    title: "This page couldn't load",
    description: "We couldn't get the information right now. Please try again.",
    icon: WifiOff,
  },
  unexpected: {
    eyebrow: "Page error",
    title: "Something went wrong",
    description: "This page ran into a problem. Try opening it again.",
    icon: AlertTriangle,
  },
} as const;

const PageErrorState = ({
  kind,
  title,
  description,
  onRetry,
  retrying = false,
  homeHref,
  homeLabel = "Go to dashboard",
  fullScreen = false,
}: PageErrorStateProps) => {
  const details = copy[kind];
  const Icon = details.icon;

  return (
    <section
      role={fullScreen ? "main" : kind === "not-found" ? undefined : "alert"}
      className={`mx-auto flex w-full max-w-[1600px] items-center justify-center px-3 py-8 sm:px-6 ${fullScreen ? "min-h-dvh bg-background" : "min-h-[65vh]"}`}
    >
      <div className="relative w-full max-w-[560px] overflow-hidden rounded-3xl border border-border/80 bg-card px-6 pb-9 pt-10 text-center shadow-2xs sm:px-10 sm:pb-11 sm:pt-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/[0.08] to-transparent" />

        <div aria-hidden="true" className="relative mx-auto mb-7 flex h-36 w-44 items-center justify-center sm:h-40 sm:w-48">
          <div className="absolute bottom-2 h-6 w-36 rounded-full bg-primary/10 blur-xl" />
          <div className="absolute left-3 top-3 h-24 w-28 -rotate-12 rounded-2xl border border-border/60 bg-muted/50" />
          <div className="absolute right-2 top-6 h-24 w-28 rotate-9 rounded-2xl border border-border/60 bg-muted/70" />
          <div className="relative flex h-28 w-32 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card shadow-md shadow-primary/5 sm:h-32 sm:w-36">
            <span className="absolute left-4 top-4 h-1.5 w-12 rounded-full bg-primary/20" />
            <span className="absolute right-4 top-4 h-1.5 w-4 rounded-full bg-muted" />
            <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary sm:size-16">
              <Icon className="size-7 sm:size-8" strokeWidth={1.75} />
            </span>
            <span className="h-1.5 w-16 rounded-full bg-muted" />
          </div>
        </div>

        <p className={kind === "not-found"
          ? "relative font-display text-3xl font-extrabold tracking-tight text-primary"
          : "relative text-xs font-bold uppercase tracking-[0.16em] text-primary"}>
          {details.eyebrow}
        </p>
        <h1 className="relative mt-3 text-balance font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {title ?? details.title}
        </h1>
        <p className="relative mx-auto mt-3 max-w-sm text-pretty text-sm leading-6 text-muted-foreground">
          {description ?? details.description}
        </p>

        <div className="relative mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          {onRetry && (
            <Button type="button" onClick={onRetry} disabled={retrying} className="h-10 w-full gap-2 rounded-xl px-5 font-semibold sm:w-auto">
              <RefreshCw className={`size-4 ${retrying ? "animate-spin" : ""}`} />
              {retrying ? "Trying again…" : "Try again"}
            </Button>
          )}
          {homeHref && (
            <Button asChild variant={onRetry ? "outline" : "default"} className="h-10 w-full gap-2 rounded-xl px-5 font-semibold sm:w-auto">
              <Link to={homeHref}><ArrowLeft className="size-4" />{homeLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};

export default PageErrorState;
