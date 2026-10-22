import { getStatusBadgeStyle, badgeStyles } from "@/components/ui/badgeStyles";
import { profileAvatarForAccount, profileAvatarImageSrc } from "@/components/common/profileAvatars";
import {
  Clock,
  CheckCircle2,
  Phone,
  Truck,
  CalendarDays,
  ShieldCheck,
  SquarePen,
  KeyRound,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Driver, Truck as TruckType, driverStatusStyles } from "../types";
import { adminCollectorManagerStyles as styles } from "@/components/common/communityContentStyles";
import { CollectorManagerActivitySkeleton } from "@/components/loading/PageLoadingSkeletons";
import { cn } from "@/lib/utils";
import { useState } from "react";
import CollectionRunDetails from "./CollectionRunDetails";

interface DriverDetailViewProps {
  driver: Driver;
  trucks: TruckType[];
  isActivityLoading?: boolean;
  isActivityRefreshing?: boolean;
  activityError?: string;
  onRetryActivity?: () => void;
  onEdit: (d: Driver) => void;
  onResetPassword: (d: Driver) => void;
  onToggleStatus: (d: Driver) => void;
}

const DriverDetailView = ({
  driver,
  trucks,
  isActivityLoading = false,
  isActivityRefreshing = false,
  activityError = "",
  onRetryActivity,
  onEdit,
  onResetPassword,
  onToggleStatus,
}: DriverDetailViewProps) => {
  const truck = trucks.find((t) => t.id === driver.truckId);
  const [selectedRun, setSelectedRun] = useState<{ driverId: string; runId: string } | null>(null);

  return (
    <div className={styles.detailPage}>
      <div>
        <h1 className="gw-heading text-xl sm:text-2xl text-foreground tracking-tight leading-tight">
          Collector Profile
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Detailed collector account information, truck assignment, and collection history.
        </p>
      </div>

      {/* ── Collector Profile Overview Card ── */}
      <div className={styles.profileCard}>
        <div className={styles.profileHeader}>
          <div className={styles.profileIdentity}>
            <div className="w-14 h-14 overflow-hidden rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-semibold text-lg font-body shrink-0 shadow-2xs">
              <img src={profileAvatarImageSrc(profileAvatarForAccount(driver.userId, driver.avatarUrl))} alt="" decoding="async" className="block h-full w-full object-cover object-center" />
            </div>
            <div>
              <div className={styles.profileName}>
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

          <div className={styles.profileActions}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(driver)}
              className="h-9 px-3.5 rounded-xl font-medium text-xs cursor-pointer shadow-2xs gap-1.5"
            >
              <SquarePen className="w-3.5 h-3.5 text-muted-foreground" />
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
            {driver.status === "Deactivated" && <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus(driver)}
              className="h-9 px-3.5 rounded-xl font-medium text-xs cursor-pointer shadow-2xs gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
              Reactivate
            </Button>}
          </div>
        </div>

        {/* Collector contact, assignment, and account details */}
        <div className={styles.profileDetails}>
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
          <CollectorManagerActivitySkeleton />
        ) : activityError ? (
          <DataRefreshNotice primary role="alert" message="Couldn't load collection activity. Please try again." onRetry={() => onRetryActivity?.()} retrying={isActivityRefreshing} />
        ) : driver.activityLog.length === 0 ? (
          <div className="bg-card border border-border/80 rounded-2xl p-12 text-center shadow-2xs">
            <p className="text-sm text-muted-foreground">
              No collection activity recorded yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {driver.activityLog.map((a) => (
              <div
                key={a.runId}
                role="button"
                tabIndex={0}
                aria-haspopup="dialog"
                aria-label={`View collection details for ${a.route}, ${a.date}. ${a.status}, ${a.completedStops} of ${a.totalStops} stops. ${a.startTime} to ${a.endTime}.`}
                onClick={() => setSelectedRun({ driverId: driver.id, runId: a.runId })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedRun({ driverId: driver.id, runId: a.runId });
                  }
                }}
                className={cn(styles.activity, "cursor-pointer hover:border-primary/30 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2")}
              >
                <div className={styles.activityHeader}>
                  <div className={styles.activityBadges}>
                    <span className="text-sm font-semibold font-body tabular-nums text-foreground">
                      {a.date}
                    </span>
                    <Badge
                      variant="outline"
                      className={"max-w-full whitespace-normal break-words text-xs font-semibold px-2.5 py-0.5 rounded-md " + badgeStyles.neutral.className}
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
      {selectedRun?.driverId === driver.id && <CollectionRunDetails key={`${driver.id}:${selectedRun.runId}`}
        driverId={driver.id} driverName={driver.fullName} runId={selectedRun.runId} onClose={() => setSelectedRun(null)} />}
    </div>
  );
};

export default DriverDetailView;
