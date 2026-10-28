import { useSystemTime } from "@/hooks/useSystemTime";
import { getSystemDate } from "@/lib/serverClock";
import { useState, useEffect } from "react";
import { Megaphone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { adminDashboardStyles as styles } from "../dashboardStyles";
import authService from "@/services/authService";

const getGreeting = () => {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Manila", hour: "numeric", hourCycle: "h23" }).format(getSystemDate()));
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
};

const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { timeZone: "Asia/Manila", weekday: "long", year: "numeric", month: "short", day: "numeric" });

const DashboardHeader = () => {
  useSystemTime();
  const [time, setTime] = useState(getSystemDate());
  const navigate = useNavigate();

  const adminName = authService.getCurrentUser()?.full_name?.split(" ")[0] || "Admin";

  useEffect(() => {
    const id = setInterval(() => setTime(getSystemDate()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.header}>
      <div className={styles.headerRow}>
        <div className="min-w-0">
          <h1 className={styles.title}>
            {getGreeting()}, <span className="text-primary">{adminName}</span>
          </h1>
          <div className="resident-page-description mt-2 flex flex-wrap items-center gap-2 leading-relaxed text-muted-foreground">
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
            onClick={() => navigate("/admin/tracking")}
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
