import { useContext } from "react";
import { PageRetryContext } from "./pageRetryContext";
import RetryButton from "./RetryButton";
import { cn } from "@/lib/utils";

interface DataRefreshNoticeProps {
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
  primary?: boolean;
  role?: "status" | "alert";
  className?: string;
  disabled?: boolean;
}

const DataRefreshNotice = ({
  message = "Couldn't refresh this information. Showing the last loaded data, which may be outdated.",
  onRetry,
  retrying = false,
  primary = false,
  role = "status",
  className,
  disabled = false,
}: DataRefreshNoticeProps) => {
  const pageOwnsRetry = useContext(PageRetryContext);
  if (pageOwnsRetry && !primary) return null;
  return (
  <div role={role} className={cn("flex flex-col gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between", className)}>
    <p className="text-muted-foreground">{message}</p>
    <RetryButton onRetry={onRetry} retrying={retrying} disabled={disabled} />
  </div>
  );
};

export default DataRefreshNotice;
