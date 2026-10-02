import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RetryButtonProps {
  onRetry: () => void;
  retrying?: boolean;
  disabled?: boolean;
  className?: string;
}

const RetryButton = ({ onRetry, retrying = false, disabled = false, className }: RetryButtonProps) => (
  <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={disabled || retrying} loading={retrying} loadingLabel="Retrying…" className={cn("shrink-0 gap-2 rounded-lg", className)}>
    <RefreshCw className="size-4" />Try again
  </Button>
);

export default RetryButton;
