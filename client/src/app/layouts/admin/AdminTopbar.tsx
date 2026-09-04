import { useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Menu,
  ChevronRight,
  Bell,
  Sun,
  Moon,
  FileText,
  AlertTriangle,
  Megaphone,
  Truck,
  Newspaper,
  CheckCheck,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useNotifications from "@/hooks/useNotifications";
import { NotificationRow } from "@/services/notificationsService";

const typeIcons: Record<string, React.ElementType> = {
  REPORT_UPDATE: FileText,
  MISSED_COLLECTION: AlertTriangle,
  TRUCK_IS_NEAR: Truck,
  ANNOUNCEMENT: Megaphone,
  NEW_POST: Newspaper,
  SYSTEM: Bell,
};

const formatTimeAgo = (dateString: string) => {
  try {
    const d = new Date(
      dateString.includes("Z") ? dateString : dateString.replace(" ", "T"),
    );
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

const ADMIN_PAGE_TITLES: Record<string, string> = {
  "/admin": "Admin Dashboard",
  "/admin/reports": "Waste Reports",
  "/admin/posts": "News & Articles",
  "/admin/announcements": "Announcements",
  "/admin/schedule": "Collection Schedule",
  "/admin/routes": "Route Management",
  "/admin/residents": "Resident Accounts",
  "/admin/drivers": "Collector Manager",
  "/admin/tracking": "Live Truck Fleet",
  "/admin/analytics": "Analytics & Reports",
  "/admin/audit-logs": "Audit Logs",
  "/admin/notifications": "Notifications",
  "/admin/settings": "System Settings",
  "/admin/profile": "Admin Profile",
};

const getAdminPageTitle = (pathname: string) => {
  if (ADMIN_PAGE_TITLES[pathname]) return ADMIN_PAGE_TITLES[pathname];
  for (const [route, title] of Object.entries(ADMIN_PAGE_TITLES)) {
    if (route !== "/admin" && pathname.startsWith(route)) {
      return title;
    }
  }
  return "Admin Panel";
};

const AdminTopBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toggleSidebar } = useSidebar();
  const pageTitle = getAdminPageTitle(location.pathname);

  const postParam = searchParams.get("post");
  const postTitle = searchParams.get("title");
  const editParam = searchParams.get("edit");
  const isCreateAction = searchParams.get("action") === "create";

  const isPostSubView =
    location.pathname.startsWith("/admin/posts") &&
    (Boolean(postParam) || Boolean(editParam) || isCreateAction);

  const subViewTitle = isCreateAction
    ? "Create Article"
    : editParam
      ? postTitle ? `Edit: ${postTitle}` : "Edit Article"
      : postTitle || "Article Details";

  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [bellOpen, setBellOpen] = useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

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
    setBellOpen(false);

    if (n.ref_module === "reports") {
      navigate("/admin/reports");
    } else if (n.ref_module === "posts") {
      navigate("/admin/posts");
    } else if (n.ref_module === "announcements") {
      navigate("/admin/announcements");
    } else if (n.ref_module === "tracking") {
      navigate("/admin/routes");
    } else {
      navigate("/admin/notifications");
    }
  };

  const recentNotifications = notifications.slice(0, 5);

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
            onClick={() => navigate("/admin")}
            title="Go to Admin Dashboard"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/70 dark:bg-muted/50 hover:bg-primary/10 hover:border-primary/40 border border-border/70 text-muted-foreground hover:text-foreground font-semibold text-[11px] shadow-2xs shrink-0 transition-all duration-200 cursor-pointer active:scale-95 group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary group-hover:scale-110 transition-transform" />
            MENRO Candelaria
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          {isPostSubView ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete("post");
                    next.delete("title");
                    next.delete("edit");
                    next.delete("action");
                    return next;
                  });
                }}
                className="hover:underline text-muted-foreground font-medium truncate shrink-0 cursor-pointer"
              >
                News & Articles
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <span className="font-bold text-foreground truncate tracking-tight max-w-[120px] sm:max-w-[200px] md:max-w-[300px]">
                {subViewTitle}
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
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-secondary transition-colors relative w-8 h-8 flex items-center justify-center overflow-hidden cursor-pointer"
          title="Toggle Theme"
        >
          <Sun className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
          <Moon className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
        </button>

        {/* Notifications */}
        <Popover open={bellOpen} onOpenChange={setBellOpen}>
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
                <span className="font-semibold text-sm">Admin Notifications</span>
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

            <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
              {recentNotifications.length > 0 ? (
                recentNotifications.map((n) => {
                  const Icon = typeIcons[n.type] || Bell;
                  const isUnread = !n.is_read;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left cursor-pointer ${
                        isUnread ? "bg-primary/[0.04]" : ""
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${isUnread ? "text-foreground font-bold" : "text-foreground/80"}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {formatTimeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                          {n.body}
                        </p>
                      </div>
                      {isUnread && (
                        <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
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
                  setBellOpen(false);
                  navigate("/admin/notifications");
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

export default AdminTopBar;
