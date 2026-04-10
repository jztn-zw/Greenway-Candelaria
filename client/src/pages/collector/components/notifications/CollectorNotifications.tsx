import { useState, useMemo, useEffect } from "react";
import {
  Bell, CheckCheck, MessageSquareText, Route, SkipForward,
  CheckCircle2, Shield, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CollectorNotification, CollectorNotificationCategory } from "./types";
import { categoryForType } from "./types";
import { mockCollectorNotifications } from "./mockData";
import CollectorNotificationModal from "./CollectorNotificationModal";

const NotificationsSkeleton = () => (
  <div className="w-full max-w-[1600px] mx-auto space-y-5">
    <div className="flex items-center gap-3 mb-6">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-3 w-52" />
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-5 border border-border">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-10" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="w-10 h-10 rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center gap-1 px-4 py-3 border-b border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md" />
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-border">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </Card>
  </div>
);

const tabs: { key: CollectorNotificationCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "operations", label: "Operations" },
  { key: "routes", label: "Routes" },
  { key: "system", label: "System" },
];

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
  "system-alert": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

const typeLabels: Record<string, string> = {
  "admin-message": "Admin",
  "route-alert": "Route",
  "skip-acknowledged": "Skip",
  "route-completed": "Completed",
  "system-alert": "System",
};

const CollectorNotifications = () => {
  const [notifications, setNotifications] = useState<CollectorNotification[]>(mockCollectorNotifications);
  const [activeTab, setActiveTab] = useState<CollectorNotificationCategory>("all");
  const [modalNotification, setModalNotification] = useState<CollectorNotification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter((n) => categoryForType[n.type] === activeTab);
  }, [notifications, activeTab]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const tabUnread = (cat: CollectorNotificationCategory) => {
    if (cat === "all") return unreadCount;
    return notifications.filter((n) => !n.read && categoryForType[n.type] === cat).length;
  };

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const handleClick = (n: CollectorNotification) => {
    setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
    setModalNotification(n);
    setModalOpen(true);
  };

  // Group by relative day
  const grouped = useMemo(() => {
    const groups: { label: string; items: CollectorNotification[] }[] = [];
    const today: CollectorNotification[] = [];
    const yesterday: CollectorNotification[] = [];
    const older: CollectorNotification[] = [];

    filtered.forEach((n) => {
      const t = n.time.toLowerCase();
      if (t.includes("minute") || t.includes("hour")) today.push(n);
      else if (t.includes("yesterday")) yesterday.push(n);
      else older.push(n);
    });

    if (today.length) groups.push({ label: "Today", items: today });
    if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
    if (older.length) groups.push({ label: "Earlier", items: older });
    return groups;
  }, [filtered]);

  if (isLoading) return <NotificationsSkeleton />;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground font-display">Notifications</h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Route updates, admin messages & system alerts</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="h-9 text-xs gap-2" onClick={markAllRead}>
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border border-border relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">{notifications.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">All notifications</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border border-border relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unread</p>
              <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">{unreadCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Needs attention</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border border-border relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Admin Messages</p>
              <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
                {notifications.filter((n) => n.type === "admin-message").length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Supervisor instructions</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <MessageSquareText className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center border-b border-border px-4">
          <div className="flex items-center gap-1 -mb-px overflow-x-auto flex-1">
            {tabs.map((tab) => {
              const count = tabUnread(tab.key);
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
                    ${active ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className={`ml-1.5 inline-flex items-center justify-center text-[10px] font-bold rounded-full w-5 h-5
                      ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notification List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-lg font-display font-semibold text-foreground">You're all caught up</p>
            <p className="text-sm text-muted-foreground mt-1">No notifications in this category.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">{group.label}</p>
                </div>
                <div>
                  {group.items.map((n) => {
                    const Icon = typeIcons[n.type] || Bell;
                    const accent = typeAccents[n.type] || "bg-muted text-muted-foreground";
                    const label = typeLabels[n.type] || "";
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={`w-full flex items-start gap-4 px-5 py-4 text-left transition-all duration-200 group/item
                          ${n.read
                            ? "hover:bg-muted/30"
                            : "bg-primary/[0.03] hover:bg-primary/[0.06] border-l-2 border-l-primary"
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${accent} transition-transform group-hover/item:scale-105`}>
                          <Icon className="w-[18px] h-[18px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium truncate ${n.read ? "text-muted-foreground" : "text-foreground"}`}>
                              {n.title}
                            </p>
                            {!n.read && <span className="w-2 h-2 bg-primary rounded-full shrink-0 animate-pulse" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              n.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                            }`}>
                              {label}
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-[10px] text-muted-foreground">{n.time}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <CollectorNotificationModal notification={modalNotification} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
};

export default CollectorNotifications;
