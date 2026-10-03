import { Check } from "lucide-react";
import { VIOLATION_OPTIONS, type ViolationType } from "./types";
import { cn } from "@/lib/utils";
import { reportStyles } from "./reportStyles";

interface ViolationTypeSelectorProps {
  value: ViolationType | null;
  onChange: (value: ViolationType) => void;
  showError?: boolean;
}

const ViolationTypeSelector = ({ value, onChange, showError = false }: ViolationTypeSelectorProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="gw-heading text-sm text-foreground tracking-tight">
            Type of Violation
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Select the category that best matches the observed issue.
          </p>
        </div>
      </div>

      <div className={reportStyles.categories} role="group" aria-label="Type of violation">
        {VIOLATION_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              className={cn(
                reportStyles.category,
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-2xs ring-1 ring-primary/25"
                  : showError
                    ? "border-destructive/60 bg-destructive/5 text-muted-foreground hover:border-destructive"
                    : "border-border/80 bg-card/60 hover:bg-[var(--button-neutral-hover)] hover:border-border text-muted-foreground hover:text-foreground shadow-2xs"
              )}
            >
              {isSelected && (
                <span className="absolute top-1 right-1 size-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center" aria-hidden="true">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}

              <div
                className={cn(
                  "size-8 shrink-0 rounded-lg flex items-center justify-center transition-colors duration-150",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
              </div>

              <span
                className={cn(
                  "min-w-0 break-words text-[11px] leading-snug transition-colors",
                  isSelected ? "font-bold text-foreground" : "font-medium text-muted-foreground group-hover:text-foreground"
                )}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      {showError && (
        <p className="text-ui-caption font-medium text-destructive">
          Please select a violation category.
        </p>
      )}
    </div>
  );
};

export default ViolationTypeSelector;

