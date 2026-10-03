import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { dashboardStyles } from "../dashboardStyles";
import { formatManilaDateTime, getManilaNow } from "@/utils/date";

const getGreeting = () => {
  const hour = getManilaNow().hour;
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const DashboardGreeting = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const greeting = getGreeting();
  const now = new Date();

  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "Resident";
  const barangay = user?.barangay_name;

  return (
    <div className="py-1">
      <div className={dashboardStyles.greeting}>
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="gw-page-title max-w-full break-words text-foreground tracking-tight">
              {greeting}, <span className="text-primary">{firstName}!</span>
            </h1>
            {barangay && (
              <Badge className="max-w-full gap-1.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{barangay}</span>
              </Badge>
            )}
          </div>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">
            Here is your real-time waste collection & community activity summary.
          </p>
        </div>

        <div className={dashboardStyles.greetingActions}>
          <time className={dashboardStyles.dateBadge} dateTime={getManilaNow(now).dateKey}>
            <span>{formatManilaDateTime(now, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}</span>
          </time>
          <Button
            size="sm"
            onClick={() => navigate("/resident/report")}
            className="h-10 gap-1.5 px-3.5 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Report waste</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardGreeting;
