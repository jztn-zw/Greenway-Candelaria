import { useState, useEffect } from "react";
import { Bell, ChevronRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchMyNotifications, NotificationRow } from "@/services/notificationsService";
import { formatRelativeTime } from "@/utils/date";

const RecentNotificationsStrip = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetchMyNotifications({ limit: 3 });
        if (mounted) {
          setNotifications(res.notifications || []);
        }
      } catch {
        // graceful
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void load();
  }, []);

  const handleItemClick = (n: NotificationRow) => {
    if (n.ref_module === "posts" && n.ref_id) {
      navigate(`/resident/contents?post=${n.ref_id}`);
    } else if (n.ref_module === "reports" && n.ref_id) {
      navigate(`/resident/my-reports?report=${n.ref_id}`);
    } else if (n.ref_module === "tracking") {
      // Tracking alerts are resolved against current route/GPS state by the
      // notifications page, preventing a completed route from opening a stale view.
      navigate("/resident/notifications");
    } else if (n.ref_module === "announcements" || n.type === "ANNOUNCEMENT") {
      navigate(`/resident/notifications?announcement=${n.ref_id || n.id}`);
    } else {
      navigate("/resident/notifications");
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-primary" />
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            Recent Notifications & Alerts
          </h3>
        </div>
        <button
          onClick={() => navigate("/resident/notifications")}
          className="group inline-flex h-8 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-primary transition-all hover:bg-primary/10 hover:text-primary active:scale-95"
        >
          View all notifications <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
        {notifications.map((n) => {
          const timeAgo = formatRelativeTime(n.created_at, {
            emptyLabel: "Recently",
            dateOptions: { month: "short", day: "numeric", year: "numeric" },
          });

          const isUnread = !n.is_read;

          return (
            <button
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all text-left group active:scale-[0.99] cursor-pointer ${
                isUnread
                  ? "bg-card/90 border-primary/30 shadow-xs"
                  : "bg-card/60 border-border/70 hover:border-border"
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                isUnread
                  ? "bg-primary/10 border-primary/20 text-primary"
                  : "bg-muted border-border text-muted-foreground"
              }`}>
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className={`text-xs font-semibold truncate ${isUnread ? "text-foreground font-bold" : "text-foreground/90"}`}>
                    {n.title.replace(/[🚨⚠️]/g, "").trim()}
                  </p>
                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {n.body}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  {timeAgo}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RecentNotificationsStrip;


