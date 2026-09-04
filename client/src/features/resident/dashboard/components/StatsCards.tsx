import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, Bell, Truck, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchMyReportStats } from "@/services/profileService";
import { fetchLiveTrucks } from "@/services/trackingService";
import { fetchUnreadCount } from "@/services/notificationsService";

const StatsCards = () => {
  const navigate = useNavigate();
  const [reportTotal, setReportTotal] = useState(0);
  const [resolvedTotal, setResolvedTotal] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [activeTrucks, setActiveTrucks] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      try {
        const [statsRes, trucksRes, unreadRes] = await Promise.allSettled([
          fetchMyReportStats(),
          fetchLiveTrucks(),
          fetchUnreadCount(),
        ]);

        if (!mounted) return;

        if (statsRes.status === "fulfilled") {
          setReportTotal(statsRes.value.total || 0);
          setResolvedTotal(statsRes.value.resolved || 0);
        }
        if (trucksRes.status === "fulfilled") {
          const live = trucksRes.value.filter((t) => t.truck_status === "ON_THE_WAY").length;
          setActiveTrucks(live);
        }
        if (unreadRes.status === "fulfilled") {
          setUnreadNotifs(unreadRes.value || 0);
        }
      } catch {
        // graceful fallback
      }
    };

    void loadStats();
  }, []);

  const stats = [
    {
      label: "My Waste Reports",
      value: reportTotal,
      subValue: `${resolvedTotal} resolved`,
      icon: ClipboardList,
      color: "bg-primary/10 text-primary border-primary/20",
      to: "/resident/my-reports",
    },
    {
      label: "Unread Alerts",
      value: unreadNotifs,
      subValue: unreadNotifs > 0 ? "Requires review" : "All caught up",
      icon: Bell,
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      to: "/resident/notifications",
    },
    {
      label: "Active Trucks",
      value: activeTrucks,
      subValue: activeTrucks > 0 ? "On route today" : "Fleet on standby",
      icon: Truck,
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      to: "/resident/tracking",
    },
  ];

  return (
    <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-3">
      {stats.map((s) => (
        <Card
          key={s.label}
          className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all border border-border/80 bg-card/80 backdrop-blur-sm active:scale-[0.99] group"
          onClick={() => navigate(s.to)}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <span className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-display tracking-tight">
              {s.value}
            </p>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5 truncate">
              {s.label}
            </p>
            <p className="text-[11px] font-medium text-primary mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {s.subValue}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;

