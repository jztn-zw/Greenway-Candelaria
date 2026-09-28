import { useEffect, useId, useState, type FormEvent } from "react";
import { Loader2, Truck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { CollectorModalHeader } from "./CollectorModal";
import { collectorModalStyles as styles } from "./collectorModalStyles";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";

export interface TruckBreakdownReport {
  category: string;
  description: string;
  urgent: boolean;
}

interface TruckBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  truckName?: string | null;
  truckPlate?: string | null;
  onSubmit: (report: TruckBreakdownReport) => Promise<unknown>;
}

const categories = [
  { value: "Flat Tire", label: "Flat tire or puncture" },
  { value: "Engine Problem", label: "Engine problem or overheating" },
  { value: "Hydraulic Compactor Fault", label: "Hydraulic compactor fault" },
  { value: "Brake System Issue", label: "Brake or steering issue" },
  { value: "Fuel / Fluid Leak", label: "Fuel or fluid leak" },
  { value: "Battery / Electrical", label: "Battery or electrical failure" },
  { value: "Road Accident", label: "Road accident or collision" },
  { value: "Other Issue", label: "Other mechanical issue" },
] as const;

const descriptionLimit = 140;
const validateDescription = (value: string) => {
  const details = value.trim();
  if (!details) return "Describe the issue and where the truck is stopped.";
  if (details.length > descriptionLimit) return `Keep the issue details and location within ${descriptionLimit} characters.`;
  return "";
};

const TruckBreakdownDialog = ({
  open,
  onOpenChange,
  truckName,
  truckPlate,
  onSubmit,
}: TruckBreakdownDialogProps) => {
  const descriptionId = useId();
  const categoryId = useId();
  const [category, setCategory] = useState<string>(categories[0].value);
  const [description, setDescription] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [descriptionError, setDescriptionError] = useState("");
  const [submissionError, setSubmissionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  useEffect(() => {
    if (!open) {
      setCategory(categories[0].value);
      setDescription("");
      setUrgent(false);
      setDescriptionError("");
      setSubmissionError("");
      setShowDiscard(false);
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (submitting) return;
    if (!nextOpen && (description || urgent || category !== categories[0].value)) setShowDiscard(true);
    else onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const details = description.trim();
    const validationError = validateDescription(description);
    setDescriptionError(validationError);
    setSubmissionError("");
    if (validationError) {
      document.getElementById(descriptionId)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ category, description: details, urgent });
      toast.success("Breakdown report sent to MENRO dispatch");
      onOpenChange(false);
    } catch {
      setSubmissionError("The report could not be sent. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`${styles.content} sm:max-w-lg`}>
        <CollectorModalHeader title="Report truck breakdown" description="Share the issue and your location" icon={<Wrench />} onClose={() => handleOpenChange(false)} disabled={submitting} closeLabel="Close breakdown report" />

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className={styles.body}>
            <div className="flex items-center gap-3 rounded-md border border-border/70 bg-muted/25 px-3.5 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
                <Truck className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground">Assigned vehicle</p>
                <p className="truncate text-sm font-semibold text-foreground">{truckName || "Assigned truck"}</p>
              </div>
              {truckPlate && <span className="max-w-[42%] truncate rounded-md bg-background px-2 py-1 font-mono text-xs font-semibold text-foreground">{truckPlate}</span>}
            </div>

            <div className="space-y-1.5">
              <label className={`block ${styles.label}`} htmlFor={categoryId}>Issue category</label>
              <Select value={category} onValueChange={setCategory} disabled={submitting}>
                <SelectTrigger id={categoryId} className={styles.select}>
                  <SelectValue placeholder="Select an issue" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((item) => <SelectItem key={item.value} value={item.value} className="text-xs">{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <label className={styles.label} htmlFor={descriptionId}>Issue details and location</label>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{description.length}/{descriptionLimit}</span>
              </div>
              <Textarea
                id={descriptionId}
                value={description}
                onChange={(event) => {
                  const value = event.target.value;
                  setDescription(value);
                  if (descriptionError) setDescriptionError(validateDescription(value));
                }}
                maxLength={descriptionLimit}
                rows={4}
                disabled={submitting}
                aria-required="true"
                aria-invalid={Boolean(descriptionError)}
                aria-describedby={descriptionError ? `${descriptionId}-error` : `${descriptionId}-hint`}
                aria-errormessage={descriptionError ? `${descriptionId}-error` : undefined}
                placeholder="Describe the problem and your current location, such as near the Malabanban Norte chapel."
                className={`${styles.textarea} ${descriptionError ? "border-destructive hover:border-destructive focus-visible:border-destructive" : ""}`}
              />
              {descriptionError ? <p id={`${descriptionId}-error`} role="alert" className="text-xs text-destructive">{descriptionError}</p> : <p id={`${descriptionId}-hint`} className="text-xs text-muted-foreground">Include a nearby landmark so dispatch can locate the truck.</p>}
            </div>

            <label className={`flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-colors focus-within:ring-2 focus-within:ring-ring ${urgent ? "border-destructive/35 bg-destructive/5" : "border-border/70 bg-muted/20 hover:bg-muted/35"}`}>
              <input type="checkbox" checked={urgent} onChange={(event) => setUrgent(event.target.checked)} disabled={submitting} className="mt-0.5 size-4 shrink-0 accent-destructive disabled:cursor-not-allowed" />
              <span className="min-w-0">
                <span className={`block ${styles.label}`}>Critical road hazard</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">Select if the truck is immobilized or blocking traffic.</span>
              </span>
            </label>
            {submissionError && <p role="alert" className="text-xs text-destructive">{submissionError}</p>}
          </div>

          <div className={styles.footer}>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting} className={styles.cancelButton}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={submitting} className={styles.primaryButton}>
              {submitting ? <><Loader2 className="size-3.5 animate-spin" /> Sending...</> : "Send report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    <UnsavedChangesDialog isOpen={open && showDiscard} onClose={() => setShowDiscard(false)}
      onDiscard={() => { setShowDiscard(false); onOpenChange(false); }}
      title="Discard Breakdown Report?" description="Your unsent breakdown details will be lost."
      discardLabel="Discard Report" isSaving={submitting} />
    </>
  );
};

export default TruckBreakdownDialog;
