import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, Mail, Phone, Lock, User, Award, Calendar, Clock,
  Heart, FileText, Trash2, LogOut, ChevronRight, Check,
  CheckCircle2, ClipboardList, Loader2, AlertCircle, Eye, EyeOff,
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
import { toast } from "sonner";



// ─── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({
  title, icon: Icon, children,
}: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <section className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
    <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-primary/70 flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" /> {title}
    </h2>
    {children}
  </section>
);

// ─── Editable field row ───────────────────────────────────────────────────────
const FieldRow = ({
  label, value, icon: Icon, masked, onEdit,
}: {
  label: string; value: string; icon: React.ElementType; masked?: boolean; onEdit: () => void;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm text-foreground truncate">{masked ? "••••••••" : (value || "—")}</p>
      </div>
    </div>
    <button onClick={onEdit} className="text-xs text-primary hover:underline font-medium shrink-0 ml-3">
      {masked ? "Change" : "Edit"}
    </button>
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
        year: "numeric", month: "long", day: "numeric",
      })
    : "—";

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
        <p className="text-sm text-muted-foreground">{error ?? "Profile unavailable."}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Profile Header ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.full_name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-display font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-accent transition-colors disabled:opacity-60"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              aria-label="Change profile photo"
            >
              {avatarUploading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { void handleAvatarChange(e); }}
            />
          </div>

          <div className="text-center sm:text-left flex-1 min-w-0">
            <h1 className="text-xl font-display font-bold text-foreground">{profile.full_name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{profile.barangay_name ?? "No barangay set"}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 justify-center sm:justify-start">
              <Calendar className="w-3 h-3" /> Joined {joinDate}
            </p>
          </div>
        </div>
      </div>

      {/* ── Personal Information ─────────────────────────────────────────────── */}
      <Section title="Personal Information" icon={User}>
        <div>
          <FieldRow label="Full Name"    value={profile.full_name}     icon={User}  onEdit={() => openEdit("Full Name",    profile.full_name)} />
          <FieldRow label="Username"     value={profile.username}      icon={User}  onEdit={() => openEdit("Username",     profile.username)} />
          <FieldRow label="Email Address" value={profile.email}        icon={Mail}  onEdit={() => toast.info("Contact MENRO to change your email address.")} />
          <FieldRow label="Phone Number" value={profile.phone ?? ""}   icon={Phone} onEdit={() => openEdit("Phone Number", profile.phone ?? "")} />
          <FieldRow label="Password"     value=""                      icon={Lock}  masked onEdit={() => setPwModal((p) => ({ ...p, open: true }))} />
        </div>
      </Section>

      {/* ── Activity Summary ─────────────────────────────────────────────────── */}
      <Section title="Activity Summary" icon={ClipboardList}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Reports Submitted", value: stats?.total ?? 0,    icon: FileText },
            { label: "Reports Resolved",  value: stats?.resolved ?? 0, icon: CheckCircle2 },
            { label: "In Progress",       value: (stats?.in_progress ?? 0) + (stats?.under_review ?? 0), icon: Clock },
            { label: "Member Since",      value: new Date(profile.created_at).getFullYear().toString(), icon: Calendar },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-muted/50 p-3.5 text-center space-y-1">
              <item.icon className="w-4 h-4 text-primary mx-auto" />
              <p className="text-lg font-display font-bold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{item.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Recent Reports ───────────────────────────────────────────────────── */}
      <Section title="My Reports" icon={FileText}>
        {stats && stats.total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No reports submitted yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Total",        count: stats?.total ?? 0,        color: "bg-primary/10 text-primary border border-primary/20" },
              { label: "Resolved",     count: stats?.resolved ?? 0,     color: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30" },
              { label: "Pending",      count: stats?.pending ?? 0,      color: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30" },
              { label: "In Progress",  count: stats?.in_progress ?? 0,  color: "bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30" },
              { label: "Under Review", count: stats?.under_review ?? 0, color: "bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-3 text-center space-y-0.5 ${s.color}`}>
                <p className="text-xl font-bold">{s.count}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate("/resident/my-reports")}>
          View All Reports <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </Section>

      {/* ── Badges & Recognition ─────────────────────────────────────────────── */}
      <Section title="Badges & Recognition" icon={Award}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "First Report",      icon: FileText,     earned: (stats?.total ?? 0) >= 1 },
            { label: "5 Reports",         icon: ClipboardList,earned: (stats?.total ?? 0) >= 5 },
            { label: "3 Resolved",        icon: CheckCircle2, earned: (stats?.resolved ?? 0) >= 3 },
            { label: "Active Resident",   icon: Heart,        earned: true },
          ].map((b) => (
            <div
              key={b.label}
              className={`rounded-lg p-4 text-center space-y-2 transition-colors ${
                b.earned
                  ? "bg-primary/5 border border-primary/20"
                  : "bg-muted/30 border border-border opacity-50"
              }`}
            >
              <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center ${
                b.earned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <b.icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-foreground">{b.label}</p>
              {b.earned && (
                <div className="flex items-center justify-center gap-1 text-[10px] text-primary font-semibold">
                  <Check className="w-3 h-3" /> Earned
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Actions ──────────────────────────────────────────────────────────── */}
      <div className="space-y-3 pb-8">
        <button
          type="button"
          onClick={() => { void handleLogout(); }}
          className="w-full flex items-center justify-between p-4 rounded-2xl border border-border/80 bg-card hover:bg-destructive/5 hover:border-destructive/25 transition-all duration-200 group active:scale-[0.99] cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-destructive/10 group-hover:text-destructive transition-colors shrink-0">
              <LogOut className="w-5 h-5" />
            </div>
            <div className="text-left min-w-0">
              <span className="block font-bold text-foreground group-hover:text-destructive transition-colors text-sm">
                Log Out
              </span>
              <span className="block text-xs text-muted-foreground font-normal">
                Sign out of your account on this device
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-destructive group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => setDeleteModal(true)}
          className="w-full flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-border/60 bg-card/60 hover:bg-destructive/5 hover:border-destructive/20 transition-all duration-200 group active:scale-[0.99] cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground/80 group-hover:bg-destructive/10 group-hover:text-destructive transition-colors shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <span className="block font-semibold text-muted-foreground group-hover:text-destructive transition-colors text-xs sm:text-sm">
                Request Account Deletion
              </span>
              <span className="block text-[11px] text-muted-foreground/70 font-normal">
                Permanently remove your account and personal data
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-destructive group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>

        <p className="text-[11px] text-muted-foreground/80 text-center pt-1">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit {editModal.field}</DialogTitle>
            <DialogDescription>Update your {editModal.field.toLowerCase()} below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{editModal.field}</Label>
              <Input
                value={editModal.value}
                onChange={(e) => setEditModal((p) => ({ ...p, value: e.target.value, error: "" }))}
                placeholder={`Enter ${editModal.field.toLowerCase()}`}
                disabled={editModal.saving}
                onKeyDown={(e) => { if (e.key === "Enter") void handleEditSave(); }}
              />
              {editModal.error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {editModal.error}
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditModal((p) => ({ ...p, open: false }))} disabled={editModal.saving}>Cancel</Button>
              <Button onClick={() => { void handleEditSave(); }} disabled={editModal.saving}>
                {editModal.saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</> : "Save"}
              </Button>
            </div>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Change Password</DialogTitle>
            <DialogDescription>You will be logged out after changing your password.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <div className="relative">
                <Input
                  type={pwModal.showOld ? "text" : "password"}
                  value={pwModal.oldPw}
                  onChange={(e) => setPwModal((p) => ({ ...p, oldPw: e.target.value, error: "" }))}
                  placeholder="Enter current password"
                  disabled={pwModal.saving}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setPwModal((p) => ({ ...p, showOld: !p.showOld }))}
                >
                  {pwModal.showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={pwModal.showNew ? "text" : "password"}
                  value={pwModal.newPw}
                  onChange={(e) => setPwModal((p) => ({ ...p, newPw: e.target.value, error: "" }))}
                  placeholder="At least 8 characters"
                  disabled={pwModal.saving}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setPwModal((p) => ({ ...p, showNew: !p.showNew }))}
                >
                  {pwModal.showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={pwModal.confirmPw}
                onChange={(e) => setPwModal((p) => ({ ...p, confirmPw: e.target.value, error: "" }))}
                placeholder="Repeat new password"
                disabled={pwModal.saving}
              />
            </div>
            {pwModal.error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {pwModal.error}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setPwModal((p) => ({ ...p, open: false }))} disabled={pwModal.saving}>Cancel</Button>
              <Button onClick={() => { void handlePasswordSave(); }} disabled={pwModal.saving}>
                {pwModal.saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Saving…</> : "Change Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Account Modal ──────────────────────────────────────────────── */}
      <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Request Account Deletion</DialogTitle>
            <DialogDescription>
              This will submit a request to delete your account and all associated data.
              This action cannot be undone. Your request will be processed in accordance with the Philippine Data Privacy Act.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteModal(false);
                toast.info("Account deletion request submitted. MENRO will process it within 7 working days.");
              }}
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
