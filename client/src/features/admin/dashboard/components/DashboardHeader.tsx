import { useState, useEffect } from "react";
import { Megaphone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { adminDashboardStyles as styles } from "../dashboardStyles";

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
    <div className={styles.header}>
      <div className={styles.headerRow}>
        <div className="min-w-0">
          <h1 className={styles.title}>
            {getGreeting()}, <span className="text-primary">{adminName}</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(time)}</span>
            <span className="text-muted-foreground/40 font-semibold">·</span>
            <span className="inline-flex items-center rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 tabular-nums font-medium text-foreground">
              {time.toLocaleTimeString("en-US", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button
            size="sm"
            variant="outline"
            className={styles.headerAction}
            onClick={() => navigate("/admin/announcements")}
          >
            <Megaphone className="w-4 h-4" />
            <span>New Announcement</span>
          </Button>
          <Button
            size="sm"
            className={styles.headerAction}
            onClick={() => navigate("/admin/truck-tracking")}
          >
            <MapPin className="w-4 h-4" />
            <span>Live Trucks</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
