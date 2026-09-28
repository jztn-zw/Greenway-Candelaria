import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { collectorKey, useCollectorAction, useCollectorQuery } from "@/lib/collectorQuery";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Calendar,
  User,
  Mail,
  Phone,
  Lock,
  Truck,
  Eye,
  EyeOff,
  Loader2,
  Wrench,
  Paintbrush,
  ChevronRight,
  LogOut,
  ShieldCheck,
  AtSign,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import useAuthStore from "@/store/authStore";
import {
  fetchProfile,
  updateProfile,
  uploadAvatar,
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
import UnsavedChangesDialog from "@/components/UnsavedChangesDialog";
import CollectorLogoutDialog from "../components/CollectorLogoutDialog";

/* ─── Skeleton Loader ─── */
const ProfileSkeleton = () => (
  <div className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-5 pb-8 animate-in fade-in duration-300">
    {/* Identity Hero Banner Skeleton */}
    <div className="relative rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
      <div className="h-28 lg:h-36 bg-muted/40 border-b border-border/50" />
      <div className="relative px-4 pb-5 pt-0 md:px-6 md:pb-6 lg:px-8 lg:pb-7">
        <div className="-mt-14 flex flex-col items-center gap-3.5 text-center md:-mt-18 md:flex-row md:items-end md:gap-6 md:text-left">
          <Skeleton className="size-20 lg:size-28 rounded-full ring-4 ring-background shrink-0" />
          <div className="flex-1 space-y-2 text-center md:text-left min-w-0">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <Skeleton className="h-4 w-60 max-w-full" />
            <div className="flex items-center justify-center md:justify-start gap-3 pt-1 flex-wrap">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3.5 w-40" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Assigned Truck Skeleton */}
    <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-56" />
          </div>
        </div>
        <Skeleton className="h-6 w-24 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>

    {/* Personal Information Skeleton */}
    <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-xs md:space-y-4 md:p-5 lg:p-6">
      <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-52" />
        </div>
      </div>
      <div className="divide-y divide-border/50">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="-mx-2 flex items-center justify-between gap-3 px-2 py-2.5 md:-mx-4 md:px-4 md:py-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 lg:size-10 rounded-xl shrink-0" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-36" />
              </div>
            </div>
            <Skeleton className="h-8.5 w-14 rounded-xl" />
          </div>
        ))}
      </div>
    </div>

    {/* Dispatch Support Skeleton */}
    <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
      <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

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
      <span className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium bg-muted/60 text-muted-foreground border border-border/70 shrink-0 select-none">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span>Registered email</span>
      </span>
    ) : onEdit ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="h-8 shrink-0 cursor-pointer rounded-xl border-primary/35 bg-primary/10 px-3 text-xs font-semibold text-primary shadow-none transition-all hover:border-primary/55 hover:bg-primary/15 hover:text-primary focus-visible:ring-primary/25 active:scale-95"
      >
        <span>{masked ? "Change" : "Edit"}</span>
      </Button>
    ) : null}
  </div>
);

