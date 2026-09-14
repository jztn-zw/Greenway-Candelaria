import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Check, ArrowRight, Bell, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";

interface SuccessScreenProps {
  referenceNumber: string;
  onSubmitAnother: () => void;
}

const LIFECYCLE_STEPS = ["Submitted", "Under Review", "Dispatched", "Resolved"];

const SuccessScreen = ({ referenceNumber, onSubmitAnother }: SuccessScreenProps) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.querySelector("main")?.scrollTo({ top: 0 });
      window.scrollTo({ top: 0 });
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const copyRef = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard is unavailable");
      }
      await navigator.clipboard.writeText(referenceNumber);
      setCopied(true);
      toast.success("Reference number copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Unable to copy the reference number. Please copy it manually.");
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-3 px-3 py-3 text-center animate-in fade-in-0 zoom-in-98 duration-200 md:flex md:min-h-[calc(100dvh-9rem)] md:max-w-xl md:flex-col md:justify-center md:space-y-5 md:px-5 md:py-8">
      {/* Success Badge & Header */}
      <div className="space-y-2.5 md:space-y-3">
        <div className="relative mx-auto flex h-14 w-14 items-center justify-center md:size-16">
          {/* Ambient breathing aura glow */}
          <div
            className="absolute -inset-1 rounded-[18px] bg-primary/25 blur-xs animate-pulse"
            style={{ animationDuration: "3s" }}
          />

          {/* Subtle periodic ripple ring */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-primary/40 animate-ping opacity-60"
            style={{ animationDuration: "3s" }}
          />

          {/* Main Badge */}
          <div className="relative flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/15 transition-transform duration-300 hover:scale-105 md:size-16">
            <CheckCircle2 className="size-7 animate-in zoom-in-50 duration-500 md:size-8" />
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold font-display text-foreground tracking-tight md:text-2xl">
            Report Submitted!
          </h2>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground md:max-w-sm md:text-sm">
            Your report has been received and forwarded to MENRO Candelaria officers.
          </p>
        </div>
      </div>

      {/* Unified Summary & Status Card */}
      <div className="space-y-3.5 rounded-2xl border border-border/80 bg-card p-3.5 text-left shadow-2xs md:space-y-4 md:p-6">
        {/* Reference Number Block */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-muted/25 text-center space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Tracking Reference Number
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="whitespace-nowrap text-xl font-sans font-extrabold tabular-nums tracking-tight text-foreground md:text-2xl">
              {referenceNumber}
            </span>
            <button
              type="button"
              onClick={copyRef}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-border hover:bg-muted active:scale-95 md:w-auto md:gap-1.5 md:px-2.5"
              title="Copy reference number"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden text-primary md:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="hidden md:inline">Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Keep this number to track or follow up on your report.
          </p>
        </div>

        {/* Report Lifecycle Timeline */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground">Report Lifecycle</span>
            <span className="text-[10px] text-muted-foreground font-medium">Stage 1 of 4</span>
          </div>

          <div className="relative flex items-start justify-between px-1">
            {/* Horizontal progress track */}
            <div className="absolute top-3.5 left-5 right-5 h-0.5 bg-border/70 -translate-y-1/2 z-0" />

            {LIFECYCLE_STEPS.map((step, idx) => {
              const isCurrent = idx === 0;
              return (
                <div key={step} className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1.5 lg:max-w-20">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-xs ring-4 ring-card"
                        : "border border-border/80 bg-muted/40 text-muted-foreground/60 ring-4 ring-card"
                    }`}
                  >
                    {isCurrent ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[10px] text-center leading-tight ${
                      isCurrent ? "text-foreground font-bold" : "text-muted-foreground/80 font-medium"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reassurance & Notification Notice */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/70 text-[11px] text-muted-foreground">
          <Bell className="w-4 h-4 text-muted-foreground shrink-0" />
          <span>
            You will receive a notification automatically whenever this report's status updates.
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid w-full grid-cols-1 gap-2.5 pt-1 md:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          onClick={onSubmitAnother}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl border-border/80 text-xs font-semibold transition-all hover:bg-muted/80 active:scale-[0.99] cursor-pointer md:h-11 md:text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Submit Another</span>
        </Button>
        <Button
          type="button"
          onClick={() => navigate("/resident/my-reports")}
          className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 active:scale-[0.99] cursor-pointer md:h-11 md:text-sm"
        >
          <span>View My Reports</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default SuccessScreen;

