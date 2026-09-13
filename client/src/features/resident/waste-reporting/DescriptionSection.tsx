import { Textarea } from "@/components/ui/textarea";
import { QUICK_CHIPS, VIOLATION_OPTIONS, type ViolationType } from "./types";

interface DescriptionSectionProps {
  value: string;
  onChange: (value: string) => void;
  violationType?: ViolationType | null;
  showError?: boolean;
}

const DescriptionSection = ({ value, onChange, violationType, showError = false }: DescriptionSectionProps) => {
  const violation = VIOLATION_OPTIONS.find((option) => option.value === violationType);
  const prompts = violationType === "missed-collection"
    ? ["What was the scheduled collection day?", "Which street or landmark was affected?", "How many households are affected?"]
    : violationType === "open-burning"
      ? ["When did you observe the burning?", "Is smoke affecting nearby homes?", "Describe the exact location."]
      : QUICK_CHIPS;
  const handleChipClick = (chip: string) => {
    if (value.includes(chip)) return;
    const separator = value.trim() ? "\n\n" : "";
    onChange(value + separator + chip + " ");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold font-display text-foreground tracking-tight">
            Incident Description
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Provide specific details about what you observed.
          </p>
        </div>

        <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
          {value.trim().length >= 10 ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ready</span>
          ) : (
            <span className="text-muted-foreground">{10 - value.trim().length} more chars needed</span>
          )}
        </span>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-muted-foreground/80 mb-1.5 uppercase tracking-wider">
          Suggested questions to answer
        </p>
        <div className="flex flex-wrap gap-1.5">
          {prompts.map((chip) => {
            const isAdded = value.includes(chip);
            return (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                disabled={isAdded}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all font-medium active:scale-95 shadow-2xs ${
                  isAdded
                    ? "bg-primary/10 border-primary/30 text-primary font-semibold cursor-default opacity-85"
                    : "border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-primary/5 hover:border-primary/30 cursor-pointer"
                }`}
              >
                {isAdded ? "✓" : "+"} {chip}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            violation
              ? `Describe the ${violation.label.toLowerCase()}, exact location details, and when you observed it.`
              : "Describe what you observed, when it happened, and its severity."
          }
          className={`min-h-[120px] resize-none rounded-xl text-xs sm:text-sm leading-relaxed p-3 ${
            showError
              ? "border-destructive/80 focus-visible:ring-destructive/25"
              : "border-border/80 hover:border-border focus-visible:ring-primary/20 focus-visible:border-primary"
          }`}
          maxLength={2000}
        />

        <div className="flex items-center justify-between text-[11px] px-0.5">
          {showError ? (
            <p className="font-medium text-destructive">Please enter at least 10 characters.</p>
          ) : (
            <p className="text-muted-foreground">Minimum 10 characters required</p>
          )}
          <span className="text-muted-foreground/70 font-mono tabular-nums">
            {value.length}/2000
          </span>
        </div>
      </div>
    </div>
  );
};

export default DescriptionSection;
