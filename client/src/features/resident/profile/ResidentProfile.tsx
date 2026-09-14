import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail, Phone, Lock, User, Award, Calendar,
  Heart, Trash2, ChevronRight, Check,
  ClipboardList, Loader2, AlertCircle, Eye, EyeOff,
  ShieldCheck, MapPin, Sparkles, AtSign, X, LogOut, Paintbrush,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProfileSkeleton } from "@/components/PageLoadingSkeletons";
import useAuthStore from "@/store/authStore";
import {
  fetchProfile,
  updateProfile,
  changePassword,
  fetchMyReportStats,
  UserProfile,
  ReportStats,
} from "@/services/profileService";
import { toast } from "@/lib/toast";

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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-muted text-muted-foreground border border-border/70 shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/70" />
        Registered email
      </span>
    ) : (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="h-8.5 px-3.5 rounded-xl text-xs font-semibold border-border/80 hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-95 transition-all shrink-0 cursor-pointer shadow-2xs"
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarStyle, setAvatarStyle] = useState<(typeof AVATAR_STYLES)[number]["id"]>("forest");
  const [avatarModal, setAvatarModal] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState<{
    open: boolean; field: string; value: string; saving: boolean; error: string;
  }>({ open: false, field: "", value: "", saving: false, error: "" });

  // Password modal
  const [pwModal, setPwModal] = useState<{
    open: boolean; oldPw: string; newPw: string; confirmPw: string;
    showOld: boolean; showNew: boolean; saving: boolean; error: string;
  }>({ open: false, oldPw: "", newPw: "", confirmPw: "", showOld: false, showNew: false, saving: false, error: "" });

  const [deleteModal, setDeleteModal] = useState(false);

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [prof, reportStats] = await Promise.all([
          fetchProfile(),
          fetchMyReportStats(),
        ]);
        setProfile(prof);
        setStats(reportStats);
      } catch {
        setError("Failed to load profile. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    const savedStyle = localStorage.getItem(`greenway:resident-avatar:${profile.id}`);
    if (AVATAR_STYLES.some((style) => style.id === savedStyle)) {
      setAvatarStyle(savedStyle as (typeof AVATAR_STYLES)[number]["id"]);
    }
  }, [profile?.id]);

  // ── Edit field save ───────────────────────────────────────────────────────
  const openEdit = (field: string, value: string) =>
    setEditModal({ open: true, field, value, saving: false, error: "" });

  const handleEditSave = async () => {
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
      const updated = await updateProfile({ [key]: editModal.value.trim() });
      setProfile(updated);
      if (authUser) setUser({ ...authUser, ...updated } as typeof authUser);
      setEditModal((p) => ({ ...p, open: false }));
      toast.success(`${editModal.field} updated successfully!`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to update. Please try again.";
      setEditModal((p) => ({ ...p, error: msg, saving: false }));
    }
  };

  // ── Password change ───────────────────────────────────────────────────────
  const handlePasswordSave = async () => {
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
      await changePassword({ old_password: pwModal.oldPw, new_password: pwModal.newPw });
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
    navigate("/", { replace: true });
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
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

  if (error || !profile) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center gap-4 py-16">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {error ?? "Profile unavailable."}
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
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
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs divide-y divide-border/60">
          <button
            type="button"
            onClick={() => {
              void handleLogout();
            }}
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

          <button
            type="button"
            onClick={() => setDeleteModal(true)}
            className="w-full flex items-center justify-between p-4 lg:p-4.5 hover:bg-destructive/5 active:bg-destructive/10 transition-all duration-150 group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive group-hover:bg-destructive/15 transition-colors flex items-center justify-center shrink-0 border border-destructive/20">
                <Trash2 className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-sm group-hover:text-destructive transition-colors">
                  Request Account Deletion
                </p>
                <p className="text-xs text-muted-foreground/80 font-normal mt-0.5">
                  Permanently remove your account and personal data
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground group-hover:text-destructive transition-colors ml-4">
              <span className="hidden lg:inline text-xs font-medium">Delete</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span>In compliance with the Philippine Data Privacy Act of 2012 (R.A. 10173)</span>
        </div>
      </div>

      {/* ── Avatar Customization Modal ─────────────────────────────────────────── */}
      <Dialog open={avatarModal} onOpenChange={setAvatarModal}>
        <DialogContent className="w-[94vw] max-w-sm rounded-2xl border-border/80 bg-card p-5 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold">Customize avatar</DialogTitle>
            <DialogDescription className="text-xs">
              Choose a color style for the initials avatar shown in this web portal.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-1">
            {AVATAR_STYLES.map((style) => {
              const selected = style.id === avatarStyle;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => saveAvatarStyle(style.id)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    selected ? "border-primary bg-primary/10" : "border-border/80 hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <span className={`flex size-10 items-center justify-center rounded-full text-sm font-bold text-white ${style.className}`}>
                    {initials}
                  </span>
                  <span className="text-xs font-semibold text-foreground">{style.label}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Field Modal ──────────────────────────────────────────────────── */}
      <Dialog
        open={editModal.open}
        onOpenChange={(open) => {
          if (!editModal.saving) setEditModal((p) => ({ ...p, open, error: "" }));
        }}
      >
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] lg:max-w-md flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
                {editModal.field === "Phone Number" ? (
                  <Phone className="w-5 h-5" />
                ) : editModal.field === "Username" ? (
                  <AtSign className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  Edit {editModal.field}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  Update your {editModal.field.toLowerCase()} below.
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!editModal.saving) setEditModal((p) => ({ ...p, open: false }));
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground tracking-tight">
                {editModal.field}
              </Label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  {editModal.field === "Phone Number" ? (
                    <Phone className="w-4 h-4" />
                  ) : editModal.field === "Username" ? (
                    <AtSign className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <Input
                  value={editModal.value}
                  onChange={(e) =>
                    setEditModal((p) => ({ ...p, value: e.target.value, error: "" }))
                  }
                  placeholder={`Enter your ${editModal.field.toLowerCase()}`}
                  disabled={editModal.saving}
                  className="h-11 pl-10 rounded-xl border-border/80 text-xs lg:text-sm bg-background/50 focus:bg-background focus-visible:ring-primary/20 transition-colors"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleEditSave();
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                {editModal.field === "Username"
                  ? "Your unique handle across GreenWay (letters, numbers, and underscores)."
                  : editModal.field === "Phone Number"
                  ? "Used for official collection updates and emergency dispatch SMS."
                  : "Your official legal name as recognized in municipal records."}
              </p>
              {editModal.error && (
                <p className="text-xs text-destructive flex items-center gap-1.5 font-medium animate-in fade-in duration-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {editModal.error}
                </p>
              )}
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditModal((p) => ({ ...p, open: false }))}
              disabled={editModal.saving}
              className="h-10 px-4 rounded-xl text-xs lg:text-sm font-semibold border-border/80 hover:bg-muted/80 cursor-pointer active:scale-[0.98] transition-all"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleEditSave();
              }}
              disabled={editModal.saving}
              className="h-10 px-5 rounded-xl text-xs lg:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs active:scale-[0.98] cursor-pointer transition-all"
            >
              {editModal.saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Modal ─────────────────────────────────────────────── */}
      <Dialog
        open={pwModal.open}
        onOpenChange={(open) => {
          if (!pwModal.saving) setPwModal((p) => ({ ...p, open, error: "" }));
        }}
      >
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] lg:max-w-md flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
                <Lock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  Change Password
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  For security, you will be signed out after updating.
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!pwModal.saving) setPwModal((p) => ({ ...p, open: false }));
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-3.5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground tracking-tight">Current Password</Label>
              <div className="relative">
                <Input
                  type={pwModal.showOld ? "text" : "password"}
                  value={pwModal.oldPw}
                  onChange={(e) =>
                    setPwModal((p) => ({ ...p, oldPw: e.target.value, error: "" }))
                  }
                  placeholder="Enter current password"
                  disabled={pwModal.saving}
                  className="h-10 lg:h-10.5 rounded-xl border-border/80 text-xs lg:text-sm pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  onClick={() =>
                    setPwModal((p) => ({ ...p, showOld: !p.showOld }))
                  }
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
              <Label className="text-xs font-semibold text-foreground tracking-tight">New Password</Label>
              <div className="relative">
                <Input
                  type={pwModal.showNew ? "text" : "password"}
                  value={pwModal.newPw}
                  onChange={(e) =>
                    setPwModal((p) => ({ ...p, newPw: e.target.value, error: "" }))
                  }
                  placeholder="At least 8 characters"
                  disabled={pwModal.saving}
                  className="h-10 lg:h-10.5 rounded-xl border-border/80 text-xs lg:text-sm pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  onClick={() =>
                    setPwModal((p) => ({ ...p, showNew: !p.showNew }))
                  }
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
              <Label className="text-xs font-semibold text-foreground tracking-tight">Confirm New Password</Label>
              <Input
                type="password"
                value={pwModal.confirmPw}
                onChange={(e) =>
                  setPwModal((p) => ({
                    ...p,
                    confirmPw: e.target.value,
                    error: "",
                  }))
                }
                placeholder="Repeat new password"
                disabled={pwModal.saving}
                className="h-10 lg:h-10.5 rounded-xl border-border/80 text-xs lg:text-sm"
              />
            </div>
            {pwModal.error && (
              <p className="text-xs text-destructive flex items-center gap-1.5 font-medium animate-in fade-in duration-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {pwModal.error}
              </p>
            )}
          </div>

          <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPwModal((p) => ({ ...p, open: false }))}
              disabled={pwModal.saving}
              className="h-10 px-4 rounded-xl text-xs lg:text-sm font-semibold border-border/80 hover:bg-muted/80 cursor-pointer active:scale-[0.98] transition-all"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handlePasswordSave();
              }}
              disabled={pwModal.saving}
              className="h-10 px-5 rounded-xl text-xs lg:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs active:scale-[0.98] cursor-pointer transition-all"
            >
              {pwModal.saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Account Modal ──────────────────────────────────────────────── */}
      <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[94vw] lg:max-w-md flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0 shadow-2xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  Request Account Deletion
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate mt-0.5">
                  R.A. 10173 Data Privacy Act Compliance
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeleteModal(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0 -mr-1"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-3 text-xs text-muted-foreground leading-relaxed">
            <p className="text-foreground/90 font-medium">
              This will submit an official request to permanently delete your GreenWay account and all associated personal records.
            </p>
            <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-1">
              <p className="font-semibold text-foreground">Processing Timeline</p>
              <p>In compliance with the Philippine Data Privacy Act of 2012 (R.A. 10173), MENRO Candelaria will process and verify your request within 7 working days.</p>
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModal(false)}
              className="h-10 px-4 rounded-xl text-xs lg:text-sm font-semibold border-border/80 hover:bg-muted/80 cursor-pointer active:scale-[0.98] transition-all"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDeleteModal(false);
                toast.info(
                  "Account deletion request submitted. MENRO will process it within 7 working days."
                );
              }}
              className="h-10 px-5 rounded-xl text-xs lg:text-sm font-bold shadow-xs active:scale-[0.98] cursor-pointer transition-all"
            >
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResidentProfile;

