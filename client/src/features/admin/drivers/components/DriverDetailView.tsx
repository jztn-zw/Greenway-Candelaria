import {
  ArrowLeft,
  Truck,
  Phone,
  Clock,
  CheckCircle2,
  MessageSquare,
  Edit2,
  KeyRound,
  UserX,
  UserCheck,
  Mail,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Driver, Truck as TruckType, driverStatusStyles } from "../types";

interface DriverDetailViewProps {
  driver: Driver;
  trucks: TruckType[];
  isActivityLoading?: boolean;
  onBack: () => void;
  onEdit: (d: Driver) => void;
  onResetPassword: (d: Driver) => void;
  onToggleStatus: (d: Driver) => void;
}

const getInitials = (name: string): string => {
  if (!name) return "CL";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const DriverDetailView = ({
  driver,
  trucks,
  isActivityLoading = false,
  onBack,
  onEdit,
  onResetPassword,
  onToggleStatus,
}: DriverDetailViewProps) => {
  const truck = trucks.find((t) => t.id === driver.truckId);

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      {/* ── Top Navigation & Page Header ── */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/70 dark:bg-muted/50 hover:bg-primary/10 border border-border/70 hover:border-primary/30 text-muted-foreground hover:text-primary text-xs font-semibold shadow-2xs transition-all duration-200 cursor-pointer active:scale-95 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
          Back to Collectors
        </button>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight leading-tight">
            Collector Profile
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Personnel credentials, truck assignment, and route collection history.
          </p>
        </div>
      </div>

      {/* ── Collector Profile Bento Card ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 pb-6 border-b border-border/60">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xl font-display shrink-0 shadow-xs">
              {getInitials(driver.fullName)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
                  {driver.fullName}
                </h2>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                    driverStatusStyles[driver.status] || ""
                  }`}
                >
                  {driver.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                @{driver.username}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(driver)}
              className="h-9 px-3.5 rounded-xl border-border/80 hover:bg-muted font-semibold text-xs gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResetPassword(driver)}
              className="h-9 px-3.5 rounded-xl border-border/80 hover:bg-muted font-semibold text-xs gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            >
              <KeyRound className="w-3.5 h-3.5" /> Reset Password
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus(driver)}
              className="h-9 px-3.5 rounded-xl border-border/80 hover:bg-muted font-semibold text-xs gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            >
              {driver.status === "Active" ? (
                <>
                  <UserX className="w-3.5 h-3.5 text-rose-500" /> Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Reactivate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Metadata Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" /> Contact Number
            </p>
            <p className="text-sm font-semibold text-foreground">
              {driver.contactNumber || "N/A"}
            </p>
          </div>

          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {driver.email || "N/A"}
            </p>
          </div>

          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-primary" /> Assigned Truck
            </p>
            {truck ? (
              <p className="text-sm font-semibold text-foreground truncate">
                {truck.name} — {truck.model} ({truck.plateNumber})
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/70 italic">None assigned</p>
            )}
          </div>

          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" /> Last Login
            </p>
            <p className="text-sm font-semibold text-foreground">
              {driver.lastLogin || "Never"}
            </p>
          </div>

          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-primary" /> Date Added
            </p>
            <p className="text-sm font-semibold text-foreground">
              {driver.dateAdded || "N/A"}
            </p>
          </div>

          <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground">Account Status</p>
            <p className="text-sm font-semibold text-foreground">
              {driver.status === "Active" ? "Operational & Ready" : "Account Suspended"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Collection Activity Log ── */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold font-display text-foreground tracking-tight">
            Collection Activity Log
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Historical collection routes completed by this collector.
          </p>
        </div>

        {isActivityLoading ? (
          <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-2xs">
            <p className="text-sm text-muted-foreground">Loading activity...</p>
          </div>
        ) : driver.activityLog.length === 0 ? (
          <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-2xs">
            <p className="text-sm text-muted-foreground">
              No collection activity recorded yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {driver.activityLog.map((a, i) => (
              <div
                key={i}
                className="bg-card border border-border/80 rounded-2xl p-5 space-y-3 shadow-2xs hover:border-primary/30 transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold font-display text-foreground">
                      {a.date}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-0.5 rounded-md"
                    >
                      {a.route}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {a.startTime} – {a.endTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>
                      {a.barangaysCompleted}/{a.barangaysTotal} barangays
                    </span>
                  </div>
                  <Progress
                    value={(a.barangaysCompleted / a.barangaysTotal) * 100}
                    className="flex-1 h-2 rounded-full"
                  />
                </div>

                {a.statusMessages.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
                    {a.statusMessages.map((m, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 text-[11px] bg-muted/60 text-muted-foreground rounded-md px-2.5 py-1 border border-border/40"
                      >
                        <MessageSquare className="w-3 h-3 text-muted-foreground/70" />{" "}
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDetailView;
