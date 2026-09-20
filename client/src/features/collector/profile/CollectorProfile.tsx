import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Truck,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  Headphones,
  Building2,
  CheckCircle2,
  Wrench,
  KeyRound,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  LogOut,
  ShieldCheck,
  AtSign,
  Pencil,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  DriverMeData,
  updateMyDriverStatus,
} from "@/services/driverManagerService";
import { toast } from "@/lib/toast";

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
        className="h-8 px-3 rounded-lg text-xs font-semibold border-primary/25 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary/40 active:scale-95 transition-all shrink-0 cursor-pointer shadow-2xs inline-flex items-center gap-1.5"
      >
        {masked ? (
          <KeyRound className="w-3.5 h-3.5" />
        ) : (
          <Pencil className="w-3.5 h-3.5" />
        )}
        <span>{masked ? "Change" : "Edit"}</span>
      </Button>
    ) : null}
  </div>
);

const CollectorProfile = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const authUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [driverData, setDriverData] = useState<DriverMeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Edit modal
  const [editModal, setEditModal] = useState<{
    open: boolean;
    field: string;
    label: string;
    value: string;
    saving: boolean;
    error: string;
  }>({
    open: false,
    field: "",
    label: "",
    value: "",
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

  // Truck breakdown report modal
  const [breakdownModal, setBreakdownModal] = useState(false);
  const [breakdownReason, setBreakdownReason] = useState("Flat Tire / Puncture");
  const [breakdownNote, setBreakdownNote] = useState("");
  const [reportingBreakdown, setReportingBreakdown] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const [prof, drv] = await Promise.all([
          fetchProfile().catch(() => null),
          fetchDriverMe().catch(() => null),
        ]);
        if (isMounted) {
          if (prof) setProfile(prof);
          if (drv) setDriverData(drv);
        }
      } catch {
        toast.error("Failed to load driver profile");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setAvatarUploading(true);
      const { avatar_url } = await uploadAvatar(file);
      setProfile((prev) => (prev ? { ...prev, avatar_url } : null));
      if (authUser) setUser({ ...authUser, avatar_url });
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveField = async () => {
    if (!editModal.value.trim()) {
      setEditModal((m) => ({ ...m, error: "Field cannot be empty" }));
      return;
    }
    try {
      setEditModal((m) => ({ ...m, saving: true, error: "" }));
      const payload: Partial<UserProfile> = {
        [editModal.field]: editModal.value.trim(),
      };
      const updated = await updateProfile(payload);
      setProfile(updated);
      if (authUser) setUser({ ...authUser, ...payload });
      toast.success("Profile updated");
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
      await changePassword({
        old_password: pwModal.oldPw,
        new_password: pwModal.newPw,
      });
      toast.success("Password changed successfully");
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

  const handleReportBreakdown = async () => {
    try {
      setReportingBreakdown(true);
      const msg = `[TRUCK ISSUE] ${breakdownReason}${
        breakdownNote ? ` — Details: ${breakdownNote}` : ""
      }`;
      await updateMyDriverStatus(msg);
      toast.success("Truck issue reported to MENRO Dispatch");
      setBreakdownModal(false);
      setBreakdownNote("");
    } catch {
      toast.error("Failed to submit truck report");
    } finally {
      setReportingBreakdown(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  if (isLoading) return <ProfileSkeleton />;

  // Derived display details without fake mock fallbacks
  const displayName = profile?.full_name || authUser?.full_name || "Collector Staff";
  const displayEmail = profile?.email || authUser?.email || "driver@menro.gov.ph";
  const displayPhone = profile?.phone || driverData?.phone || "";
  const displayUsername = profile?.username || authUser?.username || "—";
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "DR";

  const hasAssignedTruck = Boolean(driverData?.truck_plate || driverData?.truck_name);
  const truckName = driverData?.truck_name || "Assigned Truck";
  const truckPlate = driverData?.truck_plate || "";
  const isUnderMaintenance = driverData?.truck_availability === "UNDER_MAINTENANCE";

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 sm:space-y-5 pb-8 animate-in fade-in duration-300">
      {/* ── 1. Profile Header Banner (Resident-style) ── */}
      <div className="relative rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
        {/* Atmospheric banner with gradient and subtle decorative glows */}
        <div className="relative h-28 overflow-hidden border-b border-border/50 bg-gradient-to-r from-primary/20 via-emerald-500/15 to-teal-500/20 lg:h-36">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 left-1/3 w-36 h-36 rounded-full bg-primary/10 blur-xl pointer-events-none" />

          <div className="absolute top-3.5 right-3.5 lg:top-4 lg:right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-md border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Active Collector</span>
          </div>
        </div>

        {/* Avatar & Core Identity */}
        <div className="relative px-4 pb-5 pt-0 md:px-6 md:pb-6 lg:px-8 lg:pb-7">
          <div className="-mt-14 flex flex-col items-center gap-3.5 text-center md:-mt-18 md:flex-row md:items-end md:gap-6 md:text-left">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="relative group">
                <Avatar className="size-20 rounded-full ring-4 ring-background shadow-lg lg:size-28">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl lg:text-3xl font-display">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-transform active:scale-95 cursor-pointer"
                  title="Change profile photo"
                >
                  {avatarUploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-col justify-center gap-1.5 md:flex-row md:items-center md:justify-start md:gap-3">
                <h1 className="truncate font-display text-lg font-bold tracking-tight text-foreground lg:text-2xl">
                  {displayName}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 w-fit mx-auto md:mx-0">
                  Collector / Driver
                </span>
                {displayUsername && displayUsername !== "—" && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/60 w-fit mx-auto md:mx-0">
                    @{displayUsername}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:justify-start md:gap-x-4 md:gap-y-1.5 font-medium">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground/85">
                    MENRO Candelaria · Solid Waste Management
                  </span>
                </div>
                <span className="hidden md:inline text-border">•</span>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                  <span className="truncate">{displayEmail}</span>
                </div>
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
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isUnderMaintenance ? "bg-rose-500" : "bg-emerald-500"
                }`}
              />
              {isUnderMaintenance ? "Under maintenance" : "Operational / Ready"}
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
                  {truckPlate}
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
                saving: false,
                error: "",
              })
            }
          />
          <FieldRow
            label="Email Address"
            value={displayEmail}
            icon={Mail}
            isEmail
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

      {/* ── 4. Dispatch & Emergency Support ── */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-foreground tracking-tight">
                Dispatch & emergency support
              </h2>
              <p className="text-xs text-muted-foreground">
                Municipal contacts for route assistance, dispatch updates, and towing
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 sm:p-4 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>MENRO Candelaria Office</span>
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Municipal Hall Compound, Candelaria
              </p>
            </div>
            <a
              href="tel:0425854111"
              className="inline-flex items-center gap-1 text-xs font-mono font-bold text-primary hover:underline shrink-0 bg-primary/10 border border-primary/20 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              (042) 585-4111
            </a>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Dispatch Emergency Line</span>
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Route assistance & emergency towing
              </p>
            </div>
            <a
              href="tel:+639171234567"
              className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-800 dark:text-amber-300 hover:underline shrink-0 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              +63 917 123 4567
            </a>
          </div>
        </div>
      </div>

      {/* ── 5. Actions / Log Out ── */}
      <div className="space-y-3 pb-8">
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
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
        </div>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/70 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span>In compliance with the Philippine Data Privacy Act of 2012 (R.A. 10173)</span>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      <Dialog
        open={editModal.open}
        onOpenChange={(open) => setEditModal((m) => ({ ...m, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl border border-border/80 p-5 sm:p-6 shadow-xl bg-background">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base font-bold font-display text-foreground">
              Edit {editModal.label.toLowerCase()}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update your collector profile information. Changes are reflected across dispatch logs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                {editModal.label}
              </Label>
              <Input
                value={editModal.value}
                onChange={(e) =>
                  setEditModal((m) => ({
                    ...m,
                    value: e.target.value,
                    error: "",
                  }))
                }
                placeholder={`Enter your ${editModal.label.toLowerCase()}`}
                className="rounded-xl h-10 text-xs sm:text-sm border-border/80"
              />
              {editModal.error && (
                <p className="text-xs text-destructive font-medium">
                  {editModal.error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModal((m) => ({ ...m, open: false }))}
                className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveField}
                disabled={editModal.saving}
                className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
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
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Modal ── */}
      <Dialog
        open={pwModal.open}
        onOpenChange={(open) => setPwModal((m) => ({ ...m, open }))}
      >
        <DialogContent className="sm:max-w-md rounded-2xl border border-border/80 p-5 sm:p-6 shadow-xl bg-background">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base font-bold font-display text-foreground">
              Change password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your current password followed by your new password.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Current password
              </Label>
              <div className="relative">
                <Input
                  type={pwModal.showOld ? "text" : "password"}
                  value={pwModal.oldPw}
                  onChange={(e) =>
                    setPwModal((m) => ({ ...m, oldPw: e.target.value, error: "" }))
                  }
                  className="rounded-xl h-10 text-xs sm:text-sm pr-10 border-border/80"
                />
                <button
                  type="button"
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

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                New password
              </Label>
              <div className="relative">
                <Input
                  type={pwModal.showNew ? "text" : "password"}
                  value={pwModal.newPw}
                  onChange={(e) =>
                    setPwModal((m) => ({ ...m, newPw: e.target.value, error: "" }))
                  }
                  className="rounded-xl h-10 text-xs sm:text-sm pr-10 border-border/80"
                />
                <button
                  type="button"
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

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Confirm new password
              </Label>
              <Input
                type="password"
                value={pwModal.confirmPw}
                onChange={(e) =>
                  setPwModal((m) => ({
                    ...m,
                    confirmPw: e.target.value,
                    error: "",
                  }))
                }
                className="rounded-xl h-10 text-xs sm:text-sm border-border/80"
              />
            </div>

            {pwModal.error && (
              <p className="text-xs text-destructive font-medium">
                {pwModal.error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPwModal((m) => ({ ...m, open: false }))}
                className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSavePassword}
                disabled={pwModal.saving}
                className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
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
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Truck Breakdown Report Modal ── */}
      <Dialog open={breakdownModal} onOpenChange={setBreakdownModal}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border/80 p-5 sm:p-6 shadow-xl bg-background">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base font-bold font-display text-foreground">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span>Report truck issue</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Submit an urgent maintenance notice for your assigned truck{" "}
              <strong className="font-semibold text-foreground">
                ({truckPlate || truckName})
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Issue category
              </Label>
              <select
                value={breakdownReason}
                onChange={(e) => setBreakdownReason(e.target.value)}
                className="w-full h-10 rounded-xl border border-border/80 bg-background px-3 text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="Flat Tire / Puncture">Flat tire / Puncture</option>
                <option value="Engine Overheating">Engine overheating / Stall</option>
                <option value="Compactor Hydraulic Failure">Compactor hydraulic failure</option>
                <option value="Brake / Steering Issue">Brake / Steering issue</option>
                <option value="Fuel / Oil Leak">Fuel / Oil leak</option>
                <option value="Road Accident">Road accident / Minor collision</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Location & details (optional)
              </Label>
              <Input
                value={breakdownNote}
                onChange={(e) => setBreakdownNote(e.target.value)}
                placeholder="e.g. Near Barangay Malabanban Norte chapel"
                className="rounded-xl h-10 text-xs sm:text-sm border-border/80"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBreakdownModal(false)}
                className="rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleReportBreakdown}
                disabled={reportingBreakdown}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl h-10 px-4 text-xs font-semibold cursor-pointer shadow-xs"
              >
                {reportingBreakdown ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </span>
                ) : (
                  "Send alert to dispatch"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectorProfile;
