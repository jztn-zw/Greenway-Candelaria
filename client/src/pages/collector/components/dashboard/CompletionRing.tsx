interface Props {
  percentage: number;
}

const CompletionRing = ({ percentage }: Props) => {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 90 ? "text-primary" : percentage >= 70 ? "text-yellow-500" : "text-destructive";
  const strokeColor = percentage >= 90 ? "hsl(var(--primary))" : percentage >= 70 ? "#eab308" : "hsl(var(--destructive))";

  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold font-display ${color}`}>{percentage}%</span>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground font-medium text-center">Completion Rate<br />This Month</p>
    </div>
  );
};

export default CompletionRing;
