import { Textarea } from "@/components/ui/textarea";
import { QUICK_CHIPS, VIOLATION_OPTIONS, type ViolationType } from "./types";

interface DescriptionSectionProps {
  value: string;
  onChange: (value: string) => void;
  violationType?: ViolationType | null;
}

const DescriptionSection = ({ value, onChange, violationType }: DescriptionSectionProps) => {
  const violation = VIOLATION_OPTIONS.find((option) => option.value === violationType);
  const prompts = violationType === "missed-collection"
    ? ["What was the scheduled collection day?", "Which street or landmark was affected?", "How many households are affected?"]
    : violationType === "open-burning"
      ? ["When did you observe the burning?", "Is smoke affecting nearby homes?", "Describe the exact location."]
      : QUICK_CHIPS;
  const handleChipClick = (chip: string) => {
    const separator = value.trim() ? "\n\n" : "";
    onChange(value + separator + chip + " ");
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Description</h3>

      <div className="flex flex-wrap gap-2">
        {prompts.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleChipClick(chip)}
            className="text-xs px-3.5 py-2 rounded-xl border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all duration-200 font-medium"
          >
            {chip}
          </button>
        ))}
      </div>

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={violation ? `Describe the ${violation.label.toLowerCase()}, where it is, and when you observed it.` : "Describe what you observed, when it happened, and how severe it is."}
        className="min-h-[140px] resize-none rounded-xl"
        maxLength={2000}
      />
      <p className="text-xs text-muted-foreground text-right">{value.length}/2000</p>
    </div>
  );
};

export default DescriptionSection;
