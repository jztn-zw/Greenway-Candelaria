import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import { FormDialogHeader } from "@/components/FormDialog";
import { formDialogStyles } from "@/components/formDialogStyles";
import { AdminProfileSkeleton } from "@/components/PageLoadingSkeletons";
import ProfileBannerImage from "@/components/common/ProfileBannerImage";
import PageErrorState from "@/components/PageErrorState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAction, useAdminResource } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { changePassword, fetchProfile, updateProfile, type UpdateProfilePayload, type UserProfile } from "@/services/profileService";
import useAuthStore from "@/store/authStore";
import { formatManilaDateTime } from "@/utils/date";
import { AtSign, Calendar, ChevronRight, Clock3, Eye, EyeOff, Loader2, Lock, LogOut, Mail, Paintbrush, Phone, ShieldCheck, User } from "lucide-react";
import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

const avatarStyles = [
  { id: "forest", label: "Forest", className: "bg-gradient-to-br from-primary to-emerald-700" },
  { id: "ocean", label: "Ocean", className: "bg-gradient-to-br from-sky-500 to-blue-700" },
  { id: "sunset", label: "Sunset", className: "bg-gradient-to-br from-orange-400 to-rose-600" },
  { id: "violet", label: "Violet", className: "bg-gradient-to-br from-violet-500 to-fuchsia-700" },
] as const;
type AvatarStyle = (typeof avatarStyles)[number]["id"];
type EditableField = "full_name" | "username" | "phone";
const fieldLabels: Record<EditableField, string> = { full_name: "Full Name", username: "Username", phone: "Phone Number" };
const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const profileInputClass = formDialogStyles.input;
const profileButtonClass = formDialogStyles.primaryButton;

const ProfileDialog = ({ open, onOpenChange, title, description, icon: Icon, pending = false, children, footer }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string;
  icon: ElementType; pending?: boolean; children: ReactNode; footer: ReactNode;
}) => (
  <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) onOpenChange(nextOpen); }}>
    <DialogContent className={formDialogStyles.content}>
      <FormDialogHeader title={title} description={description} icon={<Icon />} onClose={() => onOpenChange(false)} disabled={pending} closeLabel={`Close ${title.toLowerCase()}`} />
      <div className={formDialogStyles.body}>{children}</div>
      <div className={formDialogStyles.footer}>{footer}</div>
    </DialogContent>
  </Dialog>
);

const Section = ({ title, description, icon: Icon, children }: {
  title: string; description: string; icon: ElementType; children: React.ReactNode;
}) => (
  <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-xs md:p-5 lg:p-6">
    <div className="flex items-center gap-2.5 border-b border-border/50 pb-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></div>
      <div><h2 className="gw-heading text-sm text-foreground">{title}</h2><p className="text-xs text-muted-foreground">{description}</p></div>
    </div>
    {children}
  </section>
);

