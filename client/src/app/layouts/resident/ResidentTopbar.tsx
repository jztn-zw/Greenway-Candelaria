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
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import useNotifications from "@/hooks/useNotifications";
import { NotificationRow } from "@/services/notificationsService";

const typeIcons: Record<string, React.ElementType> = {
  COLLECTION_REMINDER: CalendarClock,
  TRUCK_IS_NEAR: Truck,
  COLLECTION_DONE: CheckCircle2,
  MISSED_COLLECTION: AlertTriangle,
  ANNOUNCEMENT: Megaphone,
  REPORT_UPDATE: FileText,
  NEW_POST: Newspaper,
  SYSTEM: Bell,
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
    } else if (n.ref_module === "announcements") {
      navigate("/resident/notifications");
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

            <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((n) => {
                  const Icon = typeIcons[n.type] || Bell;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => void handleNotificationClick(n)}
                      className={`w-full p-3.5 text-left flex items-start gap-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                        !n.is_read ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-foreground truncate">
                            {n.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatTimeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                          {n.body}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
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
