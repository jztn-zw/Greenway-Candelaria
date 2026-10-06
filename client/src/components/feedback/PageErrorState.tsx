import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, FileSearch2, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useContext } from "react";
import { PageRetryContext } from "./pageRetryContext";
import RetryButton from "./RetryButton";

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
  variant?: "page" | "section";
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
  variant = "page",
}: PageErrorStateProps) => {
  const details = copy[kind];
  const Icon = details.icon;
  const compact = variant === "section";
  const pageOwnsRetry = useContext(PageRetryContext);
  const showRetry = onRetry && (!compact || !pageOwnsRetry);
  const Heading = compact ? "h2" : "h1";

  return (
    <section
      role={fullScreen ? "main" : kind === "not-found" ? undefined : "alert"}
      className={`mx-auto flex w-full max-w-[1600px] items-center justify-center px-3 sm:px-6 ${compact ? "h-full min-h-[240px] rounded-2xl border border-border/80 bg-card py-5" : fullScreen ? "min-h-dvh bg-background py-8" : "min-h-[calc(100dvh-10rem)] py-8"}`}
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
        <Heading className={compact ? "gw-heading relative mt-3 text-balance text-lg tracking-tight text-foreground" : "gw-page-title relative mt-3 text-balance tracking-tight text-foreground sm:text-ui-page-lg"}>
          {title ?? details.title}
        </Heading>
        <p className="relative mx-auto mt-3 max-w-sm text-pretty text-sm leading-6 text-muted-foreground">
          {description ?? (compact && pageOwnsRetry ? "Use Try again above to reload this information." : details.description)}
        </p>

        {(showRetry || homeHref) && <div className="relative mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          {showRetry && (
            <RetryButton onRetry={onRetry} retrying={retrying} className="w-full sm:w-auto" />
          )}
          {homeHref && (
            <Button asChild variant={onRetry ? "outline" : "default"} size={showRetry ? "sm" : "default"} className="w-full gap-2 rounded-lg font-semibold sm:w-auto">
              <Link to={homeHref}><ArrowLeft className="size-4" />{homeLabel}</Link>
            </Button>
          )}
        </div>}
      </div>
    </section>
  );
};

export default PageErrorState;
