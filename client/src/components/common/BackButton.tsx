import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  onBack: () => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function BackButton({ onBack, label = "Back", className, disabled }: BackButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onBack}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={cn("group/back mb-3", className, "size-11 shrink-0 justify-center rounded-lg border border-border/80 p-0 sm:size-9 [&_svg]:size-4")}
    >
      <ArrowLeft aria-hidden="true" className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover/back:-translate-x-0.5 motion-safe:group-focus-visible/back:-translate-x-0.5 motion-safe:group-active/back:-translate-x-1" />
    </Button>
  );
}
