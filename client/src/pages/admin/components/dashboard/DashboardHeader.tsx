import { useState, useEffect } from "react";
import { Megaphone, FileText, CheckCircle2, AlertTriangle, XCircle, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

type SystemStatus = "operational" | "warning" | "critical";

const statusConfig: Record<SystemStatus, { label: string; icon: React.ElementType; className: string }> = {
  operational: { label: "System Operational", icon: CheckCircle2, className: "bg-primary/10 text-primary border-primary/20" },
  warning: { label: "1 Issue Detected", icon: AlertTriangle, className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  critical: { label: "Critical — Action Required", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const DashboardHeader = () => {
  const [time, setTime] = useState(new Date());
  const systemStatus: SystemStatus = "operational";

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const cfg = statusConfig[systemStatus];
  const StatusIcon = cfg.icon;

  return (
    <div className="bg-card border border-border rounded-xl p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">
              {getGreeting()}, <span className="text-primary">Admin</span>
            </h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm text-muted-foreground">{formatDate(time)}</span>
              <span className="text-muted-foreground/40">|</span>
              <span className="text-sm font-mono text-foreground tabular-nums">
                {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          </div>
        </div>

        {/* Center — Status */}
        <Badge variant="outline" className={`px-3 py-1.5 gap-1.5 text-xs font-medium ${cfg.className}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {cfg.label}
        </Badge>

        {/* Right — Quick Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <Megaphone className="w-3.5 h-3.5" /> New Announcement
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> View All Reports
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
