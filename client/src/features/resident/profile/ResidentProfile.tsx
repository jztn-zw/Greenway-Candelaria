import { useResidentQuery, useResidentResource, useResidentMutation } from "@/lib/residentQuery";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail, Phone, Lock, User, Award, Calendar,
  Heart, ChevronRight, Check,
  ClipboardList, Loader2, AlertCircle, Eye, EyeOff,
  ShieldCheck, MapPin, Sparkles, AtSign, LogOut, Paintbrush,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/FormDialog";
import { formDialogStyles as modalStyles } from "@/components/formDialogStyles";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ProfileSkeleton } from "@/components/PageLoadingSkeletons";
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
  <div className="group -mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/40 md:-mx-4 md:px-4 md:py-3">
    <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/60 text-muted-foreground shadow-2xs transition-colors group-hover:border-primary/30 group-hover:text-primary lg:size-10">
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground lg:text-[11px]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-foreground lg:text-sm">
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
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/70 bg-muted/70 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
        <ShieldCheck className="size-3.5 text-primary" />
        Registered email
      </span>
    ) : (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="h-8 shrink-0 cursor-pointer rounded-xl border-primary/35 bg-primary/10 px-3 text-xs font-semibold text-primary shadow-none transition-all hover:border-primary/55 hover:bg-primary/15 hover:text-primary focus-visible:ring-primary/25 active:scale-95"
      >
        {masked ? "Change" : "Edit"}
      </Button>
    )}
  </div>
);

