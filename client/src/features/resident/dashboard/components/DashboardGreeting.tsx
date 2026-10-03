import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { dashboardStyles } from "../dashboardStyles";
import { formatManilaDateTime, getManilaNow } from "@/utils/date";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";

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
    <ResidentPageHeader
      className={dashboardStyles.greeting}
      title={<>{greeting}, <span className="text-primary">{firstName}!</span></>}
      description="Here is your real-time waste collection & community activity summary."
      titleBadge={barangay && (
        <Badge className="max-w-full gap-1.5">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{barangay}</span>
        </Badge>
      )}
      actionsClassName={dashboardStyles.greetingActions}
      actions={<>
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
      </>}
    />
  );
};

export default DashboardGreeting;
