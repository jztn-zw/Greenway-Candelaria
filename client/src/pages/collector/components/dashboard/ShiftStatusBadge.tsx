import { Circle, Truck, CheckCircle2 } from "lucide-react";
import type { ShiftStatus } from "./mockData";

const config: Record<ShiftStatus, { label: string; icon: typeof Circle; bg: string; text: string; dot: string }> = {
  "off-duty": { label: "Off Duty", icon: Circle, bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  "on-route": { label: "On Route", icon: Truck, bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  "completed": { label: "Completed", icon: CheckCircle2, bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
};

const ShiftStatusBadge = ({ status }: { status: ShiftStatus }) => {
  const c = config[status];
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${c.bg} ${c.text} text-sm font-semibold`}>
      <span className={`w-2 h-2 rounded-full ${c.dot} ${status === "on-route" ? "animate-pulse" : ""}`} />
      <c.icon className="w-4 h-4" />
      {c.label}
    </div>
  );
};

export default ShiftStatusBadge;
