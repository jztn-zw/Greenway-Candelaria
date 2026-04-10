import { format } from "date-fns";
import { Sun, Moon, CloudSun } from "lucide-react";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: "Good morning", icon: Sun };
  if (hour < 18) return { text: "Good afternoon", icon: CloudSun };
  return { text: "Good evening", icon: Moon };
};

const DashboardGreeting = () => {
  const today = new Date();
  const { text, icon: Icon } = getGreeting();

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display leading-tight">
              {text}, Resident!
            </h1>
            <p className="text-sm text-muted-foreground">
              Here's what's happening in your area today.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            {format(today, "EEE, MMM d")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DashboardGreeting;
