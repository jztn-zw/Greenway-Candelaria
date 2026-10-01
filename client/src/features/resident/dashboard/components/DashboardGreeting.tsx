import { MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
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

  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "Resident";
  const barangay = user?.barangay_name;

  return (
    <div className="mb-1">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center md:gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="gw-page-title lg:text-ui-page-lg text-foreground tracking-tight">
              {greeting}, <span className="text-primary">{firstName}!</span>
            </h1>
            {barangay && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                <MapPin className="w-3 h-3" />
                <span>{barangay}</span>
              </span>
            )}
          </div>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">
            Here is your real-time waste collection & community activity summary.
          </p>
        </div>

        <div className="flex w-full shrink-0 items-center justify-between gap-2.5 md:w-auto md:justify-end">
          <span className="h-9 px-3.5 rounded-lg text-xs font-semibold text-muted-foreground bg-card border border-border/80 flex items-center shadow-2xs tabular-nums">
            {formatManilaDateTime(new Date(), {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <Button
            size="sm"
            onClick={() => navigate("/resident/report")}
            className="rounded-xl h-9 px-3.5 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Report Waste</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardGreeting;

