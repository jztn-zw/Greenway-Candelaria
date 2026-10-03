import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
import { useResidentQuery, useResidentResource, useResidentMutation } from "@/lib/residentQuery";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail, Phone, Lock, User, Award, Calendar,
  Heart, ChevronRight, Check,
  ClipboardList, Eye, EyeOff,
  ShieldCheck, MapPin, Sparkles, AtSign, LogOut, Users,
} from "lucide-react";
import { ProfileAvatarControl, ProfileAvatarPicker } from "@/components/common/ProfileAvatarPicker";
import { DEFAULT_PROFILE_AVATAR_ID, isProfileAvatarId, profileAvatarForAccount, profileAvatarIdFromUrl, profileAvatarSrc, type ProfileAvatarId } from "@/components/common/profileAvatars";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { formDialogStyles as modalStyles } from "@/components/formDialogStyles";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ProfileSkeleton } from "@/components/PageLoadingSkeletons";
import ProfileBannerImage from "@/components/common/ProfileBannerImage";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import { profileStyles } from "./profileStyles";
import PageErrorState from "@/components/PageErrorState";
import DataRefreshNotice from "@/components/DataRefreshNotice";
import useAuthStore from "@/store/authStore";
import {
  fetchProfile,
  updateProfile,
  changePassword,
  fetchMyReportStats,
  UserProfile,
} from "@/services/profileService";
import {
  fetchBarangays,
  fetchBarangayStreets,
} from "@/services/barangaysService";
import { toast } from "@/lib/toast";
import { formatManilaDateTime } from "@/utils/date";

