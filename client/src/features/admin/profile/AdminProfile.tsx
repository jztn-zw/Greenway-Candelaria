import { AdminConfirmationDialog as ConfirmationDialog } from "@/components/admin/AdminModal";
import { AdminUnsavedChangesDialog as UnsavedChangesDialog } from "@/components/admin/AdminModal";
import { FormDialogHeader } from "@/components/dialogs/FormDialog";
import { formDialogStyles } from "@/components/dialogs/formDialogStyles";
import { AdminProfileSkeleton } from "@/components/loading/PageLoadingSkeletons";
import { adminProfileStyles as styles } from "./adminProfileStyles";
import ProfileBannerImage from "@/components/common/ProfileBannerImage";
import ResidentPageHeader from "@/components/common/ResidentPageHeader";
import PageErrorState from "@/components/feedback/PageErrorState";
import DataRefreshNotice from "@/components/feedback/DataRefreshNotice";
import { ProfileAvatarControl, ProfileAvatarPicker } from "@/components/common/ProfileAvatarPicker";
import { DEFAULT_PROFILE_AVATAR_ID, isProfileAvatarId, profileAvatarForAccount, profileAvatarIdFromUrl, profileAvatarSrc, type ProfileAvatarId } from "@/components/common/profileAvatars";
import { Button } from "@/components/ui/button";
import { AdminModalContent as DialogContent } from "@/components/admin/AdminModal";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAction, useAdminResource } from "@/lib/adminQuery";
import { toast } from "@/lib/toast";
import { changePassword, fetchProfile, updateProfile, type UpdateProfilePayload, type UserProfile } from "@/services/profileService";
import useAuthStore from "@/store/authStore";
import useLogout from "@/hooks/useLogout";
import { formatManilaDateTime } from "@/utils/date";
import { AtSign, Calendar, ChevronRight, Clock3, Eye, EyeOff, Lock, LogOut, Mail, Phone, ShieldCheck, SquarePen, User, Users } from "lucide-react";
import { useEffect, useState, type ElementType, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

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
    <DialogContent className={`${formDialogStyles.content} ${styles.dialog}`}>
      <FormDialogHeader title={title} description={description} icon={<Icon />} onClose={() => onOpenChange(false)} disabled={pending} closeLabel={`Close ${title.toLowerCase()}`} />
      <div className={formDialogStyles.body}>{children}</div>
      <div className={formDialogStyles.footer}>{footer}</div>
    </DialogContent>
  </Dialog>
);

const Section = ({ title, description, icon: Icon, children }: {
  title: string; description: string; icon: ElementType; children: React.ReactNode;
}) => (
  <section className={styles.section}>
    <div className={styles.sectionHeader}>
      <div className={styles.sectionIcon}><Icon className="size-4" /></div>
      <div className="min-w-0 [overflow-wrap:anywhere]"><h2 className="gw-heading text-sm text-foreground">{title}</h2><p className="text-xs text-muted-foreground">{description}</p></div>
    </div>
    {children}
  </section>
);

const ProfileField = ({ label, value, icon: Icon, onEdit, action = "Edit" }: {
  label: string; value: string | null | undefined; icon: ElementType; onEdit?: () => void; action?: string;
}) => (
  <div className={styles.row}>
    <div className={styles.rowContent}>
      <div className={styles.rowIcon}><Icon className="size-4" /></div>
      <div className="min-w-0 flex-1"><p className={styles.label}>{label}</p><p className={styles.value}>{value || <span className="font-normal italic text-muted-foreground/60">Not provided</span>}</p></div>
    </div>
    {onEdit ? <Button type="button" variant="primary-outline" size="sm" onClick={onEdit} aria-label={`${action} ${label.toLowerCase()}`} className={styles.fieldAction}>{action === "Edit" && <SquarePen aria-hidden="true" className="size-3.5 shrink-0" />}{action}</Button>
      : <span className={styles.registeredEmail} title="Registered Email"><ShieldCheck aria-hidden="true" className="size-3.5 shrink-0 text-primary" /><span className="admin-profile-email-label" aria-hidden="true">Registered Email</span><span className="sr-only">Registered Email</span></span>}
  </div>
);

