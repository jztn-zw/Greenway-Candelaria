import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ListOrdered, Percent } from "lucide-react";

interface RouteProgressBarProps {
  completed: number;
  total: number;
}

const RouteProgressBar = ({ completed, total }: RouteProgressBarProps) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = Math.max(0, total - completed);

  return (
    <div className="bg-card border border-border/80 shadow-xs rounded-xl p-3 sm:p-4 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-foreground font-display tracking-tight">
              Route Progress
            </span>
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              {remaining === 0 ? "All stops completed" : `${remaining} stop${remaining > 1 ? "s" : ""} remaining`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-[11px] font-medium">
            <ListOrdered className="w-3 h-3" />
            <span className="tabular-nums font-semibold text-foreground">{completed}</span>/{total}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold tabular-nums">
            <Percent className="w-3 h-3" />
            {pct}%
          </span>
        </div>
      </div>

      <Progress value={pct} className="h-2 sm:h-2.5 bg-muted rounded-full" />
    </div>
  );
};

export default RouteProgressBar;
