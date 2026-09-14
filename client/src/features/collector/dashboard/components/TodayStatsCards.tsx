import { CheckCircle2, AlertCircle, Timer } from "lucide-react";

interface Props {
  completed: number;
  total: number;
  skipped: number;
  timeElapsed: number; // minutes
  active: boolean;
}

const TodayStatsCards = ({ completed, total, skipped, timeElapsed, active }: Props) => {
  const hours = Math.floor(timeElapsed / 60);
  const mins = timeElapsed % 60;
  const remaining = Math.max(0, total - completed - skipped);

  const stats = [
    {
      label: "Stops Completed",
      value: total > 0 ? `${completed} / ${total}` : "—",
      subtext: total > 0 ? (completed === total ? "All stops finished" : `${remaining} remaining`) : "No stops scheduled",
      icon: CheckCircle2,
      accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Missed / Skipped",
      value: total > 0 ? String(skipped) : "—",
      subtext: skipped > 0 ? "Requires re-route" : "Zero missed stops",
      icon: AlertCircle,
      accent: skipped > 0
        ? "text-destructive bg-destructive/10 border-destructive/20"
        : "text-muted-foreground bg-muted/60 border-border/50",
    },
    {
      label: "Route Duration",
      value: active ? (hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`) : "Standby",
      subtext: active ? "Active shift time" : "Shift not started",
      icon: Timer,
      accent: active
        ? "text-primary bg-primary/10 border-primary/20"
        : "text-muted-foreground bg-muted/60 border-border/50",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="rounded-xl border border-border/80 bg-card p-3 sm:p-4 flex flex-col justify-between text-left shadow-2xs hover:border-primary/30 transition-all min-w-0"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                {s.label}
              </span>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border ${s.accent}`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            <div>
              <p className="text-base sm:text-xl md:text-2xl font-bold text-foreground tabular-nums font-display tracking-tight truncate">
                {s.value}
              </p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mt-0.5 font-medium">
                {s.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TodayStatsCards;

