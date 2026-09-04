import { format } from "date-fns";
import { Sun, Moon, CloudSun, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: Sun };
  if (hour < 18) return { text: "Good afternoon", icon: CloudSun };
  return { text: "Good evening", icon: Moon };
};

const DashboardGreeting = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const today = new Date();
  const { text, icon: Icon } = getGreeting();

  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "Resident";
  const barangay = user?.barangay_name;

  return (
    <div className="mb-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm text-primary">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground font-display leading-tight tracking-tight">
                {text}, {firstName}!
              </h1>
              {barangay && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full shrink-0">
                  <MapPin className="w-3 h-3" />
                  {barangay}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Here is your real-time waste collection & community activity summary.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
          <span className="h-9 px-3 rounded-xl text-xs font-semibold text-muted-foreground bg-card border border-border/80 flex items-center shadow-xs">
            {format(today, "EEE, MMM d, yyyy")}
          </span>
          <Button
            size="sm"
            onClick={() => navigate("/resident/report")}
            className="rounded-xl h-9 px-3.5 text-xs font-semibold gap-1.5 shadow-sm shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>Report Waste</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardGreeting;
