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
    <div className="mx-auto max-w-md space-y-3 px-3 py-3 text-center animate-in fade-in-0 zoom-in-98 duration-200 sm:space-y-4 sm:px-4 sm:py-6">
      {/* Success Badge & Header */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="relative mx-auto w-14 h-14 flex items-center justify-center">
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
          <div className="relative w-14 h-14 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/15 transition-transform duration-300 hover:scale-105">
            <CheckCircle2 className="w-7 h-7 animate-in zoom-in-50 duration-500" />
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
            Report Submitted!
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Your report has been received and forwarded to MENRO Candelaria officers.
          </p>
        </div>
      </div>

      {/* Unified Summary & Status Card */}
      <div className="space-y-3.5 rounded-2xl border border-border/80 bg-card p-3.5 text-left shadow-2xs sm:space-y-4 sm:p-5">
        {/* Reference Number Block */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-muted/25 text-center space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Tracking Reference Number
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="whitespace-nowrap text-xl font-sans font-extrabold tabular-nums tracking-tight text-foreground sm:text-3xl">
              {referenceNumber}
            </span>
            <button
              type="button"
              onClick={copyRef}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-xs font-semibold text-foreground shadow-2xs transition-all hover:border-border hover:bg-muted active:scale-95 sm:w-auto sm:gap-1.5 sm:px-2.5"
              title="Copy reference number"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden text-primary sm:inline">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="hidden sm:inline">Copy</span>
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
                <div key={step} className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1.5 sm:max-w-20">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 w-full">
        <Button
          type="button"
          variant="outline"
          onClick={onSubmitAnother}
          className="h-10 sm:h-10.5 rounded-xl text-xs sm:text-sm font-semibold border-border/80 hover:bg-muted/80 cursor-pointer active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Submit Another</span>
        </Button>
        <Button
          type="button"
          onClick={() => navigate("/resident/my-reports")}
          className="h-10 sm:h-10.5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
        >
          <span>View My Reports</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default SuccessScreen;
