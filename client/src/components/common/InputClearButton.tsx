import { forwardRef, type ComponentProps } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InputClearButtonProps = Omit<ComponentProps<typeof Button>, "children" | "variant" | "size" | "type" | "asChild" | "loading"> & {
  label?: string;
};

/** Shared clear control for search fields and other text inputs. */
export const InputClearButton = forwardRef<HTMLButtonElement, InputClearButtonProps>(({
  label = "Clear input", className, onKeyDown, ...props
}, ref) => (
  <Button
    ref={ref}
    type="button"
    variant="ghost"
    size="icon"
    title={label}
    aria-label={label}
    onKeyDown={(event) => {
      onKeyDown?.(event);
      // Clear without selecting an option in a surrounding command menu.
      if (event.key === "Enter" || event.key === " ") event.stopPropagation();
    }}
    className={cn(
      "absolute right-1.5 top-1/2 h-6 w-6 -translate-y-1/2 rounded p-0 text-muted-foreground [--action-hover:hsl(var(--foreground)/0.04)] [--action-active:hsl(var(--foreground)/0.06)] hover:text-foreground focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring/50 focus-visible:ring-offset-0 motion-reduce:transition-none [&_svg]:size-3",
      className,
    )}
    {...props}
  >
    <X aria-hidden="true" className="h-3 w-3" />
  </Button>
));
InputClearButton.displayName = "InputClearButton";
