import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Sun, Moon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import authService from "@/services/authService";

interface Notification {
  id: string;
  type: "alert" | "info" | "success" | "warning";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  { id: "1", type: "info", title: "New Content Posted", message: "Check out the latest waste segregation guide for your barangay.", time: "2 minutes ago", read: false },
  { id: "2", type: "alert", title: "Collection Schedule Change", message: "Tomorrow's biodegradable collection has been moved to Thursday.", time: "1 hour ago", read: false },
  { id: "3", type: "success", title: "Report Resolved", message: "Your report #1042 about illegal dumping has been resolved.", time: "Yesterday", read: true },
  { id: "4", type: "warning", title: "Truck Delay", message: "The collection truck for your area is running 30 minutes late.", time: "2 days ago", read: true },
  { id: "5", type: "info", title: "Welcome to GreenWay", message: "Thank you for joining! Explore the dashboard to get started.", time: "3 days ago", read: true },
];

const ResidentTopBar = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const username = currentUser?.username?.trim() || "resident";
  const fullName = currentUser?.full_name?.trim() || "Unknown User";
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || username.slice(0, 2).toUpperCase();
  const [dark, setDark] = useState(document.documentElement.classList.contains("dark"));
  const [notifications, setNotifications] = useState(mockNotifications);

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

  const typeIcon = (type: Notification["type"]) => {
    const colors = {
      alert: "bg-destructive/10 text-destructive",
      info: "bg-primary/10 text-primary",
      success: "bg-leaf/20 text-foreground",
      warning: "bg-earth text-earth-dark",
    };
    return colors[type];
  };

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur flex items-center justify-between px-4 shrink-0 sticky top-0 z-40">
      {/* Left */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="md:hidden p-2 rounded-md hover:bg-secondary transition-colors" />
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-muted-foreground">MENRO Candelaria</span>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-xs font-semibold text-foreground">Dashboard</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme toggle with transition */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-secondary transition-colors relative w-8 h-8 flex items-center justify-center overflow-hidden"
        >
          <Sun className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
          <Moon className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
        </button>

        {/* Notifications */}
        <Popover>
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
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all as read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${typeIcon(n.type)}`}>
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
            <div className="border-t px-4 py-2.5">
              <a href="/resident/notifications" className="text-xs text-primary hover:underline font-medium">
                View all notifications
              </a>
            </div>
          </PopoverContent>
        </Popover>

        {/* User */}
        <button onClick={() => navigate("/resident/profile")} className="flex items-center gap-2 ml-1 pl-2 border-l hover:opacity-80 transition-opacity">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold text-foreground leading-tight">{username}</p>
            <p className="text-[10px] text-muted-foreground">Resident</p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default ResidentTopBar;
