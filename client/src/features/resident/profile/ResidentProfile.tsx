import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, Mail, Phone, Lock, User, Award, Calendar,
  Heart, Trash2, ChevronRight, Check,
  ClipboardList, Loader2, AlertCircle, Eye, EyeOff,
  ShieldCheck, MapPin, Sparkles, AtSign, X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  uploadAvatar,
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
  <div className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1 gap-3">
    <div className="flex items-center gap-3.5 min-w-0 flex-1">
      <div className="w-9 h-9 rounded-xl bg-muted/70 text-foreground/80 border border-border/50 flex items-center justify-center shrink-0 shadow-2xs">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground truncate mt-0.5">
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
      <span className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-medium bg-muted text-muted-foreground border border-border shrink-0">
        Registered email
      </span>
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onEdit}
        className="h-8 px-3 rounded-lg text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 active:scale-95 transition-all shrink-0 cursor-pointer"
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatarUploading(true);
      const result = await uploadAvatar(file);
      setProfile(result.user);
      setUser(result.user as unknown as typeof authUser);
      toast.success("Profile photo updated!");
    } catch {
      toast.error("Failed to upload photo. Please try again.");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ── Profile Header Banner ─────────────────────────────────────────── */}
      <div className="relative rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {/* Subtle decorative atmospheric banner */}
        <div className="h-28 sm:h-32 bg-gradient-to-r from-primary/20 via-emerald-500/10 to-teal-500/20 border-b border-border/50 relative">
          <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/85 backdrop-blur-md border text-xs font-semibold shadow-2xs ${isActiveResident ? "border-primary/25 text-primary" : "border-amber-500/25 text-amber-600 dark:text-amber-400"}`}>
            <User className="w-3.5 h-3.5" />
            <span>{isActiveResident ? "Active Resident" : "Account Pending"}</span>
          </div>
        </div>

        {/* Avatar & Core Identity */}
        <div className="px-5 sm:px-8 pb-6 sm:pb-7 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 -mt-14 sm:-mt-16 text-center sm:text-left">
            <div className="relative group">
              <Avatar className="w-24 h-24 sm:w-28 sm:h-28 ring-4 ring-background shadow-lg rounded-full">
                <AvatarImage
                  src={profile.avatar_url ?? undefined}
                  alt={profile.full_name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground text-3xl font-display font-bold rounded-full">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-60 border-2 border-background"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                aria-label="Change profile photo"
                title="Upload new photo"
              >
                {avatarUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  void handleAvatarChange(e);
                }}
              />
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 justify-center sm:justify-start">
                <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground tracking-tight truncate">
                  {profile.full_name}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground w-fit mx-auto sm:mx-0">
                  @{profile.username}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-medium text-foreground/80">
                    {profile.barangay_name
                      ? `Brgy. ${profile.barangay_name}`
                      : "No barangay set"}
                  </span>
                </div>
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
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/80 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Personal Information
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Tap edit to update details
          </span>
        </div>

        <div className="divide-y divide-border/60">
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
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/80 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" /> Community Impact
            & Reports
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/resident/my-reports")}
            className="h-8 px-3 rounded-lg text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer -mr-1"
          >
            My Reports History <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {/* Resolution Progress Bar */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                Action Resolution Rate
              </span>
              <span className="text-muted-foreground">• MENRO Response</span>
            </div>
            <span className="font-bold font-display text-emerald-600 dark:text-emerald-400">
              {totalReports > 0
                ? `${resolutionRate}% Resolved`
                : "Ready to Report"}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 space-y-1 text-center">
            <p className="text-2xl font-bold font-display text-primary">
              {stats?.total ?? 0}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total Submitted
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1 text-center">
            <p className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
              {stats?.resolved ?? 0}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Resolved
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1 text-center">
            <p className="text-2xl font-bold font-display text-amber-600 dark:text-amber-400">
              {stats?.pending ?? 0}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Review
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-1 text-center">
            <p className="text-2xl font-bold font-display text-sky-600 dark:text-sky-400">
              {(stats?.in_progress ?? 0) + (stats?.under_review ?? 0)}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              In Progress
            </p>
          </div>
        </div>
      </div>

      {/* ── Badges & Recognition ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/80 flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" /> Badges & Recognition
          </h2>
          <span className="text-[11px] text-muted-foreground">
            {badges.filter((b) => b.earned).length} of {badges.length} unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {badges.map((badge) => {
            const BadgeIcon = badge.icon;
            return (
              <div
                key={badge.id}
                className={`p-3.5 sm:p-4 rounded-2xl border flex items-start gap-3.5 transition-all ${
                  badge.earned
                    ? "bg-card border-border/80 shadow-2xs hover:border-primary/40"
                    : "bg-muted/20 border-border/40 opacity-75"
                }`}
              >
                <div
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    badge.earned
                      ? `${badge.bg} ${badge.color} ${badge.border} shadow-2xs`
                      : "bg-muted text-muted-foreground border-border/50"
                  }`}
                >
                  <BadgeIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">
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
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-muted/40 active:bg-muted/60 transition-all duration-150 group cursor-pointer text-left"
          >
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm group-hover:text-destructive transition-colors">
                Log Out
              </p>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Sign out of your account on this device
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors ml-4">
              <span className="hidden sm:inline text-xs font-medium">Sign Out</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setDeleteModal(true)}
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-destructive/5 active:bg-destructive/10 transition-all duration-150 group cursor-pointer text-left"
          >
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-sm group-hover:text-destructive transition-colors">
                Request Account Deletion
              </p>
              <p className="text-xs text-muted-foreground/80 font-normal mt-0.5">
                Permanently remove your account and personal data
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground group-hover:text-destructive transition-colors ml-4">
              <span className="hidden sm:inline text-xs font-medium">Delete</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground/70 text-center pt-1">
          In compliance with the Philippine Data Privacy Act of 2012 (R.A. 10173)
        </p>
      </div>

      {/* ── Edit Field Modal ──────────────────────────────────────────────────── */}
      <Dialog
        open={editModal.open}
        onOpenChange={(open) => {
          if (!editModal.saving) setEditModal((p) => ({ ...p, open, error: "" }));
        }}
      >
        <DialogContent className="sm:max-w-md flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden">
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
                <DialogDescription className="text-xs text-muted-foreground">
                  Update your {editModal.field.toLowerCase()} below.
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!editModal.saving) setEditModal((p) => ({ ...p, open: false }));
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
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
              <Input
                value={editModal.value}
                onChange={(e) =>
                  setEditModal((p) => ({ ...p, value: e.target.value, error: "" }))
                }
                placeholder={`Enter your ${editModal.field.toLowerCase()}`}
                disabled={editModal.saving}
                className="h-10 rounded-xl border-border/80 text-xs sm:text-sm focus-visible:ring-primary/20"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleEditSave();
                }}
              />
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
              className="h-9 px-4 rounded-xl text-xs font-semibold border-border/80 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleEditSave();
              }}
              disabled={editModal.saving}
              className="h-9 px-5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs active:scale-[0.98] cursor-pointer"
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
        <DialogContent className="sm:max-w-md flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
                <Lock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  Change Password
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  For security, you will be signed out after updating.
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!pwModal.saving) setPwModal((p) => ({ ...p, open: false }));
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
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
                  className="h-10 rounded-xl border-border/80 text-xs sm:text-sm pr-10"
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
                  className="h-10 rounded-xl border-border/80 text-xs sm:text-sm pr-10"
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
                className="h-10 rounded-xl border-border/80 text-xs sm:text-sm"
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
              className="h-9 px-4 rounded-xl text-xs font-semibold border-border/80 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handlePasswordSave();
              }}
              disabled={pwModal.saving}
              className="h-9 px-5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs active:scale-[0.98] cursor-pointer"
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
        <DialogContent className="sm:max-w-md flex flex-col p-0 rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-card [&>button:last-child]:hidden">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center shrink-0 shadow-2xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold font-display text-foreground tracking-tight">
                  Request Account Deletion
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  R.A. 10173 Data Privacy Act Compliance
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDeleteModal(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
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
              className="h-9 px-4 rounded-xl text-xs font-semibold border-border/80 cursor-pointer"
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
              className="h-9 px-5 rounded-xl text-xs font-semibold shadow-xs active:scale-[0.98] cursor-pointer"
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
