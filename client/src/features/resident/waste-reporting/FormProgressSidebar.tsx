import React from "react";
import { Check, Lightbulb, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormProgressSidebarProps {
  violationTypeSelected: boolean;
  barangaySelected: boolean;
  descriptionFilled: boolean;
  photosAdded: boolean;
}

const steps = [
  { key: "violationType", label: "Violation Category", helper: "Select issue type" },
  { key: "barangay", label: "Barangay Location", helper: "Designate incident area" },
  { key: "description", label: "Detailed Description", helper: "Min. 10 characters" },
  { key: "photos", label: "Evidence Photos", helper: "At least 1 photo" },
];

export const FormProgressSidebar: React.FC<FormProgressSidebarProps> = ({
  violationTypeSelected,
  barangaySelected,
  descriptionFilled,
  photosAdded,
}) => {
  const statuses: Record<string, boolean> = {
    violationType: violationTypeSelected,
    barangay: barangaySelected,
    description: descriptionFilled,
    photos: photosAdded,
  };

  const requiredCompleted = [
    violationTypeSelected,
    barangaySelected,
    descriptionFilled,
    photosAdded,
  ].filter(Boolean).length;
  const progress = (requiredCompleted / 4) * 100;
  const isComplete = requiredCompleted === 4;

  return (
    <div className="space-y-4">
      {/* ── Checklist Card ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 lg:p-5 shadow-2xs space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold font-display text-foreground tracking-tight flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Submission Checklist
            </h4>
            <span className={cn(
              "text-[10px] font-bold px-2 py-0.5 rounded-full border leading-none",
              isComplete
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-muted text-muted-foreground border-border/70"
            )}>
              {requiredCompleted}/4
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground mt-1">
            {isComplete ? "All requirements complete" : `${4 - requiredCompleted} remaining requirements`}
          </p>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-muted/70 rounded-full overflow-hidden mt-3">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-400 ease-out",
                isComplete ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="space-y-2.5 pt-2 border-t border-border/60">
          {steps.map((step) => {
            const done = statuses[step.key];
            return (
              <div
                key={step.key}
                className={cn(
                  "flex items-center gap-2.5 p-2 rounded-xl transition-all",
                  done ? "bg-emerald-500/5 text-foreground" : "text-muted-foreground hover:bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all",
                    done
                      ? "bg-emerald-500 text-white shadow-2xs"
                      : "border border-border/90 bg-muted/40 text-transparent"
                  )}
                >
                  <Check className={cn("w-3 h-3 stroke-[3]", done ? "opacity-100" : "opacity-0")} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "text-xs leading-tight transition-colors",
                    done ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                  )}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 leading-none mt-0.5 truncate">
                    {step.helper}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tip Card ── */}
      <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 shadow-2xs space-y-1.5">
        <div className="flex items-center gap-1.5 text-foreground font-semibold text-xs">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Tip for Fast Resolution</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Clear photos showing nearby landmarks help MENRO field inspectors pinpoint and dispatch response units quickly.
        </p>
      </div>
    </div>
  );
};

export default FormProgressSidebar;

