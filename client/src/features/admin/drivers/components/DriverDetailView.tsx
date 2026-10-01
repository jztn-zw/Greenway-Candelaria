import { getStatusBadgeStyle, badgeStyles } from "@/components/ui/badgeStyles";
import {
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  Truck,
  CalendarDays,
  ShieldCheck,
  Edit2,
  KeyRound,
  UserX,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Driver, Truck as TruckType, driverStatusStyles } from "../types";

interface DriverDetailViewProps {
  driver: Driver;
  trucks: TruckType[];
  isActivityLoading?: boolean;
  activityError?: string;
  onRetryActivity?: () => void;
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
  activityError = "",
  onRetryActivity,
  onEdit,
  onResetPassword,
  onToggleStatus,
}: DriverDetailViewProps) => {
  const truck = trucks.find((t) => t.id === driver.truckId);

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="gw-heading text-xl sm:text-2xl text-foreground tracking-tight leading-tight">
          Collector Profile
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Detailed collector account information, truck assignment, and collection history.
        </p>
      </div>

      {/* ── Collector Profile Overview Card ── */}
      <div className="bg-card border border-border/80 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-semibold text-lg font-body shrink-0 shadow-2xs">
              {getInitials(driver.fullName)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="gw-heading text-xl sm:text-2xl text-foreground tracking-tight">
                  {driver.fullName}
                </h2>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border shadow-2xs ${
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
              className="h-9 px-3.5 rounded-xl font-medium text-xs cursor-pointer shadow-2xs gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
              Edit Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResetPassword(driver)}
              className="h-9 px-3.5 rounded-xl font-medium text-xs cursor-pointer shadow-2xs gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
              Reset Password
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus(driver)}
              className="h-9 px-3.5 rounded-xl font-medium text-xs cursor-pointer shadow-2xs gap-1.5"
            >
              {driver.status === "Active" ? (
                <>
                  <UserX className="w-3.5 h-3.5 text-muted-foreground" />
                  Deactivate
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  Reactivate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Structured Information Grid (2 Layers, Typography-Driven) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-5 gap-x-6 pt-6 border-t border-border/60">
          {/* Layer 1: Primary Contact & Assigned Vehicle */}
          <div className="space-y-1.5">
            <span className="text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground/70" />
              Contact Number
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground font-sans tabular-nums">
              {driver.contactNumber || "N/A"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
              Email Address
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground truncate" title={driver.email}>
              {driver.email || "N/A"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-muted-foreground/70" />
              Assigned Truck
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground truncate">
              {truck ? (
                <span>
                  {truck.name} · <span className="font-sans tabular-nums font-semibold">{truck.plateNumber}</span>
                </span>
              ) : (
                <span className="text-muted-foreground italic">None assigned</span>
              )}
            </p>
          </div>

          {/* Layer 2: Activity & Account */}
          <div className="space-y-1.5">
            <span className="text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/70" />
              Date Added
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {driver.dateAdded || "N/A"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground/70" />
              Last Login
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {driver.lastLogin || "Never"}
            </p>
          </div>

          <div className="space-y-1.5">
            <span className="text-ui-caption font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/70" />
              Account Status
            </span>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              {driver.status === "Active" ? "Account Active" : "Account Deactivated"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Collection Activity Log ── */}
      <div className="space-y-4">
        <div>
          <h3 className="gw-heading text-lg text-foreground tracking-tight">
            Collection Activity Log
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Historical collection runs assigned to this collector.
          </p>
        </div>

        {isActivityLoading ? (
          <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-2xs">
            <p className="text-sm text-muted-foreground">Loading activity...</p>
          </div>
        ) : activityError ? (
          <div className="bg-card border border-border/80 rounded-2xl p-8 text-center shadow-2xs">
            <p role="alert" className="text-sm text-destructive">Could not load collection activity. {activityError}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetryActivity}>Retry</Button>
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
                    <span className="text-sm font-semibold font-body tabular-nums text-foreground">
                      {a.date}
                    </span>
                    <Badge
                      variant="outline"
                      className={"text-xs font-semibold px-2.5 py-0.5 rounded-md " + badgeStyles.neutral.className}
                    >
                      {a.route}
                    </Badge>
                    <Badge variant="outline" className={"text-xs font-semibold rounded-md " + getStatusBadgeStyle(a.status).className}>
                      {a.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {a.startTime} – {a.endTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>
                      {a.completedStops}/{a.totalStops} stops
                    </span>
                  </div>
                  <Progress
                    value={a.totalStops ? (a.completedStops / a.totalStops) * 100 : 0}
                    className="flex-1 h-2 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDetailView;
