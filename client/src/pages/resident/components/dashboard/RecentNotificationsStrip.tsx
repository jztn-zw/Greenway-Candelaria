import { Bell, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const recentNotifications = [
  {
    id: "1",
    title: "Collection schedule updated",
    desc: "Monday route adjusted for Buenavista East.",
    time: "2h ago",
  },
  {
    id: "2",
    title: "Report status changed",
    desc: "Your illegal dumping report is now under review.",
    time: "5h ago",
  },
  {
    id: "3",
    title: "New announcement",
    desc: "Clean-up drive this Saturday at Brgy. Hall.",
    time: "1d ago",
  },
];

const RecentNotificationsStrip = () => {
  const navigate = useNavigate();

  if (recentNotifications.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Recent Notifications
          </h3>
        </div>
        <button
          onClick={() => navigate("/resident/notifications")}
          className="text-[10px] sm:text-xs text-primary font-semibold hover:underline flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
        {recentNotifications.slice(0, 3).map((n) => (
          <button
            key={n.id}
            onClick={() => navigate("/resident/notifications")}
            className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border hover:shadow-sm transition-all text-left active:scale-[0.98]"
          >
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="w-3 h-3 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{n.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{n.desc}</p>
              <p className="text-[9px] text-muted-foreground mt-1">{n.time}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentNotificationsStrip;
