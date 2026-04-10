import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Sun, Moon, MessageSquareText, Route, SkipForward,
  CheckCircle2, Shield, CheckCheck,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { CollectorNotification } from "./notifications/types";
import { mockCollectorNotifications } from "./notifications/mockData";
import authService from "@/services/authService";

const typeIcons: Record<string, React.ElementType> = {
  "admin-message": MessageSquareText,
  "route-alert": Route,
  "skip-acknowledged": SkipForward,
  "route-completed": CheckCircle2,
  "system-alert": Shield,
};

const typeAccents: Record<string, string> = {
  "admin-message": "bg-primary/10 text-primary",
  "route-alert": "bg-primary/10 text-primary",
  "skip-acknowledged": "bg-leaf/15 text-foreground",
  "route-completed": "bg-leaf/15 text-foreground",
  "system-alert": "bg-amber-500/10 text-amber-600",
};

const CollectorTopBar = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const username = currentUser?.username?.trim() || "collector";
  const fullName = currentUser?.full_name?.trim() || "Unknown User";
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || username.slice(0, 2).toUpperCase();
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [notifications, setNotifications] = useState<CollectorNotification[]>(mockCollectorNotifications);
  const [bellOpen, setBellOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleTheme = () => {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    setDark(nextDark);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (n: CollectorNotification) => {
    markAsRead(n.id);
    setBellOpen(false);
    navigate("/collector/notifications");
  };

  const recent5 = notifications.slice(0, 5);

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur flex items-center justify-between px-4 shrink-0 sticky top-0 z-40">
      {/* Left */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden p-2 rounded-md hover:bg-secondary transition-colors" />
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">MENRO Candelaria</span>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-xs font-semibold text-foreground">Collector Panel</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-secondary transition-colors relative w-8 h-8 flex items-center justify-center overflow-hidden"
        >
          <Sun className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
          <Moon className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
        </button>

        {/* Notifications */}
        <Popover open={bellOpen} onOpenChange={setBellOpen}>
          <PopoverTrigger asChild>
            <button className="p-2 rounded-md hover:bg-secondary transition-colors relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {recent5.map((n) => {
                const Icon = typeIcons[n.type] || Bell;
                const accent = typeAccents[n.type] || "bg-muted text-muted-foreground";
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left border-b last:border-b-0
                      ${n.read ? "hover:bg-muted/30" : "bg-primary/[0.03] hover:bg-primary/[0.06]"}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-medium truncate ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                          {n.title}
                        </p>
                        {!n.read && <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-muted-foreground mt-1 block">{n.time}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="border-t px-4 py-2.5 text-center">
              <button
                onClick={() => { setBellOpen(false); navigate("/collector/notifications"); }}
                className="text-xs text-primary hover:underline font-medium"
              >
                View all notifications
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User */}
        <button onClick={() => navigate("/collector/profile")} className="flex items-center gap-2 ml-1 pl-2 border-l hover:opacity-80 transition-opacity">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-foreground leading-tight">{username}</p>
            <p className="text-[10px] text-muted-foreground">Collector</p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default CollectorTopBar;
