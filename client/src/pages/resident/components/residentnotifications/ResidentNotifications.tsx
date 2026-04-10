import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, CheckCheck, CalendarClock, Truck, CheckCircle2, AlertTriangle,
  Megaphone, CircleAlert, FileText, Newspaper, Clock, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ResidentNotification, NotificationCategory } from "./types";
import { categoryForType } from "./types";
import { mockNotifications } from "./notificationData";
import NotificationModal from "./NotificationModal";
import { PageHeaderSkeleton, NotificationsPageSkeleton } from "@/components/PageLoadingSkeletons";

const PAGE_SIZE = 20;

const tabs: { key: NotificationCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "collection", label: "Collection" },
  { key: "reports", label: "Reports" },
  { key: "content", label: "Content" },
  { key: "announcements", label: "Announcements" },
];

const typeIcons: Record<string, React.ElementType> = {
  "collection-reminder": CalendarClock,
  "truck-near": Truck,
  "collection-done": CheckCircle2,
  "schedule-change": AlertTriangle,
  "system-announcement": Megaphone,
  "missed-collection": CircleAlert,
  "report-update": FileText,
  "new-content": Newspaper,
};

const typeAccents: Record<string, string> = {
  "collection-reminder": "bg-primary/10 text-primary",
  "truck-near": "bg-primary/10 text-primary",
  "collection-done": "bg-primary/10 text-primary",
  "schedule-change": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "system-announcement": "bg-primary/10 text-primary",
  "missed-collection": "bg-destructive/10 text-destructive",
  "report-update": "bg-primary/10 text-primary",
  "new-content": "bg-primary/10 text-primary",
};

const typeLabels: Record<string, string> = {
  "collection-reminder": "Collection",
  "truck-near": "Collection",
  "collection-done": "Collection",
  "schedule-change": "Schedule",
  "system-announcement": "Announcement",
  "missed-collection": "Alert",
  "report-update": "Report",
  "new-content": "Content",
};

const modalTypes = new Set(["collection-reminder", "truck-near", "collection-done", "schedule-change", "system-announcement", "missed-collection"]);

const ResidentNotifications = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<ResidentNotification[]>(mockNotifications);
  const [activeTab, setActiveTab] = useState<NotificationCategory>("all");
  const [modalNotification, setModalNotification] = useState<ResidentNotification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter((n) => categoryForType[n.type] === activeTab);
  }, [notifications, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const tabUnread = (cat: NotificationCategory) => {
    if (cat === "all") return unreadCount;
    return notifications.filter((n) => !n.read && categoryForType[n.type] === cat).length;
  };

  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const handleClick = (n: ResidentNotification) => {
    setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));

    if (modalTypes.has(n.type)) {
      setModalNotification(n);
      setModalOpen(true);
    } else if (n.type === "report-update") {
      navigate("/resident/my-reports");
    } else if (n.type === "new-content") {
      navigate("/resident/contents");
    }
  };

  const grouped = useMemo(() => {
    const groups: { label: string; items: ResidentNotification[] }[] = [];
    const today: ResidentNotification[] = [];
    const yesterday: ResidentNotification[] = [];
    const older: ResidentNotification[] = [];

    paginated.forEach((n) => {
      const t = n.time.toLowerCase();
      if (t.includes("minute") || t.includes("hour")) today.push(n);
      else if (t.includes("yesterday")) yesterday.push(n);
      else older.push(n);
    });

    if (today.length) groups.push({ label: "Today", items: today });
    if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
    if (older.length) groups.push({ label: "Earlier", items: older });
    return groups;
  }, [paginated]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-5">
        <PageHeaderSkeleton />
        <NotificationsPageSkeleton />
      </div>
    );
  }

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
              <p className="text-sm text-muted-foreground">Stay updated with your latest notifications</p>
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
        <Card className="p-5 border border-border hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Notifications</p>
              <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">{notifications.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">All time</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border border-border hover:shadow-md transition-shadow">
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
        <Card className="p-5 border border-border hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Collection Alerts</p>
              <p className="text-2xl font-bold text-foreground mt-2 tabular-nums">
                {notifications.filter((n) => categoryForType[n.type] === "collection").length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Reminders & updates</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-primary" />
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
                  onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
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
            <p className="text-sm text-muted-foreground mt-1">No new notifications.</p>
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

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <NotificationModal notification={modalNotification} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
};

export default ResidentNotifications;