const AVATAR_STYLES = [
  { id: "forest", label: "Forest", className: "bg-gradient-to-br from-primary to-emerald-700" },
  { id: "ocean", label: "Ocean", className: "bg-gradient-to-br from-sky-500 to-blue-700" },
  { id: "sunset", label: "Sunset", className: "bg-gradient-to-br from-orange-400 to-rose-600" },
  { id: "violet", label: "Violet", className: "bg-gradient-to-br from-violet-500 to-fuchsia-700" },
] as const;

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
  const error = profileQuery.isError ? "Failed to load profile. Please try again." : null;
  const saveProfile = useResidentMutation(updateProfile, "profile", "routes", "tracking", "schedule", "announcements");
  const savePassword = useResidentMutation(changePassword);
  const [avatarStyle, setAvatarStyle] = useState<(typeof AVATAR_STYLES)[number]["id"]>("forest");
  const [avatarModal, setAvatarModal] = useState(false);

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
    const savedStyle = localStorage.getItem(`greenway:resident-avatar:${profile.id}`);
    if (AVATAR_STYLES.some((style) => style.id === savedStyle)) {
      setAvatarStyle(savedStyle as (typeof AVATAR_STYLES)[number]["id"]);
    }
  }, [profile?.id]);

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
    setEditModal((p) => ({ ...p, saving: true, error: "" }));
    try {
      const fieldMap: Record<string, string> = {
        "Full Name": "full_name",
        "Username": "username",
        "Phone Number": "phone",
      };
      const key = fieldMap[editModal.field];
      if (!key) return;
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
    setLogoutModal(false);
    await logout();
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
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

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
  const selectedAvatarStyle = AVATAR_STYLES.find((style) => style.id === avatarStyle) ?? AVATAR_STYLES[0];

  const saveAvatarStyle = (styleId: (typeof AVATAR_STYLES)[number]["id"]) => {
    setAvatarStyle(styleId);
    if (profile?.id) localStorage.setItem(`greenway:resident-avatar:${profile.id}`, styleId);
    setAvatarModal(false);
    toast.success("Avatar style updated");
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
    return (
      <div className="max-w-3xl mx-auto">
        <ProfileSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center gap-4 py-16">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {error ?? "Profile unavailable."}
        </p>
        <Button variant="outline" onClick={() => void profileQuery.refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 md:space-y-6">
      {/* ── Profile Header Banner ─────────────────────────────────────────── */}
      <div className="relative rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {/* Subtle decorative atmospheric banner */}
        <div className="relative h-28 overflow-hidden border-b border-border/50 bg-gradient-to-r from-primary/20 via-emerald-500/15 to-teal-500/20 lg:h-36">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 left-1/3 w-36 h-36 rounded-full bg-primary/10 blur-xl pointer-events-none" />

          <div
            className={`absolute top-3.5 right-3.5 lg:top-4 lg:right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border text-xs font-semibold shadow-xs ${
              isActiveResident
                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/30 text-amber-600 dark:text-amber-400"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isActiveResident ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isActiveResident ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </span>
            <span>{isActiveResident ? "Active Resident" : "Account Pending"}</span>
          </div>
        </div>

        {/* Avatar & Core Identity */}
        <div className="relative px-4 pb-5 pt-0 md:px-6 md:pb-6 lg:px-8 lg:pb-7">
          <div className="-mt-14 flex flex-col items-center gap-3.5 text-center md:-mt-18 md:flex-row md:items-end md:gap-6 md:text-left">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <Avatar className="size-20 rounded-full ring-4 ring-background shadow-lg lg:size-28">
                <AvatarFallback className={`${selectedAvatarStyle.className} rounded-full text-3xl font-display font-bold text-primary-foreground`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAvatarModal(true)}
                className="h-8 gap-1.5 rounded-xl border-border/80 px-3 text-[11px] font-semibold hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <Paintbrush className="size-3.5" />
                Customize
              </Button>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-col justify-center gap-1.5 md:flex-row md:items-center md:justify-start md:gap-3">
                <h1 className="truncate font-display text-lg font-bold tracking-tight text-foreground lg:text-2xl">
                  {profile.full_name}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/60 w-fit mx-auto lg:mx-0">
                  @{profile.username}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:justify-start md:gap-x-4 md:gap-y-1.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-medium text-foreground/85">
                    {profile.barangay_name
                      ? `Brgy. ${profile.barangay_name}`
                      : "No barangay set"}
                  </span>
                </div>
                <span className="hidden md:inline text-border">•</span>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                  <span>Joined {joinDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Personal Information ─────────────────────────────────────────────── */}
      <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs md:space-y-4 md:p-5 lg:p-6">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-foreground tracking-tight">
                Personal Information
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage your profile details and security credentials
              </p>
            </div>
          </div>
          <span className="hidden md:inline-block text-[11px] font-medium text-muted-foreground">
            Tap edit to update
          </span>
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
      </div>

      {/* ── Community Impact & Reports ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-5 lg:p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-foreground tracking-tight">
                Community Impact & Reports
              </h2>
              <p className="text-xs text-muted-foreground">
                Your activity and contributions to clean Candelaria
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/resident/my-reports")}
            className="h-8.5 px-3.5 rounded-xl text-xs font-semibold border-border/80 hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all cursor-pointer shadow-2xs flex items-center gap-1 active:scale-95"
          >
            My Reports History <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Resolution Progress Bar */}
        <div className="p-4 lg:p-4.5 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                Action Resolution Rate
              </span>
              <span className="text-muted-foreground">• MENRO Response</span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-display bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {totalReports > 0
                ? `${resolutionRate}% Resolved`
                : "Ready to Report"}
            </span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden p-0.5 border border-border/40">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${totalReports > 0 ? resolutionRate : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {totalReports > 0
              ? `${resolvedReports} of ${totalReports} reported community issues have been successfully cleared or resolved.`
              : "Help keep Candelaria clean and green by submitting a report whenever you spot waste issues."}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-primary/40 hover:shadow-2xs transition-all space-y-1 text-center group">
            <p className="text-2xl lg:text-3xl font-bold font-display text-primary group-hover:scale-105 transition-transform">
              {stats?.total ?? 0}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Submitted
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-emerald-500/40 hover:shadow-2xs transition-all space-y-1 text-center group">
            <p className="text-2xl lg:text-3xl font-bold font-display text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              {stats?.resolved ?? 0}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Resolved
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-amber-500/40 hover:shadow-2xs transition-all space-y-1 text-center group">
            <p className="text-2xl lg:text-3xl font-bold font-display text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              {stats?.pending ?? 0}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Review
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border/80 hover:border-sky-500/40 hover:shadow-2xs transition-all space-y-1 text-center group">
            <p className="text-2xl lg:text-3xl font-bold font-display text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
              {(stats?.in_progress ?? 0) + (stats?.under_review ?? 0)}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              In Progress
            </p>
          </div>
        </div>
      </div>

      {/* ── Badges & Recognition ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 md:p-5 lg:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-foreground tracking-tight">
                Badges & Recognition
              </h2>
              <p className="text-xs text-muted-foreground">
                Achievements earned through civic participation
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/60">
            {badges.filter((b) => b.earned).length} of {badges.length} unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {badges.map((badge) => {
            const BadgeIcon = badge.icon;
            return (
              <div
                key={badge.id}
                className={`p-3.5 lg:p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                  badge.earned
                    ? "bg-card border-border/80 shadow-2xs hover:border-primary/40 hover:shadow-xs"
                    : "bg-muted/15 border-border/40 opacity-70"
                }`}
              >
                <div
                  className={`w-10 h-10 lg:w-11 lg:h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    badge.earned
                      ? `${badge.bg} ${badge.color} ${badge.border} shadow-2xs`
                      : "bg-muted text-muted-foreground border-border/50"
                  }`}
                >
                  <BadgeIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs lg:text-sm font-bold text-foreground truncate">
                      {badge.label}
                    </p>
                    {badge.earned ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                        <Check className="w-2.5 h-2.5" /> Earned
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-muted-foreground shrink-0 tabular-nums">
                        {badge.progress}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {badge.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pb-8">
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setLogoutModal(true)}
            className="w-full flex items-center justify-between p-4 lg:p-4.5 hover:bg-muted/40 active:bg-muted/60 transition-all duration-150 group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors flex items-center justify-center shrink-0 border border-border/50">
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

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span>In compliance with the Philippine Data Privacy Act of 2012 (R.A. 10173)</span>
        </div>
      </div>

      <FormDialog open={addressModal.open} onOpenChange={(open) => { if (!open) requestCloseEditor("address"); }}
        title="Edit Collection Address" description="Choose your barangay and street." icon={<MapPin />} pending={addressModal.saving}
        footer={<>
          <Button type="button" variant="outline" onClick={() => requestCloseEditor("address")} disabled={addressModal.saving} className={modalStyles.cancelButton}>Cancel</Button>
          <Button type="button" onClick={() => void saveAddress()} className={modalStyles.primaryButton}
            disabled={addressModal.saving || streetsLoading || !addressModal.barangayId || !addressModal.streetId || streetOptions.length === 0}>
            {addressModal.saving && <Loader2 className="size-3.5 animate-spin" />}{addressModal.saving ? "Saving…" : "Save address"}
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

      <FormDialog open={avatarModal} onOpenChange={setAvatarModal} title="Customize Avatar" description="Choose a color for your initials." icon={<Paintbrush />}
        footer={<Button type="button" variant="outline" onClick={() => setAvatarModal(false)} className={modalStyles.cancelButton}>Close</Button>}
      >
        <div className="grid grid-cols-2 gap-3">
          {AVATAR_STYLES.map((style) => (
            <button key={style.id} type="button" onClick={() => saveAvatarStyle(style.id)} aria-label={style.label} aria-pressed={style.id === avatarStyle}
              className={`flex items-center gap-3 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${style.id === avatarStyle ? "border-primary bg-primary/10" : "border-border/80 hover:border-primary/40 hover:bg-muted/40"}`}>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${style.className}`}>{initials}</span>
              <span className="text-xs font-semibold text-foreground">{style.label}</span>
            </button>
          ))}
        </div>
      </FormDialog>

      <FormDialog open={editModal.open} onOpenChange={(open) => { if (!open) requestCloseEditor("profile"); }}
        title={`Edit ${editModal.field}`} description={`Update your ${editModal.field.toLowerCase()}.`} icon={<User />} pending={editModal.saving}
        footer={<>
          <Button type="button" variant="outline" onClick={() => requestCloseEditor("profile")} disabled={editModal.saving} className={modalStyles.cancelButton}>Cancel</Button>
          <Button type="button" onClick={() => void handleEditSave()} disabled={editModal.saving} className={modalStyles.primaryButton}>
            {editModal.saving && <Loader2 className="size-3.5 animate-spin" />}{editModal.saving ? "Saving…" : "Save Changes"}
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
        title="Change Password" description="You will be signed out after updating." icon={<Lock />} pending={pwModal.saving}
        footer={<>
          <Button type="button" variant="outline" onClick={() => requestCloseEditor("password")} disabled={pwModal.saving} className={modalStyles.cancelButton}>Cancel</Button>
          <Button type="button" onClick={() => void handlePasswordSave()} disabled={pwModal.saving} className={modalStyles.primaryButton}>
            {pwModal.saving && <Loader2 className="size-3.5 animate-spin" />}{pwModal.saving ? "Saving…" : "Change Password"}
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
                className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
                {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>}
            </div>
            {key === "newPw" && <p className="text-[11px] leading-relaxed text-muted-foreground">Use at least 8 characters.</p>}
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
        description="Sign out of your current resident session?" icon={<LogOut />} variant="destructive" confirmLabel="Log Out" onConfirm={() => void handleLogout()} />
    </div>
  );
};

export default ResidentProfile;
