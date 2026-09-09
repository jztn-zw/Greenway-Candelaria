import React from "react";
import { Check, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FormProgressSidebarProps {
  violationTypeSelected: boolean;
  barangaySelected: boolean;
  descriptionFilled: boolean;
  photosAdded: boolean;
}

const steps = [
  { key: "violationType", label: "Violation Type", required: true },
  { key: "barangay", label: "Barangay", required: true },
  { key: "description", label: "Description", required: true },
  { key: "photos", label: "Photos", required: true },
];

const FormProgressSidebar: React.FC<FormProgressSidebarProps> = ({
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

  return (
    <div className="space-y-4">
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-foreground">
            Form Progress
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {requiredCompleted} of 4 required steps completed
          </p>
          {/* Progress bar */}
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {steps.map((step) => {
            const done = statuses[step.key];
            return (
              <div key={step.key} className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
                    done
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border-2 border-border text-transparent",
                  )}
                >
                  {done && <Check className="w-3 h-3" />}
                </div>
                <span
                  className={cn(
                    "text-xs transition-colors",
                    done ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Info Callout */}
      <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 text-xs text-muted-foreground space-y-1.5">
        <p className="font-semibold text-foreground flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-primary" />
          Tip for Fast Resolution
        </p>
        <p className="leading-relaxed">
          Clear photos with nearby landmarks help MENRO inspection officers locate and resolve reports quickly.
        </p>
      </div>
    </div>
  );
};

export default FormProgressSidebar;
