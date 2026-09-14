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
import { formatRelativeTime, parseApiTimestamp } from "@/utils/date";

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

const isWithinLast24Hours = (value: string) => {
  const date = parseApiTimestamp(value);
  if (!date) return false;

  const elapsed = Date.now() - date.getTime();
  return elapsed >= 0 && elapsed < 24 * 60 * 60 * 1000;
};

const getNotificationHeadline = (n: NotificationRow) => {
  const cleanTitle = (n.title || "").replace(/[🚨⚠️]/g, "").trim();

  if (n.ref_module === "announcements" || n.type === "ANNOUNCEMENT") {
    return {
      prefix: "MENRO Candelaria",
      connector: "posted an announcement:",
      highlight: cleanTitle || "Official Notice",
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

const RESIDENT_PAGE_TITLES: Record<string, string> = {
  "/resident": "Dashboard",
  "/resident/schedule": "Collection Schedule",
  "/resident/tracking": "Truck Tracking",
  "/resident/my-reports": "My Reports",
  "/resident/report": "Submit Report",
  "/resident/contents": "Community Updates",
  "/resident/notifications": "Notifications",
  "/resident/profile": "Profile & Account",
  "/resident/settings": "Settings",
};

const getResidentPageTitle = (pathname: string) => {
  if (RESIDENT_PAGE_TITLES[pathname]) return RESIDENT_PAGE_TITLES[pathname];
  if (pathname.startsWith("/resident/contents")) return "Community Updates";
  if (pathname.startsWith("/resident/my-reports")) return "My Reports";
  return "Resident Portal";
};

const ResidentTopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [visibleNotificationCount, setVisibleNotificationCount] = useState(6);
  const [isLoadingMoreNotifications, setIsLoadingMoreNotifications] = useState(false);

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

  const visibleNotifications = notifications.slice(0, visibleNotificationCount);
  const hasMoreNotifications = visibleNotificationCount < notifications.length;
  const recentNotificationCount = notifications.filter((notification) =>
    isWithinLast24Hours(notification.created_at),
  ).length;

  const loadMoreNotifications = () => {
    if (!hasMoreNotifications || isLoadingMoreNotifications) return;
    setIsLoadingMoreNotifications(true);
    window.setTimeout(() => {
      setVisibleNotificationCount((current) => Math.min(current + 6, notifications.length));
      setIsLoadingMoreNotifications(false);
    }, 260);
  };

  return (
    <header className="h-14 border-b border-border/80 bg-background/95 backdrop-blur-md flex items-center justify-between px-3.5 sm:px-5 shrink-0 sticky top-0 z-20 transition-colors">
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center justify-center cursor-pointer shrink-0 active:scale-95"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
          {isNestedReport ? (
            <>
              <button
                type="button"
                onClick={() => navigate("/resident/my-reports")}
                className="font-medium text-muted-foreground hover:text-foreground hover:underline transition-colors shrink-0"
              >
                My Reports
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <span className="font-sans tabular-nums font-bold text-foreground truncate tracking-tight">
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
                Community Updates
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
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Theme toggle with transition */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-8 h-8 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 relative flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 border border-transparent hover:border-border/60"
          title="Toggle Theme"
        >
          <Sun className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
          <Moon className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
        </button>

        {/* Notifications Popover */}
        <Popover
          open={popoverOpen}
          onOpenChange={(open) => {
            setPopoverOpen(open);
            if (open) {
              setVisibleNotificationCount(6);
              setIsLoadingMoreNotifications(false);
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="w-8 h-8 rounded-xl hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-200 relative flex items-center justify-center cursor-pointer active:scale-95 border border-transparent hover:border-border/60"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-background leading-none ${unreadCount > 9 ? "min-w-4 px-1" : "w-4"}`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[360px] sm:w-[410px] p-0 shadow-2xl rounded-2xl border border-border/80 bg-card overflow-hidden"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-muted/25">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm font-display text-foreground tracking-tight">Notifications</span>
                {notifications.length > 0 && (
                  <span className="bg-muted text-muted-foreground border border-border/60 text-[10px] font-medium rounded-full px-2 py-0.5 leading-none">
                    {recentNotificationCount} recent
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1.5 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Notifications Scroll Area */}
            <div
              className="max-h-[380px] overflow-y-auto overscroll-contain scrollbar-thin"
              onScroll={(event) => {
                const viewport = event.currentTarget;
                const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
                if (remaining < 32) loadMoreNotifications();
              }}
            >
              <div className="p-2 space-y-1">
                {visibleNotifications.length > 0 ? (
                  visibleNotifications.map((n) => {
                    const headline = getNotificationHeadline(n);
                    const { Icon, style: avatarStyle } = getNotificationIconAndStyle(n);
                    const isUnread = !n.is_read;

                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => void handleNotificationClick(n)}
                        className={`w-full p-2.5 sm:p-3 rounded-xl text-left flex items-start gap-3 transition-all duration-150 cursor-pointer group relative border ${
                          isUnread
                            ? "bg-primary/[0.04] border-primary/15 hover:bg-primary/[0.08]"
                            : "bg-transparent border-transparent hover:bg-muted/60"
                        }`}
                      >
                        {/* Avatar Icon */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border shadow-2xs transition-transform duration-200 group-hover:scale-105 ${avatarStyle}`}>
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs leading-snug break-words">
                              <span className="font-semibold text-foreground">
                                {headline.prefix}
                              </span>
                              {headline.connector && (
                                <span className="text-muted-foreground font-normal"> {headline.connector} </span>
                              )}
                              {headline.highlight && (
                                <span className="font-semibold text-foreground">
                                  {headline.highlight}
                                </span>
                              )}
                            </p>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20 shrink-0 mt-1" title="Unread" />
                            )}
                          </div>

                          {n.body && (
                            <p className="text-[11.5px] text-muted-foreground line-clamp-2 leading-relaxed break-words">
                              {n.body}
                            </p>
                          )}

                          <p className="text-[10px] text-muted-foreground/70 font-medium pt-0.5">
                            {formatRelativeTime(n.created_at)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-10 px-4 text-center">
                    <div className="w-10 h-10 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center mx-auto mb-2.5 text-muted-foreground/60">
                      <Bell className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">No notifications</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">You're all caught up!</p>
                  </div>
                )}
                {isLoadingMoreNotifications && (
                  <div className="space-y-2 px-1 py-2.5 animate-pulse" aria-label="Loading older notifications">
                    {[0, 1].map((index) => (
                      <div key={index} className="flex items-start gap-3 rounded-xl p-2.5">
                        <div className="h-9 w-9 shrink-0 rounded-xl bg-muted" />
                        <div className="flex-1 space-y-2 pt-1">
                          <div className="h-3 w-3/4 rounded bg-muted" />
                          <div className="h-2.5 w-full rounded bg-muted/80" />
                          <div className="h-2.5 w-1/4 rounded bg-muted/60" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {hasMoreNotifications && !isLoadingMoreNotifications && (
                  <div className="py-3 text-center text-[11px] font-medium text-muted-foreground">
                    Scroll for older notifications
                  </div>
                )}
              </div>
            </div>

            {/* Popover Footer */}
            <div className="border-t border-border/70 p-2 bg-muted/20">
              <button
                type="button"
                onClick={() => {
                  setPopoverOpen(false);
                  navigate("/resident/notifications");
                }}
                className="w-full py-2 px-3 rounded-xl text-center text-xs font-semibold text-foreground hover:text-primary hover:bg-muted/70 transition-all flex items-center justify-center gap-1.5 cursor-pointer group"
              >
                <span>View all notifications</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-transform duration-150 group-hover:translate-x-0.5" />
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
};

export default ResidentTopBar;
