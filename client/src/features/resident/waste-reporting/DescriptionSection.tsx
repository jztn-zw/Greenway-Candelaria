import { Textarea } from "@/components/ui/textarea";
import { VIOLATION_OPTIONS, type ViolationType } from "./types";
import { getReportPrompts } from "./reportDescription";

interface DescriptionSectionProps {
  value: string;
  onChange: (value: string) => void;
  violationType?: ViolationType | null;
  showError?: boolean;
}

const DescriptionSection = ({ value, onChange, violationType, showError = false }: DescriptionSectionProps) => {
  const violation = VIOLATION_OPTIONS.find((option) => option.value === violationType);
  const prompts = getReportPrompts(violationType);
  const handleChipClick = (chip: string) => {
    if (value.includes(chip)) return;
    const separator = value.trim() ? "\n\n" : "";
    onChange(value + separator + chip + " ");
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="gw-heading text-sm text-foreground tracking-tight">
          Incident Description
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Provide specific details about what you observed.
        </p>
      </div>

      <div>
        <p className="text-ui-caption font-semibold text-muted-foreground/80 mb-1.5 uppercase tracking-wider">
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
                className={`text-ui-caption px-2.5 py-1 rounded-lg border transition-all font-medium shadow-2xs ${
                  isAdded
                    ? "bg-primary/10 border-primary/30 text-primary font-semibold cursor-default opacity-85"
                    : "gw-action-ghost cursor-pointer"
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
          aria-invalid={showError}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            violation
              ? `Describe the ${violation.label.toLowerCase()}, exact location details, and when you observed it.`
              : "Describe what you observed, when it happened, and its severity."
          }
          className={`min-h-[120px] resize-none rounded-xl text-xs lg:text-sm leading-relaxed p-3 ${
            showError
              ? "border-destructive/80 focus-visible:ring-destructive/25"
              : "border-border/80 hover:border-border focus-visible:ring-primary/20 focus-visible:border-primary"
          }`}
          maxLength={2000}
        />

        {showError && (
          <p role="alert" className="px-0.5 text-ui-caption font-medium text-destructive">
            Please describe the incident in at least 10 characters. Suggested questions do not count.
          </p>
        )}
      </div>
    </div>
  );
};

export default DescriptionSection;

