import { CheckCircle, Copy, ArrowRight, Bell, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";

interface SuccessScreenProps {
  referenceNumber: string;
  onSubmitAnother: () => void;
}

const SuccessScreen = ({ referenceNumber, onSubmitAnother }: SuccessScreenProps) => {
  const navigate = useNavigate();

  const copyRef = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("Clipboard is unavailable");
      }
      await navigator.clipboard.writeText(referenceNumber);
      toast.success("Reference number copied!");
    } catch {
      toast.error("Unable to copy the reference number. Please copy it manually.");
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 sm:py-12 space-y-6 text-center px-4">
      {/* Success icon */}
      <div className="relative mx-auto w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold font-display text-foreground">Report Submitted!</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Your report has been received and will be reviewed by MENRO staff. You'll be notified when the status changes.
        </p>
      </div>

      {/* Reference Number Card */}
      <Card className="rounded-2xl border border-primary/20 bg-primary/5 shadow-2xs">
        <CardContent className="pt-5 pb-5 space-y-2.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Reference Number</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl sm:text-3xl font-sans tabular-nums font-extrabold text-foreground tracking-wide">{referenceNumber}</span>
            <button
              type="button"
              onClick={copyRef}
              className="h-9 px-3 rounded-xl border border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-colors flex items-center gap-1.5 text-xs text-primary font-bold cursor-pointer shadow-2xs active:scale-95"
              title="Copy reference number"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Use this reference number to track or follow up on your report.</p>
        </CardContent>
      </Card>

      {/* Status tracker */}
      <Card className="rounded-2xl border border-border/80 shadow-2xs">
        <CardContent className="pt-5 pb-5">
          <p className="text-xs font-bold text-foreground mb-4">Report Lifecycle</p>
          <div className="flex items-center justify-between max-w-xs mx-auto">
            {["Submitted", "Under Review", "Dispatched", "Resolved"].map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-1.5 relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i === 0
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "border border-border/90 bg-muted/30 text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{step}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-muted-foreground leading-relaxed">
            Next: MENRO will review the submitted details and photo evidence. You can follow every update in My Reports.
          </p>
        </CardContent>
      </Card>

      {/* Notification reminder */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs">
        <CardContent className="py-4 flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You'll receive a notification when your report status changes. Keep your notifications enabled.
          </p>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button
          variant="outline"
          onClick={onSubmitAnother}
          className="h-11 rounded-xl text-xs sm:text-sm font-semibold border-border/80 hover:bg-muted/80 cursor-pointer active:scale-[0.99] transition-all"
        >
          <FileText className="w-4 h-4 mr-2" />
          Submit Another Report
        </Button>
        <Button
          onClick={() => navigate("/resident/my-reports")}
          className="h-11 rounded-xl text-xs sm:text-sm font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm cursor-pointer active:scale-[0.99] transition-all"
        >
          View My Reports <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default SuccessScreen;
