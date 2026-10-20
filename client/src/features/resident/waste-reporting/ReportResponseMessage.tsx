interface ReportResponseMessageProps {
  message: string;
  className?: string;
}

/** Keep the review reason visible in existing and newly received responses. */
export function ReportResponseMessage({ message, className }: ReportResponseMessageProps) {
  const reasonMarker = "Review reason:";
  const markerIndex = message.indexOf(reasonMarker);
  if (markerIndex < 0) return <p className={className}>{message}</p>;

  const status = message.slice(0, markerIndex).trim();
  const review = message.slice(markerIndex + reasonMarker.length).trim();
  const nextStepMarker = "If the issue still needs attention,";
  const nextStepIndex = review.indexOf(nextStepMarker);
  const reason = (nextStepIndex < 0 ? review : review.slice(0, nextStepIndex)).trim();
  const nextSteps = nextStepIndex < 0 ? "" : review.slice(nextStepIndex).trim();
  if (!reason) return <p className={className}>{message}</p>;

  return <div className={`space-y-3 ${className ?? ""}`}>
    {status && <p>{status}</p>}
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
      <p className="text-ui-caption font-semibold text-foreground">Review Reason</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-foreground">{reason}</p>
    </div>
    {nextSteps && <p>{nextSteps}</p>}
  </div>;
}
