import authService from "@/services/authService";
import useAuthStore from "@/store/authStore";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { fetchBarangays, fetchBarangayStreets, type BarangayLocationRow, type BarangayStreetRow } from "@/services/barangaysService";
import { ArrowRight, Eye, EyeOff, Heart, Leaf, Lock, Mail, MapPin, User, Users, X } from "lucide-react";
import { toast } from "@/lib/toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "register";
}

// Clearable input wrapper
const ClearableInput = ({
  value,
  onChange,
  className = "",
  rightElement,
  ...props
}: React.ComponentProps<"input"> & {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rightElement?: React.ReactNode;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = value.length > 0;

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={onChange}
        className={`${className} ${hasValue && !rightElement ? "pr-9" : ""} ${hasValue && rightElement ? "pr-[4.5rem]" : !hasValue && rightElement ? "pr-10" : ""}`}
        {...props}
      />
      {hasValue && (
        <button
          type="button"
          onClick={() => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, 'value'
            )?.set;
            if (nativeInputValueSetter && inputRef.current) {
              nativeInputValueSetter.call(inputRef.current, '');
              inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
            }
            onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
          }}
          className={`gw-action-destructive-ghost absolute top-1/2 -translate-y-1/2 p-0.5 transition-colors ${rightElement ? "right-10" : "right-3"}`}
          tabIndex={-1}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
  );
};

