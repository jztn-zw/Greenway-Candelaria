import { CheckCircle2, XCircle, Timer } from "lucide-react";

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

  const stats = [
    {
      label: "Stops Completed",
      value: active ? `${completed} / ${total}` : "—",
      icon: CheckCircle2,
      accent: "text-primary bg-primary/10",
    },
    {
      label: "Stops Skipped",
      value: active ? String(skipped) : "—",
      icon: XCircle,
      accent: "text-destructive bg-destructive/10",
    },
    {
      label: "Time Elapsed",
      value: active ? `${hours}h ${String(mins).padStart(2, "0")}m` : "—",
      icon: Timer,
      accent: "text-foreground bg-muted",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-border bg-card p-4 flex flex-col items-center text-center gap-2"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.accent}`}>
            <s.icon className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-foreground tabular-nums font-display">{s.value}</p>
          <p className="text-[11px] text-muted-foreground font-medium">{s.label}</p>
        </div>
      ))}
    </div>
  );
};

export default TodayStatsCards;
