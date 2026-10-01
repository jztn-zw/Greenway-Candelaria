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
      <div className="w-full max-w-[560px] px-5 py-6 text-center sm:px-8 sm:py-8">
        <div aria-hidden="true" className="mx-auto mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-6" strokeWidth={1.75} />
        </div>

        <p className={kind === "not-found"
          ? "relative font-body text-3xl font-semibold tracking-tight text-primary"
          : "relative text-xs font-semibold uppercase tracking-[0.16em] text-primary"}>
          {details.eyebrow}
        </p>
        <h1 className="gw-page-title relative mt-3 text-balance tracking-tight text-foreground sm:text-ui-page-lg">
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