const ProfileField = ({ label, value, icon: Icon, onEdit, action = "Edit" }: {
  label: string; value: string | null | undefined; icon: ElementType; onEdit?: () => void; action?: string;
}) => (
  <div className="group -mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/40 md:-mx-4 md:px-4 md:py-3">
    <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/60 text-muted-foreground shadow-2xs group-hover:border-primary/30 group-hover:text-primary lg:size-10"><Icon className="size-4" /></div>
      <div className="min-w-0 flex-1"><p className="text-ui-overline font-semibold uppercase tracking-wider text-muted-foreground lg:text-ui-caption">{label}</p><p className="mt-0.5 truncate text-ui-label font-medium text-foreground lg:text-sm">{value || <span className="font-normal italic text-muted-foreground/60">Not provided</span>}</p></div>
    </div>
    {onEdit ? <Button type="button" variant="primary-outline" size="sm" onClick={onEdit} className="h-8 shrink-0 rounded-xl px-3 text-xs font-semibold shadow-none">{action}</Button>
      : <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/70 bg-muted/70 px-2.5 py-1.5 text-ui-caption font-medium text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" /> Registered email</span>}
  </div>
);

const AdminProfile = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const profileQuery = useAdminResource<UserProfile | null>("profile", [], fetchProfile, null);
  const { data: profile, setData: setProfile, isLoading: loading, isError: loadError, refetch: loadProfile } = profileQuery;
  const runAction = useAdminAction("profile");
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>("forest");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [edit, setEdit] = useState<{ field: EditableField; value: string; error: string; saving: boolean } | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [discardTarget, setDiscardTarget] = useState<"profile" | "password" | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    const saved = localStorage.getItem(`greenway:admin-avatar:${profile.id}`);
    if (avatarStyles.some(({ id }) => id === saved)) setAvatarStyle(saved as AvatarStyle);
  }, [profile?.id]);

  const saveEdit = async () => {
    if (!edit || !profile || edit.saving) return;
    const value = edit.value.trim();
    const invalid = edit.field === "full_name" ? value.length < 2
      : edit.field === "username" ? !/^[a-zA-Z0-9_]{3,50}$/.test(value)
      : value.length > 20 || !/^[0-9+()\-\s]*$/.test(value);
    if (invalid) {
      setEdit({ ...edit, error: edit.field === "username" ? "Use 3–50 letters, numbers, or underscores." : edit.field === "phone" ? "Enter a valid phone number." : "Enter at least 2 characters." });
      return;
    }
    setEdit({ ...edit, saving: true, error: "" });
    try {
      const updated = await runAction(() => updateProfile({ [edit.field]: value } as UpdateProfilePayload));
      setProfile(updated);
      if (authUser) setUser({ ...authUser, ...updated });
      setDiscardTarget(null);
      setEdit(null);
      toast.success("Profile updated.");
    } catch (error) {
      setEdit((current) => current && { ...current, saving: false, error: errorMessage(error, "Could not update your profile.") });
    }
  };

  const savePassword = async () => {
    if (savingPassword) return;
    if (!password.current || password.next.length < 8 || password.next !== password.confirm) {
      setPasswordError("Enter your current password and a matching new password of at least 8 characters.");
      return;
    }
    setSavingPassword(true);
    setPasswordError("");
    try {
      await runAction(() => changePassword({ old_password: password.current, new_password: password.next }));
      setPassword({ current: "", next: "", confirm: "" });
      toast.success("Password changed. Please sign in again.");
      clearAuth();
      navigate("/", { replace: true });
    } catch (error) {
      setPasswordError(errorMessage(error, "Could not change your password."));
    } finally { setSavingPassword(false); }
  };
  const handleLogout = async () => {
    try { await logout(); } finally { navigate("/", { replace: true }); }
  };

  const closePassword = () => {
    if (savingPassword) return;
    setDiscardTarget(null);
    setPasswordOpen(false);
    setPassword({ current: "", next: "", confirm: "" });
    setPasswordError("");
    setShowPassword(false);
  };

  const requestCloseEdit = () => {
    if (!edit || edit.saving) return;
    if (edit.value !== (profile?.[edit.field] ?? "")) setDiscardTarget("profile");
    else setEdit(null);
  };

  const requestClosePassword = () => {
    if (savingPassword) return;
    if (password.current || password.next || password.confirm) setDiscardTarget("password");
    else closePassword();
  };

  if (loading) return <AdminProfileSkeleton />;
  if (loadError || !profile) return <PageErrorState kind="unavailable" title="Profile couldn't load" description="We couldn't load your profile right now. Please try again." onRetry={() => void loadProfile()} homeHref="/admin" />;

  const initials = profile.full_name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
  const selectedStyle = avatarStyles.find(({ id }) => id === avatarStyle) ?? avatarStyles[0];
  const joined = formatManilaDateTime(profile.created_at, { year: "numeric", month: "long" });
  const lastSignIn = profile.last_login_at
    ? formatManilaDateTime(profile.last_login_at, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "Not recorded";
  const isActive = profile.status === "ACTIVE";

  return (
    <div className="mx-auto max-w-3xl space-y-5 md:space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        <div className="relative h-28 overflow-hidden border-b border-border/50 bg-muted/50 lg:h-36">
          <ProfileBannerImage />
          <div className={`absolute right-3.5 top-3.5 inline-flex items-center gap-2 rounded-md border bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-xs backdrop-blur-md lg:right-4 lg:top-4 ${isActive ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "border-amber-500/30 text-amber-600 dark:text-amber-400"}`}><span className={`size-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-amber-500"}`} />{isActive ? "Active Administrator" : profile.status.toLowerCase()}</div>
        </div>
        <div className="relative px-4 pb-5 md:px-6 md:pb-6 lg:px-8 lg:pb-7">
          <div className="-mt-14 flex flex-col items-center gap-3.5 text-center md:-mt-18 md:flex-row md:items-end md:gap-6 md:text-left">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <Avatar className="size-20 rounded-full ring-4 ring-background shadow-lg lg:size-28"><AvatarFallback className={`${selectedStyle.className} rounded-full font-body text-3xl font-semibold text-primary-foreground`}>{initials}</AvatarFallback></Avatar>
              <Button type="button" variant="outline" onClick={() => setAvatarOpen(true)} className="h-8 gap-1.5 rounded-xl px-3 text-ui-caption font-semibold"><Paintbrush className="size-3.5" /> Customize</Button>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-col items-center gap-1.5 md:flex-row md:gap-3"><h1 className="gw-heading max-w-full truncate text-lg tracking-tight text-foreground lg:text-2xl">{profile.full_name}</h1><span className="w-fit rounded-md border border-border/60 bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">@{profile.username}</span></div>
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground md:justify-start"><span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> Administrator</span><span className="flex items-center gap-1.5"><Calendar className="size-3.5" /> Joined {joined}</span></div>
            </div>
          </div>
        </div>
      </div>

      <Section title="Personal Information" description="Your profile details and sign-in credentials" icon={User}>
        <div className="divide-y divide-border/50">
          <ProfileField label="Full Name" value={profile.full_name} icon={User} onEdit={() => setEdit({ field: "full_name", value: profile.full_name, error: "", saving: false })} />
          <ProfileField label="Username" value={profile.username} icon={AtSign} onEdit={() => setEdit({ field: "username", value: profile.username, error: "", saving: false })} />
          <ProfileField label="Email Address" value={profile.email} icon={Mail} />
          <ProfileField label="Phone Number" value={profile.phone} icon={Phone} onEdit={() => setEdit({ field: "phone", value: profile.phone ?? "", error: "", saving: false })} />
          <ProfileField label="Security Password" value="••••••••" icon={Lock} action="Change" onEdit={() => setPasswordOpen(true)} />
        </div>
      </Section>

      <Section title="Account Overview" description="Current account details from GreenWay" icon={ShieldCheck}>
        <div className="grid gap-3 sm:grid-cols-3">
          {[{ label: "Role", value: "Administrator", icon: ShieldCheck }, { label: "Status", value: profile.status.charAt(0) + profile.status.slice(1).toLowerCase(), icon: User }, { label: "Last sign-in", value: lastSignIn, icon: Clock3 }].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-border/80 bg-muted/20 p-3.5"><Icon className="mb-2 size-4 text-primary" /><p className="text-ui-overline font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{value}</p></div>
          ))}
        </div>
      </Section>

      <button type="button" onClick={() => setLogoutOpen(true)} className="flex w-full items-center justify-between rounded-2xl border border-border/80 bg-card p-4 text-left shadow-xs transition-colors hover:bg-[var(--button-neutral-hover)]"><span className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-muted/60 text-muted-foreground"><LogOut className="size-4" /></span><span><span className="block text-sm font-semibold text-foreground">Log Out</span><span className="block text-xs text-muted-foreground">Sign out of this device</span></span></span><ChevronRight className="size-4 text-muted-foreground" /></button>

      <ProfileDialog
        open={avatarOpen} onOpenChange={setAvatarOpen} title="Customize avatar"
        description="Choose an initials color for this browser." icon={Paintbrush}
        footer={<Button type="button" variant="outline" onClick={() => setAvatarOpen(false)} className={profileButtonClass}>Close</Button>}
      >
        <div className="grid grid-cols-2 gap-3">
          {avatarStyles.map((style) => (
            <button key={style.id} type="button" aria-label={style.label} aria-pressed={avatarStyle === style.id}
              onClick={() => { setAvatarStyle(style.id); localStorage.setItem(`greenway:admin-avatar:${profile.id}`, style.id); setAvatarOpen(false); }}
              className={`flex items-center gap-3 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${avatarStyle === style.id ? "border-primary bg-primary/10" : "border-border/80 hover:border-primary/40 hover:bg-[var(--button-neutral-hover)]"}`}
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${style.className}`}>{initials}</span>
              <span className="text-xs font-semibold text-foreground">{style.label}</span>
            </button>
          ))}
        </div>
      </ProfileDialog>

      <ProfileDialog
        open={Boolean(edit)} onOpenChange={(open) => { if (!open) requestCloseEdit(); }}
        title={`Edit ${edit ? fieldLabels[edit.field] : "Profile"}`}
        description={`Update your ${edit ? fieldLabels[edit.field].toLowerCase() : "profile"}.`} icon={User} pending={edit?.saving}
        footer={<>
          <Button type="button" variant="outline" onClick={requestCloseEdit} disabled={edit?.saving} className={profileButtonClass}>Cancel</Button>
          <Button type="button" onClick={() => void saveEdit()} disabled={edit?.saving} className={profileButtonClass}>
            {edit?.saving && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
            {edit?.saving ? "Saving..." : "Save Changes"}
          </Button>
        </>}
      >
        <div className="space-y-1.5">
          <Label htmlFor="admin-profile-edit" className="text-xs font-medium">{edit ? fieldLabels[edit.field] : "Value"}</Label>
          <Input id="admin-profile-edit" value={edit?.value ?? ""}
            onChange={(event) => setEdit((current) => current && { ...current, value: event.target.value, error: "" })}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void saveEdit(); } }}
            disabled={edit?.saving} className={profileInputClass} autoFocus
            aria-invalid={Boolean(edit?.error)} aria-describedby={edit?.error ? "admin-profile-edit-error" : undefined}
          />
          {edit?.error && <p id="admin-profile-edit-error" role="alert" className="text-xs leading-relaxed text-destructive">{edit.error}</p>}
        </div>
      </ProfileDialog>

      <ProfileDialog
        open={passwordOpen} onOpenChange={(open) => { if (!open) requestClosePassword(); else setPasswordOpen(true); }}
        title="Change Password" description="You will be signed out after updating." icon={Lock} pending={savingPassword}
        footer={<>
          <Button type="button" variant="outline" onClick={requestClosePassword} disabled={savingPassword} className={profileButtonClass}>Cancel</Button>
          <Button type="button" onClick={() => void savePassword()} disabled={savingPassword} className={profileButtonClass}>
            {savingPassword && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
            {savingPassword ? "Updating..." : "Change Password"}
          </Button>
        </>}
      >
        <div className="space-y-1.5">
          <Label htmlFor="admin-current-password" className="text-xs font-medium">Current password</Label>
          <div className="relative">
            <Input id="admin-current-password" type={showPassword ? "text" : "password"} autoComplete="current-password"
              value={password.current} onChange={(event) => setPassword((value) => ({ ...value, current: event.target.value }))}
              disabled={savingPassword} className={`${profileInputClass} pr-10`} autoFocus
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} disabled={savingPassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="gw-action-ghost absolute right-1 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-new-password" className="text-xs font-medium">New password</Label>
          <Input id="admin-new-password" type="password" autoComplete="new-password" value={password.next}
            onChange={(event) => setPassword((value) => ({ ...value, next: event.target.value }))}
            disabled={savingPassword} className={profileInputClass} aria-describedby="admin-password-hint"
          />
          <p id="admin-password-hint" className="text-ui-caption leading-relaxed text-muted-foreground">Use at least 8 characters.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-confirm-password" className="text-xs font-medium">Confirm new password</Label>
          <Input id="admin-confirm-password" type="password" autoComplete="new-password" value={password.confirm}
            onChange={(event) => setPassword((value) => ({ ...value, confirm: event.target.value }))}
            disabled={savingPassword} className={profileInputClass}
          />
        </div>
        {passwordError && <p role="alert" className="text-xs leading-relaxed text-destructive">{passwordError}</p>}
      </ProfileDialog>
      <UnsavedChangesDialog
        isOpen={discardTarget !== null}
        onClose={() => setDiscardTarget(null)}
        onDiscard={() => {
          if (discardTarget === "password") closePassword();
          else if (!edit?.saving) { setDiscardTarget(null); setEdit(null); }
        }}
        title={discardTarget === "password" ? "Discard Password Changes?" : "Discard Profile Changes?"}
        description={discardTarget === "password"
          ? "Your entered passwords will be cleared."
          : "Your unsaved profile changes will be lost."}
        discardLabel="Discard Changes"
        isSaving={discardTarget === "password" ? savingPassword : edit?.saving}
      />
      <ConfirmationDialog kind="dialog" open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={() => void handleLogout()} title="Log Out of GreenWay?" description="Sign out of your current administrator session?" icon={<LogOut />} variant="destructive" confirmLabel="Log Out" />
    </div>
  );
};

export default AdminProfile;
