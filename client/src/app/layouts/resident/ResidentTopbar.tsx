import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  Bell,
  Sun,
  Moon,
  CalendarClock,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  FileText,
  Newspaper,
  CheckCheck,
  ChevronRight,
  Lightbulb,
  CalendarDays,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import useNotifications from "@/hooks/useNotifications";
import { NotificationRow } from "@/services/notificationsService";

const getMetadata = (notification: NotificationRow): Record<string, unknown> => {
  if (!notification.metadata) return {};
  if (typeof notification.metadata === "string") {
    try {
      return JSON.parse(notification.metadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return notification.metadata;
};

const getNotificationHeadline = (n: NotificationRow) => {
  const metadata = getMetadata(n);
  const cleanTitle = (n.title || "").replace(/[🚨⚠️]/g, "").trim();
  const category = String(metadata.category || "").toUpperCase();

  if (n.ref_module === "announcements" || n.type === "ANNOUNCEMENT") {
    return {
      prefix: "MENRO Candelaria",
      connector: "posted an announcement:",
      highlight: cleanTitle || "Official Notice",
    };
  }

  if (n.ref_module === "reports" || n.type === "REPORT_UPDATE") {
    return {
      prefix: "Report Status Update:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  if (n.ref_module === "tracking" || n.type === "TRUCK_IS_NEAR") {
    return {
      prefix: "Collection Truck Alert:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  if (n.type === "COLLECTION_REMINDER") {
    return {
      prefix: "Collection Reminder:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  if (n.type === "COLLECTION_DONE") {
    return {
      prefix: "Collection Completed:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  if (category === "WASTE_TIP") {
    return {
      prefix: "Eco Tip:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  if (category === "SCHEDULE_CHANGE") {
    return {
      prefix: "Schedule Notice:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  if (n.type === "NEW_POST" || n.ref_module === "posts") {
    return {
      prefix: "Community Content:",
      connector: "",
      highlight: cleanTitle,
    };
  }

  return {
    prefix: cleanTitle || "System Notification",
    connector: "",
    highlight: "",
  };
};

const getNotificationIconAndStyle = (n: NotificationRow) => {
  const metadata = getMetadata(n);
  const category = String(metadata.category || "").toUpperCase();

  if (n.ref_module === "announcements" || n.type === "ANNOUNCEMENT") {
    return {
      Icon: Megaphone,
      style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }

  if (n.type === "TRUCK_IS_NEAR" || n.ref_module === "tracking") {
    return {
      Icon: Truck,
      style: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    };
  }

  if (n.type === "COLLECTION_REMINDER" || category === "SCHEDULE_CHANGE") {
    return {
      Icon: CalendarDays,
      style: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    };
  }

  if (n.type === "COLLECTION_DONE") {
    return {
      Icon: CheckCircle2,
      style: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }

  if (category === "WASTE_TIP") {
    return {
      Icon: Lightbulb,
      style: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
  }

  if (n.ref_module === "reports" || n.type === "REPORT_UPDATE") {
    return {
      Icon: FileText,
      style: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    };
  }

  if (n.type === "NEW_POST" || n.ref_module === "posts") {
    return {
      Icon: Newspaper,
      style: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    };
  }

  return {
    Icon: Bell,
    style: "bg-primary/10 text-primary border-primary/20",
  };
};

const formatTimeAgo = (dateString: string) => {
  try {
    const d = new Date(dateString.includes("Z") ? dateString : dateString.replace(" ", "T"));
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateString;
  }
};

const RESIDENT_PAGE_TITLES: Record<string, string> = {
  "/resident": "Dashboard",
  "/resident/schedule": "Collection Schedule",
  "/resident/tracking": "Live Truck Tracking",
  "/resident/my-reports": "My Waste Reports",
  "/resident/report": "Submit Report",
  "/resident/contents": "Community & News",
  "/resident/notifications": "Notifications",
  "/resident/profile": "Profile & Account",
  "/resident/settings": "Settings",
};

const getResidentPageTitle = (pathname: string) => {
  if (RESIDENT_PAGE_TITLES[pathname]) return RESIDENT_PAGE_TITLES[pathname];
  if (pathname.startsWith("/resident/contents")) return "Community & News";
  if (pathname.startsWith("/resident/my-reports")) return "My Waste Reports";
  return "Resident Portal";
};

const ResidentTopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const pageTitle = getResidentPageTitle(location.pathname);

  const searchParams = new URLSearchParams(location.search);
  const reportParam = searchParams.get("report");
  const refParam = searchParams.get("ref");
  const postParam = searchParams.get("post");

  const isNestedReport = location.pathname.startsWith("/resident/my-reports") && Boolean(reportParam);
  const isNestedPost = location.pathname.startsWith("/resident/contents") && Boolean(postParam);

  const toggleTheme = () => {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    setDark(nextDark);
  };

  const handleNotificationClick = async (n: NotificationRow) => {
    if (!n.is_read) {
      await markAsRead(n.id);
    }
    setPopoverOpen(false);

    if (n.ref_module === "posts" && n.ref_id) {
      navigate(`/resident/contents?post=${n.ref_id}`);
    } else if (n.ref_module === "reports" && n.ref_id) {
      navigate(`/resident/my-reports?report=${n.ref_id}`);
    } else if (n.ref_module === "tracking") {
      navigate("/resident/schedule");
    } else if (n.ref_module === "announcements" || n.type === "ANNOUNCEMENT") {
      const targetId = n.ref_id || n.id;
      navigate(`/resident/notifications?announcement=${targetId}`);
    } else {
      navigate("/resident/notifications");
    }
  };

  const recentNotifications = notifications.slice(0, 6);

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur flex items-center justify-between px-4 shrink-0 sticky top-0 z-40">
      {/* Left */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-xl text-foreground hover:bg-secondary transition-colors flex items-center justify-center cursor-pointer shrink-0"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
          <button
            type="button"
            onClick={() => navigate("/resident")}
            title="Go to Dashboard"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/70 dark:bg-muted/50 hover:bg-primary/10 hover:border-primary/40 border border-border/70 text-muted-foreground hover:text-foreground font-semibold text-[11px] shadow-2xs shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-110 transition-transform" />
            MENRO Candelaria
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          {isNestedReport ? (
            <>
              <button
                type="button"
                onClick={() => navigate("/resident/my-reports")}
                className="font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors shrink-0"
              >
                My Waste Reports
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <span className="font-bold text-foreground truncate tracking-tight font-mono">
                {refParam ? refParam : "Report Details"}
              </span>
            </>
          ) : isNestedPost ? (
            <>
              <button
                type="button"
                onClick={() => navigate("/resident/contents")}
                className="font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors shrink-0"
              >
                Community & News
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <span className="font-bold text-foreground truncate tracking-tight">
                Article
              </span>
            </>
          ) : (
            <span className="font-bold text-foreground truncate tracking-tight">
              {pageTitle}
            </span>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme toggle with transition */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-secondary transition-colors relative w-8 h-8 flex items-center justify-center overflow-hidden cursor-pointer"
          title="Toggle Theme"
        >
          <Sun className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
          <Moon className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
        </button>

        {/* Notifications Popover */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-2 rounded-md hover:bg-secondary transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse leading-none ${unreadCount > 9 ? "min-w-4 px-1" : "w-4"}`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-2xl rounded-2xl border-border">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-primary/15 text-primary text-[10px] font-bold rounded-full px-2 py-0.5">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((n) => {
                  const headline = getNotificationHeadline(n);
                  const { Icon, style: avatarStyle } = getNotificationIconAndStyle(n);
                  const isUnread = !n.is_read;

                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => void handleNotificationClick(n)}
                      className={`w-full p-3 sm:p-3.5 text-left flex items-start gap-3 hover:bg-muted/50 transition-colors cursor-pointer group ${
                        isUnread ? "bg-primary/[0.04]" : ""
                      }`}
                    >
                      {/* Avatar Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${avatarStyle}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="text-xs text-foreground/90 leading-snug break-words">
                          <span className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {headline.prefix}
                          </span>
                          {headline.connector && (
                            <span className="text-foreground/80"> {headline.connector} </span>
                          )}
                          {headline.highlight && (
                            <span className="font-bold text-foreground">
                              {headline.highlight}
                            </span>
                          )}
                        </p>

                        {n.body && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed break-words">
                            {n.body}
                          </p>
                        )}

                        <p className="text-[10px] text-muted-foreground/80 font-medium pt-0.5">
                          {formatTimeAgo(n.created_at)}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {isUnread && (
                        <div className="flex items-center self-center shrink-0 pl-1" title="Unread">
                          <span className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/15 shrink-0" />
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  No notifications yet
                </div>
              )}
            </div>

            <div className="border-t border-border px-4 py-2.5 bg-muted/20">
              <button
                type="button"
                onClick={() => {
                  setPopoverOpen(false);
                  navigate("/resident/notifications");
                }}
                className="w-full text-center text-xs text-primary hover:underline font-semibold cursor-pointer"
              >
                View all notifications →
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
};

export default ResidentTopBar;
