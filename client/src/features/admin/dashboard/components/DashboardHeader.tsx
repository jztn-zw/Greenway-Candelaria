import { useState, useEffect } from "react";
import { Megaphone, MapPin, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric" });

type SystemStatus = "operational" | "warning" | "critical";

const statusConfig: Record<SystemStatus, { label: string; icon: React.ElementType; className: string; dotClass: string }> = {
  operational: {
    label: "System Operational",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    dotClass: "bg-emerald-500 animate-pulse",
  },
  warning: {
    label: "1 Issue Detected",
    icon: AlertTriangle,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    dotClass: "bg-amber-500",
  },
  critical: {
    label: "Action Required",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/25",
    dotClass: "bg-destructive animate-ping",
  },
};

interface DashboardHeaderProps {
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const DashboardHeader = ({ isRefreshing = false, onRefresh }: DashboardHeaderProps) => {
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();
  const systemStatus: SystemStatus = "operational";

  // Read admin name from localStorage
  const adminName = (() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.full_name) return u.full_name.split(" ")[0];
      }
    } catch {
      // fallback
    }
    return "Admin";
  })();

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const cfg = statusConfig[systemStatus];

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-5 sm:p-6 shadow-2xs">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Greeting & Clock */}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display tracking-tight">
              {getGreeting()}, <span className="text-primary">{adminName}</span>
            </h1>
              {/* Status Badge */}
              <div
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs ${cfg.className}`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dotClass}`} />
                <span>{cfg.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 mt-1 text-xs text-muted-foreground">
              <span>{formatDate(time)}</span>
              <span className="text-muted-foreground/40 font-semibold">·</span>
              <span className="font-mono font-medium text-foreground tabular-nums bg-muted/40 px-2 py-0.5 rounded-md border border-border/60">
                {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          </div>

        {/* Right: Quick Operational Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-start xl:self-auto">
          <Button
            size="sm"
            variant="outline"
            className="h-10 px-3.5 sm:px-4 rounded-xl border-border/80 bg-background hover:bg-muted font-semibold text-xs shadow-2xs gap-2 cursor-pointer active:scale-95 transition-all"
            onClick={() => navigate("/admin/announcements")}
          >
            <Megaphone className="w-4 h-4 text-primary" />
            <span>New Announcement</span>
          </Button>
          <Button
            size="sm"
            className="h-10 px-3.5 sm:px-4 rounded-xl font-semibold shadow-2xs text-xs gap-2 cursor-pointer active:scale-95 transition-all"
            onClick={() => navigate("/admin/truck-tracking")}
          >
            <MapPin className="w-4 h-4" />
            <span>Live Fleet</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
