import { Check, RotateCcw } from "lucide-react";
import { VIOLATION_OPTIONS, type ViolationType } from "./types";
import { cn } from "@/lib/utils";

interface ViolationTypeSelectorProps {
  value: ViolationType | null;
  onChange: (value: ViolationType) => void;
  showError?: boolean;
  onClearDraft?: () => void;
}

const ViolationTypeSelector = ({ value, onChange, showError = false, onClearDraft }: ViolationTypeSelectorProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold font-display text-foreground tracking-tight">
            Type of Violation
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Select the category that best matches the observed issue.
          </p>
        </div>
        {onClearDraft && (
          <button
            type="button"
            onClick={onClearDraft}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border/80 px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive sm:hidden"
          >
            <RotateCcw className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {VIOLATION_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-2.5 p-3.5 sm:p-4 rounded-xl border text-center transition-all duration-150 cursor-pointer select-none touch-manipulation active:scale-[0.98]",
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-2xs ring-1 ring-primary/25"
                  : showError
                    ? "border-destructive/60 bg-destructive/5 text-muted-foreground hover:border-destructive"
                    : "border-border/80 bg-card/60 hover:bg-muted/50 hover:border-border text-muted-foreground hover:text-foreground shadow-2xs"
              )}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xs animate-in zoom-in-75">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}

              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
                )}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
              </div>

              <span
                className={cn(
                  "text-xs leading-tight transition-colors",
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
        <p className="text-[11px] font-medium text-destructive">
          Please select a violation category.
        </p>
      )}
    </div>
  );
};

export default ViolationTypeSelector;