const AdminProfile = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const handleLogout = useLogout();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const profileQuery = useAdminResource<UserProfile | null>("profile", [], fetchProfile, null);
  const { data: profile, setData: setProfile, isLoading: loading, isError: loadError, refetch: loadProfile } = profileQuery;
  const runAction = useAdminAction("profile");
  const [avatarId, setAvatarId] = useState<ProfileAvatarId>(DEFAULT_PROFILE_AVATAR_ID);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [savingAvatarId, setSavingAvatarId] = useState<ProfileAvatarId | null>(null);
  const savingAvatar = savingAvatarId !== null;
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
    const selected = profileAvatarIdFromUrl(profile.avatar_url);
    setAvatarId(selected ?? (isProfileAvatarId(saved) ? saved : profileAvatarForAccount(profile.id, profile.avatar_url)));
    if (!selected && !profile.avatar_url && isProfileAvatarId(saved)) {
      void updateProfile({ avatar_url: profileAvatarSrc(saved) }).then((updated) => {
        setProfile(updated);
        const current = useAuthStore.getState().user;
        if (current?.id === updated.id) setUser({ ...current, ...updated });
      }).catch(() => {});
    }
  }, [profile?.id, profile?.avatar_url, setProfile, setUser]);

  const saveAvatar = async (selectedId: ProfileAvatarId) => {
    if (!profile || savingAvatar) return;
    setSavingAvatarId(selectedId);
    try {
      const updated = await runAction(() => updateProfile({ avatar_url: profileAvatarSrc(selectedId) }));
      setProfile(updated);
      if (authUser) setUser({ ...authUser, ...updated });
      localStorage.setItem(`greenway:admin-avatar:${profile.id}`, selectedId);
      setAvatarId(selectedId);
      setAvatarOpen(false);
    } catch {
      toast.error("Could not update your avatar. Please try again.");
    } finally {
      setSavingAvatarId(null);
    }
  };

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
  if (!profile) return <PageErrorState kind="unavailable" description="We couldn't load your profile right now. Please try again." onRetry={() => void loadProfile()} retrying={profileQuery.isFetching} homeHref="/admin" />;

  const joined = formatManilaDateTime(profile.created_at, { year: "numeric", month: "long" });
  const lastSignIn = profile.last_login_at
    ? formatManilaDateTime(profile.last_login_at, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "Not recorded";

  return (
    <div className={styles.page}>
      <ResidentPageHeader title="Profile & Account" description="Manage your personal details and account security." />
      <div className={styles.stack}>
        <div className={styles.hero}>
          <div className={styles.cover}>
            <ProfileBannerImage />
          </div>
          <div className={styles.identity}>
            <div className={styles.identityRow}>
              <ProfileAvatarControl saving={savingAvatar} avatarClassName={styles.avatar} avatarId={avatarId} onCustomize={() => setAvatarOpen(true)} />
              <div className={styles.identityDetails}>
                <div className={styles.nameRow}><h2 className={styles.name}>{profile.full_name}</h2><span className={styles.username}>@{profile.username}</span></div>
                <div className={styles.metadata}><span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> Administrator</span><span className="flex items-center gap-1.5"><Calendar className="size-3.5" /> Joined {joined}</span></div>
              </div>
            </div>
          </div>
        </div>

        {loadError && <DataRefreshNotice message="Couldn't refresh your profile. Your edits are preserved; loaded information may be outdated." onRetry={() => void loadProfile()} retrying={profileQuery.isFetching} />}

        <Section title="Personal Information" description="Your profile details and sign-in credentials" icon={User}>
          <div className="divide-y divide-border/50">
            <ProfileField label="Full Name" value={profile.full_name} icon={User} onEdit={() => setEdit({ field: "full_name", value: profile.full_name, error: "", saving: false })} />
            <ProfileField label="Username" value={profile.username} icon={AtSign} onEdit={() => setEdit({ field: "username", value: profile.username, error: "", saving: false })} />
            <ProfileField label="Email Address" value={profile.email ?? ""} icon={Mail} />
            <ProfileField label="Phone Number" value={profile.phone} icon={Phone} onEdit={() => setEdit({ field: "phone", value: profile.phone ?? "", error: "", saving: false })} />
            <ProfileField label="Security Password" value="••••••••" icon={Lock} action="Change" onEdit={() => setPasswordOpen(true)} />
          </div>
        </Section>

        <Section title="Account Overview" description="Current account details from GreenWay" icon={ShieldCheck}>
          <div className={styles.overview}>
            {[{ label: "Role", value: "Administrator", icon: ShieldCheck }, { label: "Status", value: profile.status.charAt(0) + profile.status.slice(1).toLowerCase(), icon: User }, { label: "Last Sign-In", value: lastSignIn, icon: Clock3 }].map(({ label, value, icon: Icon }) => (
              <div key={label} className={styles.overviewCard}><Icon className="mb-2 size-4 text-primary" /><p className={styles.overviewLabel}>{label}</p><p className="mt-1 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{value}</p></div>
            ))}
          </div>
        </Section>

        <button type="button" onClick={() => setLogoutOpen(true)} className={styles.logout}><span className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/60 text-muted-foreground"><LogOut className="size-4" /></span><span><span className="block text-sm font-semibold text-foreground">Log Out</span><span className="block text-xs text-muted-foreground">Sign Out of This Device</span></span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></button>

      </div>

      <ProfileDialog
        open={avatarOpen} onOpenChange={setAvatarOpen} title="Customize Avatar"
        description="Select one of the ten profile avatars." icon={Users} pending={savingAvatar}
        footer={<Button type="button" variant="outline" disabled={savingAvatar} onClick={() => setAvatarOpen(false)} className={profileButtonClass}>Close</Button>}
      >
        <ProfileAvatarPicker saving={savingAvatarId} selected={avatarId} onSelect={(selectedId) => { void saveAvatar(selectedId); }} disabled={savingAvatar} />
      </ProfileDialog>

      <ProfileDialog
        open={Boolean(edit)} onOpenChange={(open) => { if (!open) requestCloseEdit(); }}
        title={`Edit ${edit ? fieldLabels[edit.field] : "Profile"}`}
        description={`Update your ${edit ? fieldLabels[edit.field].toLowerCase() : "profile"}.`} icon={User} pending={edit?.saving}
        footer={<>
          <Button type="button" variant="outline" onClick={requestCloseEdit} disabled={edit?.saving} className={profileButtonClass}>Cancel</Button>
          <Button type="button" onClick={() => void saveEdit()} disabled={edit?.saving} className={profileButtonClass} loading={!!(edit?.saving)} loadingLabel="Saving changes…">

            Save Changes
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
          <Button type="button" onClick={() => void savePassword()} disabled={savingPassword} className={profileButtonClass} loading={savingPassword} loadingLabel="Changing password…">

            Change Password
          </Button>
        </>}
      >
        <div className="space-y-1.5">
          <Label htmlFor="admin-current-password" className="text-xs font-medium">Current Password</Label>
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
          <Label htmlFor="admin-new-password" className="text-xs font-medium">New Password</Label>
          <Input id="admin-new-password" type="password" autoComplete="new-password" value={password.next}
            onChange={(event) => setPassword((value) => ({ ...value, next: event.target.value }))}
            disabled={savingPassword} className={profileInputClass} aria-describedby="admin-password-hint"
          />
          <p id="admin-password-hint" className="text-ui-caption leading-relaxed text-muted-foreground">Use at least 8 characters.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="admin-confirm-password" className="text-xs font-medium">Confirm New Password</Label>
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
      <ConfirmationDialog kind="dialog" open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={handleLogout} pendingLabel="Logging out…" title="Log Out of GreenWay?" description="Sign out of your current administrator session?" icon={<LogOut />} variant="destructive" confirmLabel="Log Out" />
    </div>
  );
};

export default AdminProfile;
