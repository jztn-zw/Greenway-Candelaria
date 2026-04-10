import { CheckCircle, Copy, ArrowRight, Bell, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SuccessScreenProps {
  referenceNumber: string;
  onSubmitAnother: () => void;
}

const SuccessScreen = ({ referenceNumber, onSubmitAnother }: SuccessScreenProps) => {
  const navigate = useNavigate();

  const copyRef = () => {
    navigator.clipboard.writeText(referenceNumber);
    toast.success("Reference number copied!");
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
      <Card className="border border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="pt-5 pb-5 space-y-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Reference Number</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl sm:text-3xl font-bold font-display text-foreground tracking-wide">{referenceNumber}</span>
            <button
              onClick={copyRef}
              className="p-2.5 rounded-xl hover:bg-primary/10 transition-colors border border-primary/20"
              title="Copy"
            >
              <Copy className="w-4 h-4 text-primary" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Use this number to track or follow up on your report.</p>
        </CardContent>
      </Card>

      {/* Status tracker */}
      <Card className="border border-border shadow-sm">
        <CardContent className="pt-5 pb-5">
          <p className="text-xs font-semibold text-foreground mb-4">Report Status</p>
          <div className="flex items-center justify-between max-w-xs mx-auto">
            {["Submitted", "Under Review", "Dispatched", "Resolved"].map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-1.5 relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i === 0
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "border-2 border-border text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notification reminder */}
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="py-4 flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You'll receive a notification when your report status changes. Keep your notifications enabled.
          </p>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button variant="outline" onClick={onSubmitAnother} className="h-12 rounded-xl text-sm font-semibold">
          <FileText className="w-4 h-4 mr-2" />
          Submit Another Report
        </Button>
        <Button
          onClick={() => navigate("/resident/my-reports")}
          className="h-12 rounded-xl text-sm font-semibold gap-2 shadow-lg shadow-primary/20"
        >
          View My Reports <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default SuccessScreen;