const AuthModal = ({
  open,
  onOpenChange,
  defaultTab = "login",
}: AuthModalProps) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "register">(defaultTab);

  // Sync tab when defaultTab prop changes (e.g. clicking Sign Up vs Login)
  const prevDefaultTab = useRef(defaultTab);
  if (prevDefaultTab.current !== defaultTab) {
    prevDefaultTab.current = defaultTab;
    if (tab !== defaultTab) setTab(defaultTab);
  }
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [barangayOptions, setBarangayOptions] = useState<BarangayLocationRow[]>([]);
  const [streetOptions, setStreetOptions] = useState<BarangayStreetRow[]>([]);
  const [streetsLoading, setStreetsLoading] = useState(false);

  // Register fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [barangay, setBarangay] = useState("");
  const [street, setStreet] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [password, setPassword] = useState("");

  // Login fields
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetRegisterForm = () => {
    setFullName("");
    setUsername("");
    setEmail("");
    setPhone("");
    setBarangay("");
    setStreet("");
    setTermsAccepted(false);
    setPassword("");
  };

  useEffect(() => {
    let mounted = true;

    const loadBarangays = async () => {
      try {
        const rows = await fetchBarangays();
        if (mounted) setBarangayOptions(rows);
      } catch {
        if (mounted) setBarangayOptions([]);
      }
    };

    if (open) {
      void loadBarangays();
    }

    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    let mounted = true;
    setStreet("");

    if (!barangay) {
      setStreetOptions([]);
      return () => { mounted = false; };
    }

    setStreetsLoading(true);
    void fetchBarangayStreets(barangay)
      .then((result) => {
        if (mounted) setStreetOptions(result.streets);
      })
      .catch(() => {
        if (mounted) setStreetOptions([]);
      })
      .finally(() => {
        if (mounted) setStreetsLoading(false);
      });

    return () => { mounted = false; };
  }, [barangay]);

  // Philippine phone validation: must start with 9, exactly 10 digits
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (val.length <= 10) {
      // Must start with 9 or be empty
      if (val === "" || val.startsWith("9")) {
        setPhone(val);
      }
    }
  };

  const formatPhone = (raw: string) => {
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)} ${raw.slice(3)}`;
    return `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6)}`;
  };

  const validateRegister = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Full name is required";
    if (!username.trim()) errs.username = "Username is required";
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email address";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (phone && phone.length !== 10) errs.phone = "Enter a valid 10-digit PH number starting with 9";
    if (!barangay) errs.barangay = "Please select your barangay";
    if (streetOptions.length > 0 && !street) errs.street = "Please select your street";
    if (!termsAccepted) errs.terms = "Please accept the Terms and Privacy Policy";
    return errs;
  };

  const validateLogin = () => {
    const errs: Record<string, string> = {};
    if (!identifier.trim()) errs.identifier = "Email, phone, or username is required";
    if (!loginPassword) errs.loginPassword = "Password is required";
    return errs;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateRegister();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      await authService.register({
        full_name: fullName,
        username: username,
        email: email,
        password: password,
        phone: phone ? `+63${phone}` : undefined,
        barangay_id: barangay,
        street_id: street || undefined,
      });
      toast.success("Account created successfully!", { description: "You can now log in to GreenWay." });
      resetRegisterForm();
      setErrors({});
      setTab("login");
    } catch (err: unknown) {
      const responseError = err as { response?: { data?: { message?: string } } };
      setErrors({ form: responseError.response?.data?.message || "Registration failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const { login } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateLogin();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      await login(identifier, loginPassword);
      const user = useAuthStore.getState().user;
      setErrors({});
      onOpenChange(false);
      toast.success(`Welcome back, ${user?.full_name}! 👋`);
      if (user?.role === "ADMIN") navigate("/admin");
      else if (user?.role === "DRIVER") navigate("/collector");
      else navigate("/resident");
    } catch (err: unknown) {
      const responseError = err as { response?: { data?: { message?: string } } };
      setErrors({ form: responseError.response?.data?.message || "Invalid credentials. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const PasswordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="gw-action-ghost transition-colors"
      tabIndex={-1}
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  const fieldClass = "";
  const fieldLabelClass = "text-ui-label font-medium text-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94dvh] gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-2xl sm:max-w-[960px] md:max-w-[960px] [&>button]:hidden">
        <div className="relative flex min-h-0 max-h-[94dvh] flex-col md:flex-row">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close authentication dialog"
            className="gw-action-ghost absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bg-canopy/60 md:text-forest-foreground/80 md:hover:bg-canopy/80 md:hover:text-forest-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Left side - Form */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card text-card-foreground">
            {/* Header - fixed */}
            <div className="shrink-0 px-6 pb-2 pt-6 sm:px-8 sm:pb-3 sm:pt-7">
              <div className="mb-4 flex items-center gap-2.5 sm:mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                  <img src="/greenway.svg" alt="GreenWay Logo" className="h-8 w-8" />
                  </div>
                <span className="font-display text-lg font-semibold tracking-tight text-foreground">GreenWay</span>
              </div>
              <DialogTitle className="gw-heading gw-auth-title text-foreground">
                {tab === "login" ? "Welcome back" : "Create an account"}
                <span className="text-primary">.</span>
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {tab === "login"
                  ? "Log in to access your Resident Portal"
                  : "Sign up and join the green movement in your community"}
              </DialogDescription>
            </div>

            {/* Scrollable form area */}
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3 sm:px-8 sm:pb-7 sm:pt-3">
              {tab === "login" ? (
                <form onSubmit={handleLogin} noValidate className="space-y-3.5">
                  {errors.form && (
                    <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-2.5 font-medium">
                      {errors.form}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="identifier" className={fieldLabelClass}>
                      Email, Phone, or Username
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <ClearableInput
                        id="identifier"
                        aria-invalid={Boolean(errors.identifier)}
                        placeholder="Enter your email, phone, or username"
                        value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setErrors((prev) => { const { identifier, ...rest } = prev; return rest; }); }}
                        className={`pl-10 ${fieldClass} ${errors.identifier ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.identifier && <p className="text-xs text-destructive mt-0.5">{errors.identifier}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className={fieldLabelClass}>
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-password"
                        aria-invalid={Boolean(errors.loginPassword)}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => { setLoginPassword(e.target.value); setErrors((prev) => { const { loginPassword, ...rest } = prev; return rest; }); }}
                        className={`pl-10 pr-10 ${fieldClass} ${errors.loginPassword ? "border-destructive" : ""}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {PasswordToggle}
                      </div>
                    </div>
                    {errors.loginPassword && <p className="text-xs text-destructive mt-0.5">{errors.loginPassword}</p>}
                    <div className="text-right">
                      <button type="button" className="gw-action-link text-xs font-medium transition-colors hover:underline">
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    <span>{loading ? "Logging in…" : "Log In to GreenWay"}</span>
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>

                  <div className="relative my-1">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-ui-overline tracking-wide text-muted-foreground">or continue with</span>
                    </div>
                  </div>

                  <Button type="button" variant="outline" className="w-full" disabled>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </Button>

                  <p className="pt-1 text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button type="button" onClick={() => { setTab("register"); setErrors({}); }} className="gw-action-link font-semibold transition-colors hover:underline">
                      Sign Up
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegister} noValidate className="space-y-3">
                  {errors.form && (
                    <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-2.5 font-medium">
                      {errors.form}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className={fieldLabelClass}>Full Name</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <ClearableInput
                          id="fullName"
                          aria-invalid={Boolean(errors.fullName)}
                          placeholder="Juan Dela Cruz"
                          value={fullName}
                          onChange={(e) => { setFullName(e.target.value); setErrors((prev) => { const { fullName, ...rest } = prev; return rest; }); }}
                          className={`pl-10 ${fieldClass} ${errors.fullName ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.fullName && <p className="text-xs text-destructive mt-0.5">{errors.fullName}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className={fieldLabelClass}>Username</Label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <ClearableInput
                          id="username"
                          aria-invalid={Boolean(errors.username)}
                          placeholder="juandc"
                          value={username}
                          onChange={(e) => { setUsername(e.target.value); setErrors((prev) => { const { username, ...rest } = prev; return rest; }); }}
                          className={`pl-10 ${fieldClass} ${errors.username ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.username && <p className="text-xs text-destructive mt-0.5">{errors.username}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className={fieldLabelClass}>Email address</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <ClearableInput
                        id="email"
                        aria-invalid={Boolean(errors.email)}
                        type="email"
                        placeholder="juan@email.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setErrors((prev) => { const { email, ...rest } = prev; return rest; }); }}
                        className={`pl-10 ${fieldClass} ${errors.email ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-destructive mt-0.5">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className={fieldLabelClass}>
                      Phone number <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none z-10">
                        <span className="text-xs font-semibold text-muted-foreground">+63</span>
                        <span className="mx-0.5 text-border">|</span>
                      </div>
                      <ClearableInput
                        id="phone"
                        aria-invalid={Boolean(errors.phone)}
                        type="tel"
                        placeholder="9XX XXX XXXX"
                        value={formatPhone(phone)}
                        onChange={handlePhoneChange}
                        className={`pl-[4rem] ${fieldClass} ${errors.phone ? "border-destructive" : ""}`}
                        maxLength={14}
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-destructive mt-0.5">{errors.phone}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="barangay" className={fieldLabelClass}>Barangay</Label>
                    <SearchableSelect
                      aria-invalid={Boolean(errors.barangay)}
                      value={barangay}
                      onValueChange={(v) => { setBarangay(v); setErrors((prev) => { const { barangay, ...rest } = prev; return rest; }); }}
                      options={barangayOptions.map((b) => ({ value: b.id, label: b.name }))}
                      placeholder={barangayOptions.length ? "Select your barangay" : "Loading barangays..."}
                      searchPlaceholder="Search barangays..."
                      leadingIcon={<MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      className={`h-10 rounded-xl ${errors.barangay ? "border-destructive" : ""}`}
                    />
                    {errors.barangay && <p className="text-xs text-destructive mt-0.5">{errors.barangay}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="street" className={fieldLabelClass}>Select street</Label>
                    <SearchableSelect
                      aria-invalid={Boolean(errors.street)}
                      value={street}
                      onValueChange={(value) => { setStreet(value); setErrors((prev) => { const { street, ...rest } = prev; return rest; }); }}
                      options={streetOptions.map((option) => ({ value: option.id, label: `${option.name}${option.area ? ` (${option.area})` : ""}` }))}
                      placeholder={!barangay ? "Select your barangay first" : streetsLoading ? "Loading streets..." : streetOptions.length ? "Select your street" : "No streets available yet"}
                      searchPlaceholder="Search streets..."
                      disabled={!barangay || streetsLoading || streetOptions.length === 0}
                      leadingIcon={<MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      className={`h-10 rounded-xl ${errors.street ? "border-destructive" : ""}`}
                    />
                    {errors.street && <p className="text-xs text-destructive mt-0.5">{errors.street}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className={fieldLabelClass}>Password</Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        aria-invalid={Boolean(errors.password)}
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrors((prev) => { const { password, ...rest } = prev; return rest; }); }}
                        className={`pl-10 pr-10 ${fieldClass} ${errors.password ? "border-destructive" : ""}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {PasswordToggle}
                      </div>
                    </div>
                    {errors.password && <p className="text-xs text-destructive mt-0.5">{errors.password}</p>}
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => {
                        setTermsAccepted(checked === true);
                        setErrors((prev) => { const { terms, ...rest } = prev; return rest; });
                      }}
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" className="cursor-pointer text-xs font-normal leading-5 text-muted-foreground">
                      I agree to the <span className="font-semibold text-primary">Terms</span> and <span className="font-semibold text-primary">Privacy Policy</span>.
                    </Label>
                  </div>
                  {errors.terms && <p className="-mt-2 text-xs text-destructive">{errors.terms}</p>}

                  <Button type="submit" className="mt-0.5 w-full" disabled={loading}>
                    <span>{loading ? "Creating account…" : "Create My Account"}</span>
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>

                  <div className="relative my-1">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-ui-overline tracking-wide text-muted-foreground">or</span></div>
                  </div>

                  <Button type="button" variant="outline" className="w-full" disabled>
                    <svg className="mr-2 w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already a member?{" "}
                    <button type="button" onClick={() => { setTab("login"); setErrors({}); }} className="gw-action-link font-semibold transition-colors hover:underline">
                      Log In
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Right side - Visual panel (hidden on mobile) */}
          <aside className="relative hidden w-[360px] shrink-0 overflow-hidden bg-forest text-forest-foreground md:flex">

            <div className="relative z-10 flex w-full flex-col justify-between p-8">
              <div>
                <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-forest-foreground/15 ring-1 ring-forest-foreground/15">
                  <Leaf className="h-5 w-5" />
                </div>
                <h3 className="gw-heading text-[1.55rem] leading-[1.08] tracking-[-0.035em]">
                  Join the green<br />movement today.
                </h3>
                <p className="mt-3 max-w-[27ch] text-sm leading-relaxed text-forest-foreground/80">
                  Track waste collection, report issues, and help keep your community clean and green.
                </p>

                <ul className="mt-7 space-y-4" aria-label="GreenWay community benefits">
                  <li className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-canopy/45"><Users className="h-4 w-4" /></span>
                    <span className="text-sm font-medium leading-tight">Cleaner<br />communities</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-canopy/45"><Leaf className="h-4 w-4" /></span>
                    <span className="text-sm font-medium leading-tight">A greener<br />tomorrow</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-canopy/45"><Heart className="h-4 w-4" /></span>
                    <span className="text-sm font-medium leading-tight">Stronger<br />together</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-end gap-5 border-t border-forest-foreground/20 pt-5">
                  <div>
                    <p className="gw-stat-value text-2xl tracking-[-0.04em]">12k+</p>
                    <p className="text-ui-caption text-forest-foreground/70">Active residents</p>
                  </div>
                  <div className="h-8 w-px bg-forest-foreground/25" />
                  <div>
                    <p className="gw-stat-value text-2xl tracking-[-0.04em]">98%</p>
                    <p className="text-ui-caption text-forest-foreground/70">Collection rate</p>
                  </div>
                </div>
                <p className="mt-6 text-center text-ui-caption text-forest-foreground/55">© {new Date().getFullYear()} GreenWay</p>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
