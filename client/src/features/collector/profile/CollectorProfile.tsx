import { collectorBadgeClassName } from "@/features/collector/components/collectorBadgeStyles";
import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import { useState,useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { collectorKey,useCollectorAction,useCollectorQuery } from "@/lib/collectorQuery";
import { useNavigate } from "react-router-dom";
import {
Calendar,
User,
Mail,
Phone,
Lock,
Truck,
Eye,
EyeOff,
Wrench,
Users,
ChevronRight,
LogOut,
ShieldCheck,
AtSign,
SquarePen,
} from "lucide-react";
import { ProfileAvatarControl,ProfileAvatarPicker } from "@/components/common/ProfileAvatarPicker";
import { DEFAULT_PROFILE_AVATAR_ID,isProfileAvatarId,profileAvatarForAccount,profileAvatarIdFromUrl,profileAvatarSrc,type ProfileAvatarId } from "@/components/common/profileAvatars";
import { Button } from "@/components/ui/button";
import PageErrorState from "@/components/feedback/PageErrorState";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { PageRetryContext } from "@/components/feedback/pageRetryContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog,DialogContent } from "@/components/ui/dialog";
import { CollectorProfileSkeleton } from "@/components/loading/PageLoadingSkeletons";
import ProfileBannerImage from "@/components/common/ProfileBannerImage";
import useAuthStore from "@/store/authStore";
import {
fetchProfile,
updateProfile,
changePassword,
UserProfile,
} from "@/services/profileService";
import {
fetchDriverMe,
reportTruckBreakdown,
} from "@/services/driverManagerService";
import { toast } from "@/lib/toast";
import { formatManilaDateTime } from "@/utils/date";
import TruckBreakdownDialog from "../components/TruckBreakdownDialog";
import { CollectorModalHeader } from "../components/CollectorModal";
import { collectorModalStyles as modalStyles } from "../components/collectorModalStyles";
import UnsavedChangesDialog from "@/components/dialogs/UnsavedChangesDialog";
import CollectorLogoutDialog from "../components/CollectorLogoutDialog";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { collectorProfileStyles as styles } from "./collectorProfileStyles";

/* ─── Field Row Component (Improved Action Buttons & High Contrast) ─── */
const FieldRow = ({
  label,
  value,
  placeholder,
  icon: Icon,
  masked,
  isEmail,
  onEdit,
}: {
  label: string;
  value: string;
  placeholder?: string;
  icon: React.ElementType;
  masked?: boolean;
  isEmail?: boolean;
  onEdit?: () => void;
}) => (
  <div className={styles.row}>
    <div className={styles.rowContent}>
      <div className={styles.rowIcon}>
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={styles.label}>
          {label}
        </p>
        <p className={styles.value}>
          {masked ? (
            "••••••••"
          ) : value ? (
            value
          ) : (
            <span className="text-muted-foreground/60 font-normal italic">
              {placeholder || "—"}
            </span>
          )}
        </p>
      </div>
    </div>
    {isEmail ? (
      <span className={styles.registeredEmail} title="Registered Email">
        <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
        <span aria-hidden="true" className="admin-profile-email-label">Registered Email</span>
        <span className="sr-only">Registered Email</span>
      </span>
    ) : onEdit ? (
      <Button
        type="button"
        variant="primary-outline"
        size="sm"
        onClick={onEdit}
        aria-label={`${masked ? "Change" : "Edit"} ${label.toLowerCase()}`}
        className={styles.fieldAction}
      >
        {!masked && <SquarePen aria-hidden="true" className="size-3.5 shrink-0" />}
        <span>{masked ? "Change" : "Edit"}</span>
      </Button>
    ) : null}
  </div>
);

const CollectorProfile = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const authUser = useAuthStore((s) => s.user);
  const authToken = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const client = useQueryClient();
  const profileQuery = useCollectorQuery("profile", ["account"], fetchProfile);
  const driverQuery = useCollectorQuery("profile", ["vehicle"], fetchDriverMe);
  const runProfileAction = useCollectorAction("profile");
  const runBreakdownAction = useCollectorAction("profile", "routes", "history", "messenger", "notifications");
  const profile = profileQuery.data ?? null;
  const driverData = driverQuery.data ?? null;
  const isLoading = profileQuery.isLoading || driverQuery.isLoading;
  const loadErrors = { profile: Boolean(profileQuery.error), driver: Boolean(driverQuery.error) };
  const retry = () => { if (profileQuery.isError) void profileQuery.refetch(); if (driverQuery.isError) void driverQuery.refetch(); };
  const [avatarId, setAvatarId] = useState<ProfileAvatarId>(DEFAULT_PROFILE_AVATAR_ID);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [savingAvatarId, setSavingAvatarId] = useState<ProfileAvatarId | null>(null);
  const savingAvatar = savingAvatarId !== null;

  // Edit modal
  const [editModal, setEditModal] = useState<{
    open: boolean;
    field: string;
    label: string;
    value: string;
    initialValue: string;
    saving: boolean;
    error: string;
  }>({
    open: false,
    field: "",
    label: "",
    value: "",
    initialValue: "",
    saving: false,
    error: "",
  });

  // Password modal
  const [pwModal, setPwModal] = useState<{
    open: boolean;
    oldPw: string;
    newPw: string;
    confirmPw: string;
    showOld: boolean;
    showNew: boolean;
    saving: boolean;
    error: string;
  }>({
    open: false,
    oldPw: "",
    newPw: "",
    confirmPw: "",
    showOld: false,
    showNew: false,
    saving: false,
    error: "",
  });

  const [breakdownModal, setBreakdownModal] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<"profile" | "password" | null>(null);

  const avatarAccountId = profile?.id || driverData?.user_id || authUser?.id;
  useEffect(() => {
    if (!avatarAccountId) return;
    const saved = localStorage.getItem(`greenway:collector-avatar:${avatarAccountId}`);
    const selected = profileAvatarIdFromUrl(profile?.avatar_url);
    setAvatarId(selected ?? (isProfileAvatarId(saved) ? saved : profileAvatarForAccount(avatarAccountId, profile?.avatar_url)));
    if (!selected && !profile?.avatar_url && isProfileAvatarId(saved)) {
      void updateProfile({ avatar_url: profileAvatarSrc(saved) }).then((updated) => {
        client.setQueryData(collectorKey(authUser?.id, "profile", "account"), updated);
        const current = useAuthStore.getState().user;
        if (current?.id === updated.id) setUser({ ...current, ...updated });
      }).catch(() => {});
    }
  }, [avatarAccountId, profile?.avatar_url, authUser?.id, client, setUser]);

  const handleSaveField = async () => {
    if (editModal.saving) return;
    if (!editModal.value.trim()) {
      setEditModal((m) => ({ ...m, error: "Field cannot be empty" }));
      return;
    }
    try {
      setEditModal((m) => ({ ...m, saving: true, error: "" }));
      const payload: Partial<UserProfile> = {
        [editModal.field]: editModal.value.trim(),
      };
      await runProfileAction(async () => {
        const updated = await updateProfile(payload);
        client.setQueryData(collectorKey(authUser?.id, "profile", "account"), updated);
        const current = useAuthStore.getState();
        if (current.user && current.user.id === authUser?.id && current.token === authToken) setUser({ ...current.user, ...payload });
      });
      toast.success("Profile updated");
      setDiscardTarget(null);
      setEditModal((m) => ({ ...m, open: false, saving: false }));
    } catch (err: unknown) {
      const errMsg =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response: { data: { message?: string } } }).response?.data?.message === "string"
          ? (err as { response: { data: { message: string } } }).response.data.message
          : "Update failed";
      setEditModal((m) => ({
        ...m,
        saving: false,
        error: errMsg,
      }));
    }
  };

  const handleSavePassword = async () => {
    if (pwModal.saving) return;
    if (!pwModal.oldPw || !pwModal.newPw || !pwModal.confirmPw) {
      setPwModal((m) => ({ ...m, error: "All fields are required" }));
      return;
    }
    if (pwModal.newPw.length < 8) {
      setPwModal((m) => ({
        ...m,
        error: "New password must be at least 8 characters",
      }));
      return;
    }
    if (pwModal.newPw !== pwModal.confirmPw) {
      setPwModal((m) => ({ ...m, error: "Passwords do not match" }));
      return;
    }
    try {
      setPwModal((m) => ({ ...m, saving: true, error: "" }));
      await runProfileAction(() => changePassword({
        old_password: pwModal.oldPw,
        new_password: pwModal.newPw,
      }));
      toast.success("Password changed successfully");
      setDiscardTarget(null);
      setPwModal({
        open: false,
        oldPw: "",
        newPw: "",
        confirmPw: "",
        showOld: false,
        showNew: false,
        saving: false,
        error: "",
      });
    } catch (err: unknown) {
      const errMsg =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response: { data: { message?: string } } }).response?.data?.message === "string"
          ? (err as { response: { data: { message: string } } }).response.data.message
          : "Failed to update password";
      setPwModal((m) => ({
        ...m,
        saving: false,
        error: errMsg,
      }));
    }
  };

  const handleLogout = async () => {
    await logout();
    setLogoutOpen(false);
    navigate("/", { replace: true });
  };

  const closeEdit = () => {
    if (editModal.saving) return;
    setDiscardTarget(null);
    setEditModal((m) => ({ ...m, open: false, value: "", error: "" }));
  };
  const requestCloseEdit = () => {
    if (editModal.saving) return;
    if (editModal.value !== editModal.initialValue) setDiscardTarget("profile");
    else closeEdit();
  };
  const closePassword = () => {
    if (pwModal.saving) return;
    setDiscardTarget(null);
    setPwModal({ open: false, oldPw: "", newPw: "", confirmPw: "", showOld: false, showNew: false, saving: false, error: "" });
  };
  const requestClosePassword = () => {
    if (pwModal.saving) return;
    if (pwModal.oldPw || pwModal.newPw || pwModal.confirmPw) setDiscardTarget("password");
    else closePassword();
  };

  if (isLoading) return <CollectorProfileSkeleton />;

  if (!profile && !driverData) {
    return <PageErrorState kind="unavailable" description="We couldn't load your collector information. Please try again." onRetry={retry} retrying={profileQuery.isFetching || driverQuery.isFetching} homeHref="/collector" />;
  }

  const displayName = profile?.full_name || driverData?.full_name || authUser?.full_name || "Collector";
  const displayEmail = profile?.email || driverData?.email || authUser?.email || "";
  const displayPhone = profile?.phone || driverData?.phone || "";
  const displayUsername = profile?.username || driverData?.username || authUser?.username || "—";
  const hasAssignedTruck = Boolean(driverData?.truck_id);
  const truckName = driverData?.truck_name || "Assigned Truck";
  const truckPlate = driverData?.truck_plate || "";
  const isUnderMaintenance = driverData?.truck_availability === "UNDER_MAINTENANCE" ||
    driverData?.truck_status === "MAINTENANCE" || driverData?.truck_status === "INACTIVE";
  const vehicleReadiness = isUnderMaintenance ? "Under Maintenance" :
    driverData?.truck_availability === "ACTIVE" ? "Operational / Ready" : "Readiness Unavailable";
  const joinedAt = profile?.created_at || driverData?.created_at;
  const joined = joinedAt ? formatManilaDateTime(joinedAt, { year: "numeric", month: "long" }) : null;
  const saveAvatar = async (selectedId: ProfileAvatarId) => {
    if (!avatarAccountId || savingAvatar) return;
    setSavingAvatarId(selectedId);
    try {
      const updated = await runProfileAction(() => updateProfile({ avatar_url: profileAvatarSrc(selectedId) }));
      client.setQueryData(collectorKey(authUser?.id, "profile", "account"), updated);
      if (authUser) setUser({ ...authUser, ...updated });
      localStorage.setItem(`greenway:collector-avatar:${avatarAccountId}`, selectedId);
      setAvatarId(selectedId);
      setAvatarOpen(false);
      toast.success("Avatar updated");
    } catch {
      toast.error("Could not update your avatar. Please try again.");
    } finally {
      setSavingAvatarId(null);
    }
  };

  return (
    <PageRetryContext.Provider value={true}>
    <div className={styles.page}>
      <ResidentPageHeader title="Profile & Account" description="Manage your personal details and account security." />
      <div className={styles.stack}>
        {/* ── 1. Profile Header Banner (Resident-style) ── */}
        <div className={styles.hero}>
          {/* Profile banner */}
          <div className={styles.cover}>
            <ProfileBannerImage />
          </div>

          {/* Avatar & Core Identity */}
          <div className={styles.identity}>
            <div className={styles.identityRow}>
              <ProfileAvatarControl saving={savingAvatar} avatarClassName={styles.avatar} avatarId={avatarId} onCustomize={() => setAvatarOpen(true)} />

              <div className={styles.identityDetails}>
                <div className={styles.nameRow}>
                  <h2 className={styles.name}>
                    {displayName}
                  </h2>
                  {displayUsername && displayUsername !== "—" && (
                    <span className={styles.username}>
                      @{displayUsername}
                    </span>
                  )}
                </div>

                <div className={styles.metadata}>
                  <span className="flex min-w-0 items-center gap-1.5"><Truck aria-hidden="true" className="size-3.5 shrink-0 text-primary" /> Collector / Driver</span>
                  {joined && <span className="flex min-w-0 items-center gap-1.5"><Calendar aria-hidden="true" className="size-3.5 shrink-0" /> Joined {joined}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {(loadErrors.profile || loadErrors.driver) && <DataRefreshNotice primary message="Some profile or vehicle information couldn't load or refresh. Your edits are preserved; loaded data may be outdated." onRetry={retry} retrying={profileQuery.isFetching || driverQuery.isFetching} />}

        {/* ── 2. Assigned Vehicle & Equipment ── */}
        <section className={styles.section}>
          <div className={styles.vehicleHeader}>
            <div className={styles.vehicleHeading}>
              <div className={styles.sectionIcon}>
                <Truck aria-hidden="true" className="size-4" />
              </div>
              <div className="min-w-0 [overflow-wrap:anywhere]">
                <h2 className="gw-heading text-sm text-foreground tracking-tight">
                  Assigned Vehicle & Equipment
                </h2>
                <p className="text-xs text-muted-foreground">
                  Current truck assignment and operational truck status
                </p>
              </div>
            </div>
            {hasAssignedTruck && (
              <span
                className={collectorBadgeClassName + " max-w-full whitespace-normal " + getStatusBadgeStyle(vehicleReadiness).className}
              >
                <span
                  className={"w-1.5 h-1.5 rounded-full shrink-0 " + getStatusBadgeStyle(vehicleReadiness).dot}
                />
                {vehicleReadiness}
              </span>
            )}
          </div>

          {hasAssignedTruck ? (
            <div className="space-y-3.5">
              <div className={styles.vehicleGrid}>
                <div className={styles.vehicleCard}>
                  <p className="text-xs text-muted-foreground font-medium">
                    Vehicle plate number
                  </p>
                  <p className="break-words text-base font-semibold text-foreground tabular-nums [overflow-wrap:anywhere]">
                    {truckPlate || "Unavailable"}
                  </p>
                </div>

                <div className={styles.vehicleCard}>
                  <p className="text-xs text-muted-foreground font-medium">
                    Unit designation
                  </p>
                  <p className="break-words text-base font-semibold text-foreground [overflow-wrap:anywhere]">
                    {truckName}
                  </p>
                </div>
              </div>

              <div className={styles.vehicleFooter}>
                <p className="min-w-0 text-xs leading-relaxed text-muted-foreground">
                  Assigned by MENRO Candelaria Truck Operations
                </p>
                <Button
                  type="button"
                  variant="warning-outline"
                  size="sm"
                  onClick={() => setBreakdownModal(true)}
                  className={styles.vehicleAction}
                >
                  <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Report Truck Issue</span>
                </Button>
              </div>
            </div>
          ) : loadErrors.driver && !driverData ? (
            <PageErrorState kind="unavailable" variant="section" title="Vehicle Information Unavailable" onRetry={() => void driverQuery.refetch()} retrying={driverQuery.isFetching} />
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-border/80 bg-muted/20 text-center space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                No vehicle currently assigned
              </p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Your supervisor will assign a collection truck to your account before scheduled route shifts.
              </p>
            </div>
          )}
        </section>

        {/* ── 3. Personal Information (Resident-style) ── */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionIcon}>
              <User aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <h2 className="gw-heading text-sm text-foreground tracking-tight">
                Personal Information
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage your profile details and security credentials
              </p>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            <FieldRow
              label="Full Name"
              value={displayName}
              icon={User}
              onEdit={() =>
                setEditModal({
                  open: true,
                  field: "full_name",
                  label: "Full Name",
                  value: displayName,
                  initialValue: displayName,
                  saving: false,
                  error: "",
                })
              }
            />
            <FieldRow
              label="Username"
              value={displayUsername}
              icon={AtSign}
              onEdit={() =>
                setEditModal({
                  open: true,
                  field: "username",
                  label: "Username",
                  value: displayUsername,
                  initialValue: displayUsername,
                  saving: false,
                  error: "",
                })
              }
            />
            <FieldRow
              label="Email Address"
              value={displayEmail}
              icon={Mail}
              isEmail={Boolean(displayEmail)}
              placeholder="Email unavailable"
            />
            <FieldRow
              label="Phone Number"
              value={displayPhone}
              icon={Phone}
              placeholder="No phone number added"
              onEdit={() =>
                setEditModal({
                  open: true,
                  field: "phone",
                  label: "Phone Number",
                  value: displayPhone,
                  initialValue: displayPhone,
                  saving: false,
                  error: "",
                })
              }
            />
            <FieldRow
              label="Security Password"
              value=""
              icon={Lock}
              masked
              onEdit={() =>
                setPwModal((m) => ({
                  ...m,
                  open: true,
                  oldPw: "",
                  newPw: "",
                  confirmPw: "",
                  error: "",
                }))
              }
            />
          </div>
        </section>

        {/* ── 4. Actions / Log Out ── */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            aria-label="Log out"
            className={styles.logout}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/60 text-muted-foreground">
                <LogOut aria-hidden="true" className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Log Out
                </p>
                <p className="text-xs text-muted-foreground">
                  Sign out of this device
                </p>
              </div>
            </div>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </button>

          <div className={styles.privacy}>
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <span>In compliance with the Philippine Data Privacy Act of 2012 (R.A. 10173)</span>
          </div>
        </div>
      </div>

      <Dialog open={avatarOpen} onOpenChange={(open) => { if (!savingAvatar) setAvatarOpen(open); }}>
        <DialogContent className={`${modalStyles.content} ${styles.dialog}`}>
          <CollectorModalHeader title="Choose Avatar" description="Select one of the ten profile avatars." icon={<Users />} disabled={savingAvatar} onClose={() => { if (!savingAvatar) setAvatarOpen(false); }} />
          <div className={modalStyles.body}>
            <ProfileAvatarPicker saving={savingAvatarId} selected={avatarId} onSelect={(selectedId) => { void saveAvatar(selectedId); }} disabled={savingAvatar} />
          </div>
          <div className={modalStyles.footer}>
            <Button type="button" variant="outline" disabled={savingAvatar} onClick={() => setAvatarOpen(false)} className={modalStyles.cancelButton}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog
        open={editModal.open}
        onOpenChange={(open) => { if (!open) requestCloseEdit(); }}
      >
        <DialogContent className={`${modalStyles.content} ${styles.dialog}`}>
          <CollectorModalHeader title={`Edit ${editModal.label}`} description={`Update your ${editModal.label.toLowerCase()}.`} icon={<User />} onClose={requestCloseEdit} disabled={editModal.saving} />

          <div className={modalStyles.body}>
            <div className="space-y-1.5">
              <Label htmlFor="collector-profile-field" className={modalStyles.label}>
                {editModal.label}
              </Label>
              <Input
                id="collector-profile-field"
                disabled={editModal.saving}
                autoFocus
                aria-invalid={Boolean(editModal.error)}
                value={editModal.value}
                onChange={(e) =>
                  setEditModal((m) => ({
                    ...m,
                    value: e.target.value,
                    error: "",
                  }))
                }
                placeholder={`Enter your ${editModal.label.toLowerCase()}`}
                className={modalStyles.input}
              />
              {editModal.error && (
                <p role="alert" className="text-xs text-destructive font-medium">
                  {editModal.error}
                </p>
              )}
            </div>
          </div>
          <div className={modalStyles.footer}>
            <Button
              type="button"
              variant="outline"
              onClick={requestCloseEdit}
              disabled={editModal.saving}
              className={modalStyles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveField}
              disabled={editModal.saving}
              className={modalStyles.primaryButton}
              loading={editModal.saving}
              loadingLabel="Saving changes…"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Modal ── */}
      <Dialog
        open={pwModal.open}
        onOpenChange={(open) => { if (!open) requestClosePassword(); }}
      >
        <DialogContent className={`${modalStyles.content} ${styles.dialog}`}>
          <CollectorModalHeader title="Change Password" description="Enter your current and new password." icon={<Lock />} onClose={requestClosePassword} disabled={pwModal.saving} />

          <div className={modalStyles.body}>
            <div className="space-y-1.5">
              <Label htmlFor="collector-current-password" className={modalStyles.label}>
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="collector-current-password"
                  disabled={pwModal.saving}
                  autoComplete="current-password"
                  type={pwModal.showOld ? "text" : "password"}
                  value={pwModal.oldPw}
                  onChange={(e) =>
                    setPwModal((m) => ({ ...m, oldPw: e.target.value, error: "" }))
                  }
                  className={`${modalStyles.input} pr-10`}
                />
                <button
                  type="button"
                  aria-label={pwModal.showOld ? "Hide current password" : "Show current password"}
                  disabled={pwModal.saving}
                  onClick={() =>
                    setPwModal((m) => ({ ...m, showOld: !m.showOld }))
                  }
                  className="gw-action-ghost absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  {pwModal.showOld ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="collector-new-password" className={modalStyles.label}>
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="collector-new-password"
                  disabled={pwModal.saving}
                  autoComplete="new-password"
                  type={pwModal.showNew ? "text" : "password"}
                  value={pwModal.newPw}
                  onChange={(e) =>
                    setPwModal((m) => ({ ...m, newPw: e.target.value, error: "" }))
                  }
                  className={`${modalStyles.input} pr-10`}
                />
                <button
                  type="button"
                  aria-label={pwModal.showNew ? "Hide new password" : "Show new password"}
                  disabled={pwModal.saving}
                  onClick={() =>
                    setPwModal((m) => ({ ...m, showNew: !m.showNew }))
                  }
                  className="gw-action-ghost absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  {pwModal.showNew ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="collector-confirm-password" className={modalStyles.label}>
                Confirm New Password
              </Label>
              <Input
                id="collector-confirm-password"
                disabled={pwModal.saving}
                autoComplete="new-password"
                type="password"
                value={pwModal.confirmPw}
                onChange={(e) =>
                  setPwModal((m) => ({
                    ...m,
                    confirmPw: e.target.value,
                    error: "",
                  }))
                }
                className={modalStyles.input}
              />
            </div>

            {pwModal.error && (
              <p role="alert" className="text-xs text-destructive font-medium">
                {pwModal.error}
              </p>
            )}
          </div>
          <div className={modalStyles.footer}>
            <Button
              type="button"
              variant="outline"
              onClick={requestClosePassword}
              disabled={pwModal.saving}
              className={modalStyles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSavePassword}
              disabled={pwModal.saving}
              className={modalStyles.primaryButton}
              loading={pwModal.saving}
              loadingLabel="Updating password…"
            >
              Update Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        isOpen={discardTarget !== null} onClose={() => setDiscardTarget(null)}
        onDiscard={() => { if (discardTarget === "password") closePassword(); else closeEdit(); }}
        title={discardTarget === "password" ? "Discard Password Changes?" : "Discard Profile Changes?"}
        description={discardTarget === "password" ? "Your entered passwords will be cleared." : "Your unsaved profile changes will be lost."}
        discardLabel="Discard Changes" isSaving={discardTarget === "password" ? pwModal.saving : editModal.saving}
      />
      <CollectorLogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={handleLogout} />

      <TruckBreakdownDialog
        open={breakdownModal}
        onOpenChange={setBreakdownModal}
        truckName={truckName}
        truckPlate={truckPlate}
        onSubmit={(report) => runBreakdownAction(() => reportTruckBreakdown(report))}
      />
    </div>
    </PageRetryContext.Provider>
  );
};

export default CollectorProfile;