const avatarStyles = [
  { id: "forest", label: "Forest", className: "bg-gradient-to-br from-primary to-emerald-700" },
  { id: "ocean", label: "Ocean", className: "bg-gradient-to-br from-sky-500 to-blue-700" },
  { id: "sunset", label: "Sunset", className: "bg-gradient-to-br from-orange-400 to-rose-600" },
  { id: "violet", label: "Violet", className: "bg-gradient-to-br from-violet-500 to-fuchsia-700" },
] as const;
type AvatarStyle = (typeof avatarStyles)[number]["id"];

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
  const retry = () => { void Promise.all([profileQuery.refetch(), driverQuery.refetch()]); };
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>("forest");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
    setAvatarStyle(avatarStyles.some(({ id }) => id === saved) ? saved as AvatarStyle : "forest");
  }, [avatarAccountId]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatarUploading(true);
      await runProfileAction(async () => {
        const { avatar_url } = await uploadAvatar(file);
        client.setQueryData<UserProfile>(collectorKey(authUser?.id, "profile", "account"), (previous) => previous ? { ...previous, avatar_url } : previous);
        const current = useAuthStore.getState();
        if (current.user && current.user.id === authUser?.id && current.token === authToken) setUser({ ...current.user, avatar_url });
      });
      toast.success("Profile photo updated");
      setAvatarOpen(false);
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

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
    setLogoutOpen(false);
    await logout();
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

  if (isLoading) return <ProfileSkeleton />;

  if (!profile && !driverData) {
    return (
      <div role="alert" className="mx-auto max-w-3xl rounded-2xl border border-destructive/25 bg-card p-6 text-center shadow-xs">
        <h1 className="font-display text-lg font-bold text-foreground">Profile unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">We could not load your collector information. Please try again.</p>
        <Button type="button" onClick={retry} className="mt-4">Retry loading profile</Button>
      </div>
    );
  }

  const displayName = profile?.full_name || driverData?.full_name || authUser?.full_name || "Collector";
  const displayEmail = profile?.email || driverData?.email || authUser?.email || "";
  const displayPhone = profile?.phone || driverData?.phone || "";
  const displayUsername = profile?.username || driverData?.username || authUser?.username || "—";
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DR";

  const hasAssignedTruck = Boolean(driverData?.truck_id);
  const truckName = driverData?.truck_name || "Assigned Truck";
  const truckPlate = driverData?.truck_plate || "";
  const accountStatus = profile?.status || driverData?.account_status || authUser?.status;
  const isUnderMaintenance = driverData?.truck_availability === "UNDER_MAINTENANCE" ||
    driverData?.truck_status === "MAINTENANCE" || driverData?.truck_status === "INACTIVE";
  const vehicleReadiness = isUnderMaintenance ? "Under maintenance" :
    driverData?.truck_availability === "ACTIVE" ? "Operational / Ready" : "Readiness unavailable";
  const selectedAvatarStyle = avatarStyles.find(({ id }) => id === avatarStyle) ?? avatarStyles[0];
  const joinedAt = profile?.created_at || driverData?.created_at;
  const joined = joinedAt ? formatManilaDateTime(joinedAt, { year: "numeric", month: "long" }) : null;
  const avatarUrl = profile?.avatar_url || authUser?.avatar_url || driverData?.avatar_url || "";

  const saveAvatarStyle = (style: AvatarStyle) => {
    if (!avatarAccountId) return;
    localStorage.setItem(`greenway:collector-avatar:${avatarAccountId}`, style);
    setAvatarStyle(style);
    setAvatarOpen(false);
    toast.success("Avatar style updated");
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-5 pb-8 animate-in fade-in duration-300">
      {(loadErrors.profile || loadErrors.driver) && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm text-foreground">
            {loadErrors.profile && loadErrors.driver ? "Profile and vehicle information could not be refreshed." :
              loadErrors.profile ? "Personal information could not be refreshed." : "Vehicle information could not be refreshed."}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={retry}>Retry</Button>
        </div>
      )}
      {/* ── 1. Profile Header Banner (Resident-style) ── */}
      <div className="relative rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {/* Atmospheric banner with gradient and subtle decorative glows */}
        <div className="relative h-28 overflow-hidden border-b border-border/50 bg-gradient-to-r from-primary/20 via-emerald-500/15 to-teal-500/20 lg:h-36">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 left-1/3 w-36 h-36 rounded-full bg-primary/10 blur-xl pointer-events-none" />

          {accountStatus && <div className={`absolute top-3.5 right-3.5 lg:top-4 lg:right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border text-xs font-semibold shadow-xs ${accountStatus === "ACTIVE" ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "border-destructive/30 text-destructive"}`}>
            <span className={`size-2 rounded-full ${accountStatus === "ACTIVE" ? "bg-emerald-500" : "bg-destructive"}`} />
            <span>{accountStatus === "ACTIVE" ? "Active collector" : accountStatus === "DEACTIVATED" ? "Deactivated collector" : "Collector account restricted"}</span>
          </div>}
        </div>

        {/* Avatar & Core Identity */}
        <div className="relative px-4 pb-5 pt-0 md:px-6 md:pb-6 lg:px-8 lg:pb-7">
          <div className="-mt-14 flex flex-col items-center gap-3.5 text-center md:-mt-18 md:flex-row md:items-end md:gap-6 md:text-left">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <Avatar className="size-20 rounded-full ring-4 ring-background shadow-lg lg:size-28">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className={`${selectedAvatarStyle.className} rounded-full font-display text-3xl font-bold text-primary-foreground`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <Button type="button" variant="outline" onClick={() => setAvatarOpen(true)} className="h-8 gap-1.5 rounded-xl border-border/80 px-3 text-[11px] font-semibold hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
                <Paintbrush className="size-3.5" /> Customize
              </Button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-col justify-center gap-1.5 md:flex-row md:items-center md:justify-start md:gap-3">
                <h1 className="truncate font-display text-lg font-bold tracking-tight text-foreground lg:text-2xl">
                  {displayName}
                </h1>
                {displayUsername && displayUsername !== "—" && (
                  <span className="inline-flex w-fit items-center rounded-full border border-border/60 bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    @{displayUsername}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground md:justify-start">
                <span className="flex items-center gap-1.5"><Truck className="size-3.5 text-primary" /> Collector / Driver</span>
                {joined && <span className="flex items-center gap-1.5"><Calendar className="size-3.5" /> Joined {joined}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Assigned Vehicle & Equipment ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-foreground tracking-tight">
                Assigned vehicle & equipment
              </h2>
              <p className="text-xs text-muted-foreground">
                Current truck assignment and operational fleet status
              </p>
            </div>
          </div>
          {hasAssignedTruck && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                isUnderMaintenance
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25"
                  : vehicleReadiness === "Operational / Ready" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25" : "bg-muted text-muted-foreground border-border/70"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isUnderMaintenance ? "bg-rose-500" : vehicleReadiness === "Operational / Ready" ? "bg-emerald-500" : "bg-muted-foreground"
                }`}
              />
              {vehicleReadiness}
            </span>
          )}
        </div>

        {hasAssignedTruck ? (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">
                  Vehicle plate number
                </p>
                <p className="text-base sm:text-lg font-bold font-display text-foreground font-mono">
                  {truckPlate || "Unavailable"}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">
                  Unit designation
                </p>
                <p className="text-base sm:text-lg font-bold font-display text-foreground">
                  {truckName}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                Assigned by MENRO Candelaria Fleet Operations
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBreakdownModal(true)}
                className="w-full sm:w-auto h-9 px-4 gap-1.5 rounded-xl text-xs font-semibold border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer shadow-2xs"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Report truck issue</span>
              </Button>
            </div>
          </div>
        ) : loadErrors.driver && !driverData ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center">
            <p className="text-sm font-semibold text-foreground">Vehicle information unavailable</p>
            <p className="mt-1 text-xs text-muted-foreground">Retry to check your current assignment.</p>
          </div>
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
      </div>

      {/* ── 3. Personal Information (Resident-style) ── */}
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
      </div>

      {/* ── 4. Actions / Log Out ── */}
      <div className="space-y-3 pb-8">
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
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

      <Dialog open={avatarOpen} onOpenChange={(open) => { if (!avatarUploading) setAvatarOpen(open); }}>
        <DialogContent className={modalStyles.content}>
          <CollectorModalHeader title="Customize avatar" description="Choose a color or upload a photo." icon={<Paintbrush />} onClose={() => setAvatarOpen(false)} disabled={avatarUploading} />
          <div className={modalStyles.body}>
            <div className="grid grid-cols-2 gap-3">
              {avatarStyles.map((style) => (
                <button key={style.id} type="button" disabled={avatarUploading} aria-pressed={avatarStyle === style.id} onClick={() => saveAvatarStyle(style.id)} className={`flex items-center gap-3 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${avatarStyle === style.id ? "border-primary bg-primary/10" : "border-border/80 hover:border-primary/40 hover:bg-muted/40"}`}>
                  <span className={`flex size-10 items-center justify-center rounded-full text-sm font-bold text-white ${style.className}`}>{initials}</span>
                  <span className="text-xs font-semibold text-foreground">{style.label}</span>
                </button>
              ))}
            </div>
            {avatarUrl && <p className="text-xs text-muted-foreground">The initials color appears when your photo is unavailable.</p>}
          </div>
          <div className={modalStyles.footer}>
            <Button type="button" variant="outline" onClick={() => setAvatarOpen(false)} disabled={avatarUploading} className={modalStyles.cancelButton}>Close</Button>
            <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} className={modalStyles.cancelButton}>
              {avatarUploading ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Camera className="mr-1.5 size-3.5" />}
              {avatarUploading ? "Uploading..." : "Upload profile photo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Modal ── */}
      <Dialog
        open={editModal.open}
        onOpenChange={(open) => { if (!open) requestCloseEdit(); }}
      >
        <DialogContent className={modalStyles.content}>
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
            >
              {editModal.saving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Modal ── */}
      <Dialog
        open={pwModal.open}
        onOpenChange={(open) => { if (!open) requestClosePassword(); }}
      >
        <DialogContent className={modalStyles.content}>
          <CollectorModalHeader title="Change Password" description="Enter your current and new password." icon={<Lock />} onClose={requestClosePassword} disabled={pwModal.saving} />

          <div className={modalStyles.body}>
            <div className="space-y-1.5">
              <Label htmlFor="collector-current-password" className={modalStyles.label}>
                Current password
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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
                New password
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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
                Confirm new password
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
            >
              {pwModal.saving ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </span>
              ) : (
                "Update password"
              )}
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
      <CollectorLogoutDialog open={logoutOpen} onOpenChange={setLogoutOpen} onConfirm={() => { void handleLogout(); }} />

      <TruckBreakdownDialog
        open={breakdownModal}
        onOpenChange={setBreakdownModal}
        truckName={truckName}
        truckPlate={truckPlate}
        onSubmit={(report) => runBreakdownAction(() => reportTruckBreakdown(report))}
      />
    </div>
  );
};

export default CollectorProfile;
