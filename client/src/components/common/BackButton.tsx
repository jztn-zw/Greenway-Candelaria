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
      disabled={disabled}
      className={cn("group/back mb-3 h-8 max-w-full justify-start gap-1.5 px-2 text-xs [&_svg]:size-3.5", className)}
    >
      <ArrowLeft aria-hidden="true" className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover/back:-translate-x-0.5 motion-safe:group-focus-visible/back:-translate-x-0.5 motion-safe:group-active/back:-translate-x-1" />
      <span className="min-w-0 truncate">Back</span>
    </Button>
  );
}