// ─── Editable field row ───────────────────────────────────────────────────────
const FieldRow = ({
  label, value, icon: Icon, masked, isEmail, placeholder, onEdit,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  masked?: boolean;
  isEmail?: boolean;
  placeholder?: string;
  onEdit: () => void;
}) => (
  <div className={profileStyles.fieldInteractive}>
    <div className="flex min-w-0 flex-1 items-start gap-2.5">
      <div className={profileStyles.fieldIcon}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={profileStyles.fieldLabel}>
          {label}
        </p>
        <p className={profileStyles.fieldValue}>
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
      <span className="inline-flex h-8 shrink-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground" title="Registered email">
        <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
        <span className="resident-profile-email-label" aria-hidden="true">Registered</span>
        <span className="sr-only">Registered email</span>
      </span>
    ) : (
      <Button
        type="button"
        variant="primary-outline"
        size="sm"
        onClick={onEdit}
        aria-label={`${masked ? "Change" : "Edit"} ${label.toLowerCase()}`}
        className={profileStyles.fieldButton}
      >
        {masked ? "Change" : "Edit"}
      </Button>
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ResidentProfile = () => {
  const navigate = useNavigate();
  // Use separate selectors — returning a new object every render causes infinite loops
  const logout  = useAuthStore((s) => s.logout);
  const authUser = useAuthStore((s) => s.user);
  const setUser  = useAuthStore((s) => s.setUser);

  // ── State ─────────────────────────────────────────────────────────────────
  const profileQuery = useResidentResource<UserProfile | null>("profile", ["me"], fetchProfile, null);
  const profile = profileQuery.data;
  const setProfile = profileQuery.setData;
  const statsQuery = useResidentQuery("reports", ["profile-stats"], fetchMyReportStats);
  const stats = statsQuery.data;
  const isLoading = profileQuery.isLoading || statsQuery.isLoading;
  const saveProfile = useResidentMutation(updateProfile, "profile", "routes", "tracking", "schedule", "announcements");
  const savePassword = useResidentMutation(changePassword);
  const [avatarId, setAvatarId] = useState<ProfileAvatarId>(DEFAULT_PROFILE_AVATAR_ID);
  const [avatarModal, setAvatarModal] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState<{
    open: boolean; field: string; value: string; initialValue: string; saving: boolean; error: string;
  }>({ open: false, field: "", value: "", initialValue: "", saving: false, error: "" });

  // Password modal
  const [pwModal, setPwModal] = useState<{
    open: boolean; oldPw: string; newPw: string; confirmPw: string;
    showOld: boolean; showNew: boolean; saving: boolean; error: string;
  }>({ open: false, oldPw: "", newPw: "", confirmPw: "", showOld: false, showNew: false, saving: false, error: "" });

  const [logoutModal, setLogoutModal] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<"profile" | "password" | "address" | null>(null);
  const [addressModal, setAddressModal] = useState({
    open: false,
    barangayId: "",
    streetId: "",
    initialBarangayId: "",
    initialStreetId: "",
    saving: false,
    error: "",
  });

  const barangaysQuery = useResidentQuery("barangays", ["locations"], fetchBarangays);
  const barangays = barangaysQuery.data ?? [];
  const streetsQuery = useResidentQuery("barangays", ["streets", addressModal.barangayId],
    () => fetchBarangayStreets(addressModal.barangayId), { enabled: addressModal.open && !!addressModal.barangayId });
  const streetOptions = streetsQuery.data?.streets ?? [];
  const streetsLoading = streetsQuery.isLoading;
  useEffect(() => {
    if (streetsQuery.isError) setAddressModal((state) => ({ ...state, error: "Could not load streets for this barangay." }));
  }, [streetsQuery.isError]);

  useEffect(() => {
    if (!profile?.id) return;
    const savedAvatar = localStorage.getItem(`greenway:resident-avatar:${profile.id}`);
    const selected = profileAvatarIdFromUrl(profile.avatar_url);
    setAvatarId(selected ?? (isProfileAvatarId(savedAvatar) ? savedAvatar : profileAvatarForAccount(profile.id, profile.avatar_url)));
    if (!selected && !profile.avatar_url && isProfileAvatarId(savedAvatar)) {
      void updateProfile({ avatar_url: profileAvatarSrc(savedAvatar) }).then((updated) => {
        setProfile(updated);
        const current = useAuthStore.getState().user;
        if (current?.id === updated.id) setUser({ ...current, ...updated } as typeof current);
      }).catch(() => {});
    }
  }, [profile?.id, profile?.avatar_url, setProfile, setUser]);

  // ── Edit field save ───────────────────────────────────────────────────────
  const openEdit = (field: string, value: string) =>
    setEditModal({ open: true, field, value, initialValue: value, saving: false, error: "" });

  const openAddressEditor = async () => {
    if (!profile) return;
    const barangayId = profile.barangay_id ?? "";
    setAddressModal({
      open: true,
      barangayId,
      streetId: profile.street_id ?? "",
      initialBarangayId: barangayId,
      initialStreetId: profile.street_id ?? "",
      saving: false,
      error: "",
    });
  };

  const changeAddressBarangay = (barangayId: string) => {
    setAddressModal((state) => ({ ...state, barangayId, streetId: "", error: "" }));
  };

  const saveAddress = async () => {
    if (addressModal.saving) return;
    if (!addressModal.barangayId) {
      setAddressModal((state) => ({ ...state, error: "Please select your barangay." }));
      return;
    }
    if (!addressModal.streetId) {
      setAddressModal((state) => ({ ...state, error: "Please select your street." }));
      return;
    }

    setAddressModal((state) => ({ ...state, saving: true, error: "" }));
    try {
      const updated = await saveProfile({
        barangay_id: addressModal.barangayId,
        street_id: addressModal.streetId,
      });
      setProfile(updated);
      if (authUser) setUser({ ...authUser, ...updated } as typeof authUser);
      setDiscardTarget(null);
      setAddressModal((state) => ({ ...state, open: false, saving: false }));
      toast.success("Collection address updated successfully.");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not update your collection address.";
      setAddressModal((state) => ({ ...state, saving: false, error: message }));
    }
  };

  const handleEditSave = async () => {
    if (editModal.saving) return;
    if (!editModal.value.trim()) {
      setEditModal((p) => ({ ...p, error: "This field cannot be empty." }));
      return;
    }
    const fieldMap: Record<string, string> = {
      "Full Name": "full_name",
      "Username": "username",
      "Phone Number": "phone",
    };
    const key = fieldMap[editModal.field];
    if (!key) return;
    setEditModal((p) => ({ ...p, saving: true, error: "" }));
    try {
      const updated = await saveProfile({ [key]: editModal.value.trim() });
      setProfile(updated);
      if (authUser) setUser({ ...authUser, ...updated } as typeof authUser);
      setDiscardTarget(null);
      setEditModal((p) => ({ ...p, open: false, saving: false }));
      toast.success(`${editModal.field} updated successfully!`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to update. Please try again.";
      setEditModal((p) => ({ ...p, error: msg, saving: false }));
    }
  };

  // ── Password change ───────────────────────────────────────────────────────
  const handlePasswordSave = async () => {
    if (pwModal.saving) return;
    if (!pwModal.oldPw || !pwModal.newPw || !pwModal.confirmPw) {
      setPwModal((p) => ({ ...p, error: "All fields are required." }));
      return;
    }
    if (pwModal.newPw.length < 8) {
      setPwModal((p) => ({ ...p, error: "New password must be at least 8 characters." }));
      return;
    }
    if (pwModal.newPw !== pwModal.confirmPw) {
      setPwModal((p) => ({ ...p, error: "Passwords do not match." }));
      return;
    }
    setPwModal((p) => ({ ...p, saving: true, error: "" }));
    try {
      await savePassword({ old_password: pwModal.oldPw, new_password: pwModal.newPw });
      setDiscardTarget(null);
      setPwModal({ open: false, oldPw: "", newPw: "", confirmPw: "", showOld: false, showNew: false, saving: false, error: "" });
      toast.success("Password changed. Please log in again.");
      await logout();
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to change password.";
      setPwModal((p) => ({ ...p, error: msg, saving: false }));
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await logout();
    setLogoutModal(false);
    navigate("/", { replace: true });
  };

  const closeEditor = (target: "profile" | "password" | "address") => {
    if (target === "profile") {
      if (editModal.saving) return;
      setEditModal((p) => ({ ...p, open: false, value: "", error: "" }));
    } else if (target === "password") {
      if (pwModal.saving) return;
      setPwModal({ open: false, oldPw: "", newPw: "", confirmPw: "", showOld: false, showNew: false, saving: false, error: "" });
    } else {
      if (addressModal.saving) return;
      setAddressModal((p) => ({ ...p, open: false, error: "" }));
    }
    setDiscardTarget(null);
  };
  const requestCloseEditor = (target: "profile" | "password" | "address") => {
    const pending = target === "profile" ? editModal.saving : target === "password" ? pwModal.saving : addressModal.saving;
    if (pending) return;
    const dirty = target === "profile" ? editModal.value !== editModal.initialValue
      : target === "password" ? Boolean(pwModal.oldPw || pwModal.newPw || pwModal.confirmPw)
      : addressModal.barangayId !== addressModal.initialBarangayId || addressModal.streetId !== addressModal.initialStreetId;
    if (dirty) setDiscardTarget(target);
    else closeEditor(target);
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const joinDate = profile?.created_at
    ? formatManilaDateTime(profile.created_at, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }, "—")
    : "—";

  const totalReports = stats?.total ?? 0;
  const resolvedReports = stats?.resolved ?? 0;
  const resolutionRate =
    totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0;
  const isActiveResident =
    profile?.role?.toUpperCase() === "RESIDENT" && profile.status?.toUpperCase() === "ACTIVE";
  const saveAvatar = async (selectedId: ProfileAvatarId) => {
    if (!profile?.id || savingAvatar) return;
    setSavingAvatar(true);
    try {
      const updated = await saveProfile({ avatar_url: profileAvatarSrc(selectedId) });
      setProfile(updated);
      if (authUser) setUser({ ...authUser, ...updated } as typeof authUser);
      localStorage.setItem(`greenway:resident-avatar:${profile.id}`, selectedId);
      setAvatarId(selectedId);
      setAvatarModal(false);
      toast.success("Avatar updated");
    } catch {
      toast.error("Could not update your avatar. Please try again.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const badges = [
    {
      id: "first_report",
      label: "First Step",
      description: "Submitted your first community report",
      icon: Sparkles,
      earned: totalReports >= 1,
      progress: `${Math.min(totalReports, 1)}/1`,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      border: "border-emerald-500/30",
    },
    {
      id: "eco_guardian",
      label: "Eco Guardian",
      description: "Submitted 5 waste or violation reports",
      icon: ShieldCheck,
      earned: totalReports >= 5,
      progress: `${Math.min(totalReports, 5)}/5`,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      border: "border-blue-500/30",
    },
    {
      id: "solution_maker",
      label: "Action Taker",
      description: "Had 3 reports successfully resolved",
      icon: Award,
      earned: resolvedReports >= 3,
      progress: `${Math.min(resolvedReports, 3)}/3`,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      border: "border-amber-500/30",
    },
    {
      id: "green_citizen",
      label: "Green Citizen",
      description: "Maintain an active resident account",
      icon: Heart,
      earned: isActiveResident,
      progress: isActiveResident ? "Active" : "Pending",
      color: "text-primary dark:text-emerald-400",
      bg: "bg-primary/10 dark:bg-primary/20",
      border: "border-primary/30",
    },
  ];

  // ── Loading / error states ────────────────────────────────────────────────
  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return <PageErrorState kind="unavailable" description="We couldn't load your profile right now. Please try again." onRetry={() => void profileQuery.refetch()} retrying={profileQuery.isFetching} homeHref="/resident" />;
  }

  return (
    <div className={profileStyles.page}>
      <ResidentPageHeader title="Profile & account" description="Manage your personal details, collection address, and account security." />
      <div className={profileStyles.stack}>
      {/* ── Profile Header Banner ─────────────────────────────────────────── */}
      <div className={profileStyles.hero}>
        {/* Profile banner */}
        <div className={profileStyles.cover}>
          <ProfileBannerImage />
        </div>

        {/* Avatar & Core Identity */}
        <div className={profileStyles.identity}>
          <div className={profileStyles.identityRow}>
            <ProfileAvatarControl avatarId={avatarId} onCustomize={() => setAvatarModal(true)} avatarClassName={profileStyles.avatar} />

            <div className={profileStyles.identityDetails}>
              <div className={profileStyles.nameRow}>
                <h2 className={profileStyles.name}>
                  {profile.full_name}
                </h2>
                <span className="max-w-full break-words rounded-md border border-border/60 bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground [overflow-wrap:anywhere]">
                  @{profile.username}
                </span>
              </div>

              <div className={profileStyles.identityMeta}>
                <div className="flex min-w-0 items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="break-words font-medium text-foreground/85 [overflow-wrap:anywhere]">
                    {profile.barangay_name
                      ? `Brgy. ${profile.barangay_name}`
                      : "No barangay set"}
                  </span>
                </div>
                <div className="flex min-w-0 items-start gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                  <span>Joined {joinDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {profileQuery.error && <DataRefreshNotice message="Couldn't refresh your profile. Your edits are preserved; loaded information may be outdated." onRetry={() => void profileQuery.refetch()} retrying={profileQuery.isFetching} />}

      <div className={profileStyles.body}>
      {/* ── Personal Information ─────────────────────────────────────────────── */}
      <section className={profileStyles.personal} aria-labelledby="resident-profile-personal-title">
        <div className={profileStyles.sectionHeader}>
          <div className={profileStyles.sectionHeading}>
            <div className={profileStyles.sectionIcon}>
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="resident-profile-personal-title" className={profileStyles.sectionTitle}>
                Personal information
              </h2>
              <p className={profileStyles.sectionDescription}>
                Update your details and account security.
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/50">
          <FieldRow
            label="Full Name"
            value={profile.full_name}
            icon={User}
            onEdit={() => openEdit("Full Name", profile.full_name)}
          />
          <FieldRow
            label="Username"
            value={profile.username}
            icon={AtSign}
            onEdit={() => openEdit("Username", profile.username)}
          />
          <FieldRow
            label="Email Address"
            value={profile.email}
            icon={Mail}
            isEmail
            onEdit={() =>
              toast.info("Contact MENRO to change your registered email address.")
            }
          />
          <FieldRow
            label="Phone Number"
            value={profile.phone ?? ""}
            icon={Phone}
            placeholder="No phone number added"
            onEdit={() => openEdit("Phone Number", profile.phone ?? "")}
          />
          <FieldRow
            label="Barangay & Street"
            value={[
              profile.barangay_name ? `Brgy. ${profile.barangay_name}` : "",
              profile.street_name
                ? `${profile.street_name}${profile.street_area ? ` (${profile.street_area})` : ""}`
                : "",
            ].filter(Boolean).join(" · ")}
            icon={MapPin}
            placeholder="No collection address selected"
            onEdit={() => { void openAddressEditor(); }}
          />
          <FieldRow
            label="Security Password"
            value=""
            icon={Lock}
            masked
            onEdit={() => setPwModal((p) => ({ ...p, open: true }))}
          />
        </div>
      </section>

      {/* ── Community Impact & Reports ───────────────────────────────────────── */}
      <section className={profileStyles.panel} aria-labelledby="resident-profile-impact-title">
        <div className={profileStyles.sectionHeader}>
          <div className={profileStyles.sectionHeading}>
            <div className={profileStyles.sectionIcon}>
              <ClipboardList className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="resident-profile-impact-title" className={profileStyles.sectionTitle}>
                Community impact
              </h2>
              <p className={profileStyles.sectionDescription}>
                Your reports and contributions to Candelaria.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate("/resident/my-reports")}
            className={profileStyles.actionButton}
          >
            <span>My reports</span>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        </div>

        {/* Resolution Progress Bar */}
        <div className={profileStyles.resolution}>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <span className="font-semibold text-foreground">
                Report resolution
              </span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold font-body bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {totalReports > 0
                ? `${resolutionRate}% Resolved`
                : "Ready to Report"}
            </span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden p-0.5 border border-border/40">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${totalReports > 0 ? resolutionRate : 0}%` }}
            />
          </div>
          <p className="text-ui-caption text-muted-foreground">
            {totalReports > 0
              ? `${resolvedReports} of ${totalReports} reported community issues have been successfully cleared or resolved.`
              : "Help keep Candelaria clean and green by submitting a report whenever you spot waste issues."}
          </p>
        </div>

        {/* Stats Grid */}
        <div className={profileStyles.stats}>
          <div className={profileStyles.stat}>
            <p className="gw-stat-value text-2xl lg:text-3xl text-primary tabular-nums">
              {stats?.total ?? 0}
            </p>
            <p className={profileStyles.statLabel}>
              Submitted
            </p>
          </div>
          <div className={profileStyles.stat}>
            <p className="gw-stat-value text-2xl lg:text-3xl text-emerald-600 dark:text-emerald-400 tabular-nums">
              {stats?.resolved ?? 0}
            </p>
            <p className={profileStyles.statLabel}>
              Resolved
            </p>
          </div>
          <div className={profileStyles.stat}>
            <p className="gw-stat-value text-2xl lg:text-3xl text-amber-600 dark:text-amber-400 tabular-nums">
              {stats?.pending ?? 0}
            </p>
            <p className={profileStyles.statLabel}>
              Pending
            </p>
          </div>
          <div className={profileStyles.stat}>
            <p className="gw-stat-value text-2xl lg:text-3xl text-sky-600 dark:text-sky-400 tabular-nums">
              {(stats?.in_progress ?? 0) + (stats?.under_review ?? 0)}
            </p>
            <p className={profileStyles.statLabel}>
              In progress
            </p>
          </div>
        </div>
      </section>

      {/* ── Badges & Recognition ─────────────────────────────────────────────── */}
      <section className={profileStyles.panel} aria-labelledby="resident-profile-badges-title">
        <div className={profileStyles.sectionHeader}>
          <div className={profileStyles.sectionHeading}>
            <div className={profileStyles.sectionIcon}>
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="resident-profile-badges-title" className={profileStyles.sectionTitle}>
                Badges & recognition
              </h2>
              <p className={profileStyles.sectionDescription}>
                Recognition for your community activity.
              </p>
            </div>
          </div>
          <span className="shrink-0 rounded-md border border-border/60 bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {badges.filter((b) => b.earned).length} of {badges.length} unlocked
          </span>
        </div>

        <div className={profileStyles.badges}>
          {badges.map((badge) => {
            const BadgeIcon = badge.icon;
            return (
              <div
                key={badge.id}
                className={`${profileStyles.badge} ${
                  badge.earned
                    ? "bg-card border-border/80"
                    : "bg-muted/15 border-border/40 opacity-70"
                }`}
              >
                <div
                  className={`size-9 rounded-lg flex items-center justify-center shrink-0 border ${
                    badge.earned
                      ? `${badge.bg} ${badge.color} ${badge.border} shadow-2xs`
                      : "bg-muted text-muted-foreground border-border/50"
                  }`}
                >
                  <BadgeIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <p className="break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                      {badge.label}
                    </p>
                    {badge.earned ? (
                      <span className={"inline-flex items-center gap-1 text-ui-overline font-bold px-2 py-0.5 rounded-md border shrink-0 " + getStatusBadgeStyle("Earned").className}>
                        <Check className="w-2.5 h-2.5" /> Earned
                      </span>
                    ) : (
                      <span className="text-ui-overline font-semibold text-muted-foreground shrink-0 tabular-nums">
                        {badge.progress}
                      </span>
                    )}
                  </div>
                  <p className="break-words text-xs text-muted-foreground leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className={profileStyles.hero}>
          <button
            type="button"
            onClick={() => setLogoutModal(true)}
            className={profileStyles.logout}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className={profileStyles.fieldIcon}>
                <LogOut className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                  Log Out
                </p>
                <p className="text-xs text-muted-foreground font-normal mt-0.5">
                  Sign out of your session on this device
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors ml-4">
              <span className="hidden lg:inline text-xs font-medium">Sign Out</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        <div className={profileStyles.privacy}>
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/60" />
          <span>In compliance with the Philippine Data Privacy Act of 2012 (R.A. 10173)</span>
        </div>
      </div>

      </div>
      <FormDialog open={addressModal.open} onOpenChange={(open) => { if (!open) requestCloseEditor("address"); }}
        className="resident-profile-dialog"
        title="Edit Collection Address" description="Choose your barangay and street." icon={<MapPin />} pending={addressModal.saving}
        footer={<>
          <Button type="button" variant="outline" onClick={() => requestCloseEditor("address")} disabled={addressModal.saving} className={modalStyles.cancelButton}>Cancel</Button>
          <Button type="button" onClick={() => void saveAddress()} className={modalStyles.primaryButton}
            disabled={addressModal.saving || streetsLoading || !addressModal.barangayId || !addressModal.streetId || streetOptions.length === 0} loading={addressModal.saving} loadingLabel="Saving…">
            Save address
          </Button>
        </>}
      >
        <div className="space-y-1.5">
          <Label htmlFor="resident-address-barangay" className={modalStyles.label}>Barangay</Label>
          <SearchableSelect id="resident-address-barangay" value={addressModal.barangayId} onValueChange={changeAddressBarangay}
            options={barangays.map((barangay) => ({ value: barangay.id, label: `Brgy. ${barangay.name}` }))}
            placeholder="Select barangay" searchPlaceholder="Search barangays..." emptyMessage="No barangays available."
            disabled={addressModal.saving} className={modalStyles.select} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="resident-address-street" className={modalStyles.label}>Street</Label>
          <SearchableSelect id="resident-address-street" value={addressModal.streetId}
            onValueChange={(streetId) => setAddressModal((p) => ({ ...p, streetId, error: "" }))}
            options={streetOptions.map((street) => ({ value: street.id, label: `${street.name}${street.area ? ` (${street.area})` : ""}` }))}
            placeholder={!addressModal.barangayId ? "Select a barangay first" : streetsLoading ? "Loading streets..." : streetOptions.length ? "Select street" : "No streets available yet"}
            searchPlaceholder="Search streets..." emptyMessage="No streets found."
            disabled={!addressModal.barangayId || streetsLoading || streetOptions.length === 0 || addressModal.saving} className={modalStyles.select} />
        </div>
        {addressModal.error && <p role="alert" className="text-xs leading-relaxed text-destructive">{addressModal.error}</p>}
      </FormDialog>

      <FormDialog open={avatarModal} onOpenChange={setAvatarModal} title="Choose Avatar" description="Select one of the ten profile avatars." icon={<Users />}
        className="resident-profile-dialog"
        footer={<Button type="button" variant="outline" onClick={() => setAvatarModal(false)} className={modalStyles.cancelButton}>Close</Button>}
      >
        <ProfileAvatarPicker selected={avatarId} onSelect={(selectedId) => { void saveAvatar(selectedId); }} disabled={savingAvatar} />
      </FormDialog>

      <FormDialog open={editModal.open} onOpenChange={(open) => { if (!open) requestCloseEditor("profile"); }}
        className="resident-profile-dialog"
        title={`Edit ${editModal.field}`} description={`Update your ${editModal.field.toLowerCase()}.`} icon={<User />} pending={editModal.saving}
        footer={<>
          <Button type="button" variant="outline" onClick={() => requestCloseEditor("profile")} disabled={editModal.saving} className={modalStyles.cancelButton}>Cancel</Button>
          <Button type="button" onClick={() => void handleEditSave()} disabled={editModal.saving} className={modalStyles.primaryButton} loading={editModal.saving} loadingLabel="Saving…">
            Save Changes
          </Button>
        </>}
      >
        <div className="space-y-1.5">
          <Label htmlFor="resident-profile-field" className={modalStyles.label}>{editModal.field}</Label>
          <Input id="resident-profile-field" value={editModal.value} disabled={editModal.saving} autoFocus aria-invalid={Boolean(editModal.error)}
            onChange={(e) => setEditModal((p) => ({ ...p, value: e.target.value, error: "" }))}
            placeholder={`Enter your ${editModal.field.toLowerCase()}`} className={modalStyles.input}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleEditSave(); } }} />
          {editModal.error && <p role="alert" className="text-xs leading-relaxed text-destructive">{editModal.error}</p>}
        </div>
      </FormDialog>

      <FormDialog open={pwModal.open} onOpenChange={(open) => { if (!open) requestCloseEditor("password"); }}
        className="resident-profile-dialog"
        title="Change Password" description="You will be signed out after updating." icon={<Lock />} pending={pwModal.saving}
        footer={<>
          <Button type="button" variant="outline" onClick={() => requestCloseEditor("password")} disabled={pwModal.saving} className={modalStyles.cancelButton}>Cancel</Button>
          <Button type="button" onClick={() => void handlePasswordSave()} disabled={pwModal.saving} className={modalStyles.primaryButton} loading={pwModal.saving} loadingLabel="Updating…">
            Change Password
          </Button>
        </>}
      >
        {([{ key: "oldPw", label: "Current password", autoComplete: "current-password", visible: pwModal.showOld },
          { key: "newPw", label: "New password", autoComplete: "new-password", visible: pwModal.showNew },
          { key: "confirmPw", label: "Confirm new password", autoComplete: "new-password", visible: false }] as const).map(({ key, label, autoComplete, visible }) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`resident-password-${key}`} className={modalStyles.label}>{label}</Label>
            <div className="relative">
              <Input id={`resident-password-${key}`} value={pwModal[key]} type={visible ? "text" : "password"} autoComplete={autoComplete} disabled={pwModal.saving}
                onChange={(e) => setPwModal((p) => ({ ...p, [key]: e.target.value, error: "" }))}
                className={`${modalStyles.input} ${key !== "confirmPw" ? "pr-10" : ""}`} />
              {key !== "confirmPw" && <button type="button" disabled={pwModal.saving} aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
                onClick={() => setPwModal((p) => key === "oldPw" ? ({ ...p, showOld: !p.showOld }) : ({ ...p, showNew: !p.showNew }))}
                className="gw-action-ghost absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>}
            </div>
            {key === "newPw" && <p className="text-ui-caption leading-relaxed text-muted-foreground">Use at least 8 characters.</p>}
          </div>
        ))}
        {pwModal.error && <p role="alert" className="text-xs leading-relaxed text-destructive">{pwModal.error}</p>}
      </FormDialog>

      <UnsavedChangesDialog isOpen={discardTarget !== null} onClose={() => setDiscardTarget(null)}
        onDiscard={() => { if (discardTarget) closeEditor(discardTarget); }}
        title={discardTarget === "password" ? "Discard Password Changes?" : discardTarget === "address" ? "Discard Address Changes?" : "Discard Profile Changes?"}
        description={discardTarget === "password" ? "Your entered passwords will be cleared." : "Your unsaved changes will be lost."}
        discardLabel="Discard Changes" isSaving={discardTarget === "password" ? pwModal.saving : discardTarget === "address" ? addressModal.saving : editModal.saving} />
      <ConfirmationDialog kind="dialog" open={logoutModal} onOpenChange={setLogoutModal} title="Log Out of GreenWay?"
        description="Sign out of your current resident session?" icon={<LogOut />} variant="destructive" confirmLabel="Log Out" onConfirm={handleLogout} pendingLabel="Logging out…" />
    </div>
  );
};

export default ResidentProfile;
