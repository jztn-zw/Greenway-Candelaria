import { useState, useEffect } from "react";
import { Megaphone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const getGreeting = () => {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { timeZone: "Asia/Manila", weekday: "long", year: "numeric", month: "short", day: "numeric" });

const DashboardHeader = () => {
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();

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

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-6 shadow-2xs">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        {/* Left: Greeting & Clock */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground font-display tracking-tight leading-tight">
              {getGreeting()}, <span className="text-primary">{adminName}</span>
            </h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDate(time)}</span>
              <span className="text-muted-foreground/40 font-semibold">·</span>
              <span className="inline-flex items-center rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 font-mono font-medium text-foreground tabular-nums">
                {time.toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            </div>
          </div>

        {/* Right: Quick Operational Actions */}
        <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/60 pt-3 lg:w-auto lg:shrink-0 lg:border-t-0 lg:pt-0">
          <Button
            size="sm"
            variant="outline"
            className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl border-border/70 bg-muted/20 hover:bg-muted/50 font-semibold text-xs gap-1.5 cursor-pointer active:scale-95 transition-all"
            onClick={() => navigate("/admin/announcements")}
          >
            <Megaphone className="w-4 h-4 text-primary" />
            <span>New Announcement</span>
          </Button>
          <Button
            size="sm"
            className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl font-semibold shadow-2xs text-xs gap-1.5 cursor-pointer active:scale-95 transition-all"
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
