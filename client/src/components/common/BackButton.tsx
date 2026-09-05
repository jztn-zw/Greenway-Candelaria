import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BackButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Optional text label to display beside the arrow. Defaults to "Back". */
  label?: string;
  /** Optional custom icon component to replace ArrowLeft. */
  icon?: React.ElementType;
  /** Visual variant: "default" (neutral muted) or "primary" (accent highlight on hover). */
  variant?: "default" | "primary";
}

export const BackButton = React.forwardRef<HTMLButtonElement, BackButtonProps>(
  (
    {
      label = "Back",
      children,
      icon: Icon = ArrowLeft,
      variant = "default",
      type = "button",
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 group",
          variant === "default" &&
            "bg-muted/60 dark:bg-muted/40 hover:bg-muted hover:dark:bg-muted/70 border border-border/70 hover:border-border text-muted-foreground hover:text-foreground shadow-2xs hover:shadow-xs",
          variant === "primary" &&
            "bg-muted/70 dark:bg-muted/50 hover:bg-primary/10 border border-border/70 hover:border-primary/30 text-muted-foreground hover:text-primary shadow-2xs",
          className
        )}
        {...props}
      >
        <Icon className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform duration-200 ease-out text-muted-foreground group-hover:text-foreground shrink-0" />
        <span>{children ?? label}</span>
      </button>
    );
  }
);

BackButton.displayName = "BackButton";
export default BackButton;
