import { VIOLATION_OPTIONS, type ViolationType } from "./types";
import { cn } from "@/lib/utils";

interface ViolationTypeSelectorProps {
  value: ViolationType | null;
  onChange: (value: ViolationType) => void;
}

const ViolationTypeSelector = ({ value, onChange }: ViolationTypeSelectorProps) => {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Type of Violation</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {VIOLATION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all duration-200 text-center group",
              value === option.value
                ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                : "border-border hover:border-primary/30 hover:bg-primary/[0.02] hover:shadow-sm"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              value === option.value ? "bg-primary/15" : "bg-muted group-hover:bg-primary/10"
            )}>
              <option.icon className={cn("w-5 h-5 transition-colors", value === option.value ? "text-primary" : "text-muted-foreground group-hover:text-primary/70")} />
            </div>
            <span className="text-xs font-medium text-foreground leading-tight">{option.label}</span>
          </button>
        ))}
      </div>
      {value ? (
        <p className="text-xs text-primary font-medium">
          ✓ {VIOLATION_OPTIONS.find(v => v.value === value)?.description}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Select a violation type above.</p>
      )}
    </div>
  );
};

export default ViolationTypeSelector;
