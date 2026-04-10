import { Card, CardContent } from "@/components/ui/card";
import { ClipboardList, FileText, Truck, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const stats = [
  {
    label: "Reports Submitted",
    value: 4,
    icon: ClipboardList,
    trend: "+1 this week",
    to: "/resident/my-reports",
  },
  {
    label: "New Posts",
    value: 2,
    icon: FileText,
    trend: "2 unread",
    to: "/resident/contents",
  },
  {
    label: "Active Trucks",
    value: 1,
    max: 2,
    icon: Truck,
    trend: "1 of 2 on route",
    to: "/resident/tracking",
  },
];

const StatsCards = () => {
  const navigate = useNavigate();

  return (
    <div className="grid gap-3 grid-cols-3">
      {stats.map((s) => (
        <Card
          key={s.label}
          className="cursor-pointer hover:shadow-md transition-all border border-border active:scale-[0.98]"
          onClick={() => navigate(s.to)}
        >
          <CardContent className="p-3 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="w-4 h-4 text-primary" />
              </div>
              <TrendingUp className="w-3 h-3 text-primary hidden sm:block" />
            </div>
            <p className="text-xl sm:text-3xl font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">{s.label}</p>
            <p className="text-[9px] sm:text-[10px] text-primary font-medium mt-1 hidden sm:block">{s.trend}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
