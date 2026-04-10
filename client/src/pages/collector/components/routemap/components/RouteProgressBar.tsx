import { Progress } from "@/components/ui/progress";
import { CheckCircle2 } from "lucide-react";

interface RouteProgressBarProps {
  completed: number;
  total: number;
}

const RouteProgressBar = ({ completed, total }: RouteProgressBarProps) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground font-display">Route Progress</span>
        </div>
        <span className="text-sm font-bold text-primary tabular-nums">
          {completed} of {total} stops · {pct}%
        </span>
      </div>
      <Progress value={pct} className="h-2.5 bg-muted" />
    </div>
  );
};

export default RouteProgressBar;
