import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle, Truck, FileText, Phone, Mail, MapPin, ChevronRight,
  Megaphone, ClipboardCheck, Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Context-aware actions (mock conditions)
const hasActiveTruck = true;
const updatedReportsCount = 1;
const hasNewAnnouncement = false;

const getContextActions = () => {
  const actions = [];

  if (hasActiveTruck) {
    actions.push({
      label: "Track Your Truck",
      desc: "Truck is on route now",
      icon: Truck,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      to: "/resident/tracking",
      badge: null,
    });
  }

  if (updatedReportsCount > 0) {
    actions.push({
      label: "Check Report Status",
      desc: `${updatedReportsCount} report updated`,
      icon: ClipboardCheck,
      iconBg: "bg-earth",
      iconColor: "text-earth-dark",
      to: "/resident/my-reports",
      badge: updatedReportsCount,
    });
  }

  if (hasNewAnnouncement) {
    actions.push({
      label: "Read Latest Announcement",
      desc: "New post from MENRO",
      icon: Megaphone,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      to: "/resident/contents",
      badge: null,
    });
  }

  // Fill remaining with defaults
  const defaults = [
    { label: "Submit Report", desc: "Report waste violations", icon: AlertTriangle, iconBg: "bg-destructive/10", iconColor: "text-destructive", to: "/resident/report", badge: null },
    { label: "View Tracking", desc: "See truck locations", icon: Truck, iconBg: "bg-primary/10", iconColor: "text-primary", to: "/resident/tracking", badge: null },
    { label: "Read Content", desc: "Tips & announcements", icon: FileText, iconBg: "bg-accent/10", iconColor: "text-accent", to: "/resident/contents", badge: null },
  ];

  for (const d of defaults) {
    if (actions.length >= 3) break;
    if (!actions.some((a) => a.to === d.to)) actions.push(d);
  }

  return actions.slice(0, 3);
};

const QuickActionsAndContact = () => {
  const navigate = useNavigate();
  const actions = getContextActions();

  return (
    <div className="space-y-3">
      {/* Quick Actions */}
      <Card className="border border-border overflow-hidden">
        <CardHeader className="pb-1 px-4 sm:px-6">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-5 pb-3 space-y-1">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.to)}
              className="w-full flex items-center gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-muted/60 transition-all text-left active:scale-[0.98] group"
            >
              <div className={`w-8 h-8 rounded-lg ${a.iconBg} flex items-center justify-center shrink-0`}>
                <a.icon className={`w-4 h-4 ${a.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-foreground">{a.label}</span>
                  {a.badge && (
                    <span className="px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                      {a.badge}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{a.desc}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>
          ))}
        </CardContent>
      </Card>

      {/* MENRO Contact */}
      <Card className="border border-border">
        <CardHeader className="pb-1 px-4 sm:px-6">
          <CardTitle className="text-sm font-bold text-foreground">MENRO Contact</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 space-y-2.5">
          {[
            { icon: Phone, text: "(042) 123-4567" },
            { icon: Mail, text: "menro@candelaria.gov.ph" },
            { icon: MapPin, text: "Candelaria Municipal Hall" },
          ].map((c) => (
            <div key={c.text} className="flex items-center gap-3 text-xs sm:text-sm">
              <c.icon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-foreground">{c.text}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickActionsAndContact;
