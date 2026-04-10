import {
  ArrowLeft, Truck, Phone, Clock, CheckCircle2, MessageSquare, Edit2, KeyRound, UserX, UserCheck, IdCard, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Driver, Truck as TruckType } from "../types";

interface DriverDetailViewProps {
  driver: Driver;
  trucks: TruckType[];
  isActivityLoading?: boolean;
  onBack: () => void;
  onEdit: (d: Driver) => void;
  onResetPassword: (d: Driver) => void;
  onToggleStatus: (d: Driver) => void;
}

const DriverDetailView = ({
  driver,
  trucks,
  isActivityLoading = false,
  onBack,
  onEdit,
  onResetPassword,
  onToggleStatus,
}: DriverDetailViewProps) => {
  const truck = trucks.find(t => t.id === driver.truckId);

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Collectors
      </Button>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Truck className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display">{driver.fullName}</h2>
              <p className="text-sm text-muted-foreground">@{driver.username}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(driver)} className="gap-1.5">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onResetPassword(driver)} className="gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Reset Password
            </Button>
            <Button variant="outline" size="sm" onClick={() => onToggleStatus(driver)} className="gap-1.5">
              {driver.status === "Active" ? <><UserX className="w-3.5 h-3.5" /> Deactivate</> : <><UserCheck className="w-3.5 h-3.5" /> Reactivate</>}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" /> Contact</p>
            <p className="text-sm font-medium">{driver.contactNumber}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><IdCard className="w-3 h-3" /> Email</p>
            <p className="text-sm font-medium">{driver.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Truck className="w-3 h-3" /> Assigned Truck</p>
            <p className="text-sm font-medium">{truck ? `${truck.name} — ${truck.model} (${truck.plateNumber})` : "None"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="w-3 h-3" /> Last Login</p>
            <p className="text-sm font-medium">{driver.lastLogin}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Date Added</p>
            <p className="text-sm font-medium">{driver.dateAdded}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant="outline" className={driver.status === "Active"
              ? "bg-[hsl(var(--leaf))]/10 text-[hsl(var(--leaf))] border-[hsl(var(--leaf))]/20"
              : "bg-destructive/10 text-destructive border-destructive/20"
            }>{driver.status}</Badge>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold font-display">Collection Activity Log</h3>
        {isActivityLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading activity...</p>
        ) : driver.activityLog.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No activity recorded yet.</p>
        ) : driver.activityLog.map((a, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold">{a.date}</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">{a.route}</Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {a.startTime} – {a.endTime}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                <span>{a.barangaysCompleted}/{a.barangaysTotal} barangays</span>
              </div>
              <Progress value={(a.barangaysCompleted / a.barangaysTotal) * 100} className="flex-1 h-2" />
            </div>
            {a.statusMessages.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {a.statusMessages.map((m, j) => (
                  <span key={j} className="inline-flex items-center gap-1 text-xs bg-muted/50 text-muted-foreground rounded-md px-2 py-1">
                    <MessageSquare className="w-3 h-3" /> {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DriverDetailView;
