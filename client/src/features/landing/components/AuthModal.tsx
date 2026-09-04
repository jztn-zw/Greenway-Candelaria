import authService from "@/services/authService";
import useAuthStore from "@/store/authStore";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchBarangays, type BarangayLocationRow } from "@/services/barangaysService";
import { Eye, EyeOff, Mail, Phone, User, Lock, X, Leaf } from "lucide-react";
import { toast } from "sonner";

const BARANGAYS = [
  "Buenavista East", "Buenavista West", "Bukal Norte", "Bukal Sur",
  "Kinatihan I", "Kinatihan II", "Malabanban Norte", "Malabanban Sur",
  "Mangilag Norte", "Mangilag Sur", "Masalukot I", "Masalukot II",
  "Masalukot III", "Masalukot IV", "Masalukot V", "Masin Norte",
  "Masin Sur", "Mayabobo", "Pahinga Norte", "Pahinga Sur", "Paligawan",
  "Panayonan", "Periña", "Poblacion", "Bukal I", "Bukal II",
  "San Andres", "San Isidro", "Santa Catalina Norte", "Santa Catalina Sur",
  "Suplang", "Taguan", "Tiaong", "Alitao", "Companero",
  "Malabanban East", "Malabanban West", "Mangatas",
];

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
          className={`absolute top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground/50 hover:text-destructive transition-colors ${rightElement ? "right-10" : "right-3"}`}
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

  // Register fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [barangay, setBarangay] = useState("");
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
      });
      toast.success("Account created successfully!", { description: "You can now log in to GreenWay." });
      resetRegisterForm();
      setErrors({});
      setTab("login");
    } catch (err: any) {
      setErrors({ form: err.response?.data?.message || "Registration failed. Please try again." });
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
    } catch (err: any) {
      setErrors({ form: err.response?.data?.message || "Invalid credentials. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const PasswordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="text-muted-foreground hover:text-foreground transition-colors"
      tabIndex={-1}
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] md:max-w-[900px] p-0 gap-0 overflow-hidden border-none shadow-2xl rounded-2xl max-h-[95vh] [&>button]:hidden">
        <div className="flex flex-col md:flex-row min-h-0 max-h-[95vh]">
          {/* Left side - Form */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Header - fixed */}
            <div className="px-6 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-5 shrink-0 bg-gradient-to-br from-background via-background to-primary/5">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
                    <img src="/greenway.svg" alt="GreenWay Logo" className="w-9 h-9" />
                  </div>
                  <span className="font-display text-lg font-bold text-foreground">GreenWay</span>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-8 h-8 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h2 className="font-display text-2xl sm:text-[1.7rem] font-bold text-foreground leading-tight">
                {tab === "login" ? "Welcome back" : "Create an account"}
                <span className="text-primary">.</span>
              </h2>
              <p className="text-muted-foreground text-sm mt-1.5">
                {tab === "login"
                  ? "Log in to access your Resident Portal"
                  : "Sign up and join the green movement in your community"}
              </p>

              {/* Tab switcher */}
              <div className="flex mt-5 bg-muted/60 rounded-xl p-1 gap-1">
                <button
                  onClick={() => { setTab("login"); setErrors({}); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    tab === "login"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Log In
                </button>
                <button
                  onClick={() => { setTab("register"); setErrors({}); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    tab === "register"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Scrollable form area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 sm:px-8 sm:py-5 min-h-0">
              {tab === "login" ? (
                <form onSubmit={handleLogin} noValidate className="space-y-4">
                  {errors.form && (
                    <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-2.5 font-medium">
                      {errors.form}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="identifier" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Email, Phone, or Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                      <ClearableInput
                        id="identifier"
                        placeholder="Enter your email, phone, or username"
                        value={identifier}
                        onChange={(e) => { setIdentifier(e.target.value); setErrors((prev) => { const { identifier, ...rest } = prev; return rest; }); }}
                        className={`pl-10 h-11 rounded-xl border-border/80 bg-muted/30 focus-visible:bg-background transition-colors ${errors.identifier ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.identifier && <p className="text-xs text-destructive mt-0.5">{errors.identifier}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => { setLoginPassword(e.target.value); setErrors((prev) => { const { loginPassword, ...rest } = prev; return rest; }); }}
                        className={`pl-10 pr-10 h-11 rounded-xl border-border/80 bg-muted/30 focus-visible:bg-background transition-colors ${errors.loginPassword ? "border-destructive" : ""}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {PasswordToggle}
                      </div>
                    </div>
                    {errors.loginPassword && <p className="text-xs text-destructive mt-0.5">{errors.loginPassword}</p>}
                    <div className="text-right">
                      <button type="button" className="text-xs text-primary hover:underline font-medium">
                        Forgot password?
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 rounded-xl font-semibold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all" disabled={loading}>
                    {loading ? "Logging in…" : "Log In to GreenWay"}
                  </Button>

                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-3 text-muted-foreground">or continue with</span>
                    </div>
                  </div>

                  <Button type="button" variant="outline" className="w-full h-11 rounded-xl border-border/80 hover:bg-muted/50" disabled>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                  </Button>

                  <p className="text-center text-sm text-muted-foreground pt-2">
                    Don't have an account?{" "}
                    <button type="button" onClick={() => setTab("register")} className="text-primary font-semibold hover:underline">
                      Sign Up
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegister} noValidate className="space-y-3.5">
                  {errors.form && (
                    <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-2.5 font-medium">
                      {errors.form}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                        <ClearableInput
                          id="fullName"
                          placeholder="Juan Dela Cruz"
                          value={fullName}
                          onChange={(e) => { setFullName(e.target.value); setErrors((prev) => { const { fullName, ...rest } = prev; return rest; }); }}
                          className={`pl-10 h-11 rounded-xl border-border/80 bg-muted/30 focus-visible:bg-background transition-colors ${errors.fullName ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.fullName && <p className="text-xs text-destructive mt-0.5">{errors.fullName}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="username" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                        <ClearableInput
                          id="username"
                          placeholder="juandc"
                          value={username}
                          onChange={(e) => { setUsername(e.target.value); setErrors((prev) => { const { username, ...rest } = prev; return rest; }); }}
                          className={`pl-10 h-11 rounded-xl border-border/80 bg-muted/30 focus-visible:bg-background transition-colors ${errors.username ? "border-destructive" : ""}`}
                        />
                      </div>
                      {errors.username && <p className="text-xs text-destructive mt-0.5">{errors.username}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                      <ClearableInput
                        id="email"
                        type="email"
                        placeholder="juan@email.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setErrors((prev) => { const { email, ...rest } = prev; return rest; }); }}
                        className={`pl-10 h-11 rounded-xl border-border/80 bg-muted/30 focus-visible:bg-background transition-colors ${errors.email ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-destructive mt-0.5">{errors.email}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Phone <span className="normal-case tracking-normal font-normal text-muted-foreground/70">(optional)</span>
                    </Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none z-10">
                        <span className="text-xs text-muted-foreground font-semibold">+63</span>
                        <span className="text-border mx-0.5">|</span>
                      </div>
                      <ClearableInput
                        id="phone"
                        type="tel"
                        placeholder="9XX XXX XXXX"
                        value={formatPhone(phone)}
                        onChange={handlePhoneChange}
                        className={`pl-[4rem] h-11 rounded-xl border-border/80 bg-muted/30 focus-visible:bg-background transition-colors ${errors.phone ? "border-destructive" : ""}`}
                        maxLength={14}
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-destructive mt-0.5">{errors.phone}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="barangay" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Barangay</Label>
                    <Select value={barangay} onValueChange={(v) => { setBarangay(v); setErrors((prev) => { const { barangay, ...rest } = prev; return rest; }); }}>
                      <SelectTrigger className={`h-11 rounded-xl border-border/80 bg-muted/30 focus:bg-background transition-colors ${errors.barangay ? "border-destructive" : ""}`}>
                        <SelectValue placeholder={barangayOptions.length ? "Select your barangay" : "Loading barangays..."} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 rounded-xl">
                        {barangayOptions.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.barangay && <p className="text-xs text-destructive mt-0.5">{errors.barangay}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                      <Input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimum 8 characters"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrors((prev) => { const { password, ...rest } = prev; return rest; }); }}
                        className={`pl-10 pr-10 h-11 rounded-xl border-border/80 bg-muted/30 focus-visible:bg-background transition-colors ${errors.password ? "border-destructive" : ""}`}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {PasswordToggle}
                      </div>
                    </div>
                    {errors.password && <p className="text-xs text-destructive mt-0.5">{errors.password}</p>}
                  </div>

                  <Button type="submit" className="w-full h-11 rounded-xl font-semibold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all mt-1" disabled={loading}>
                    {loading ? "Creating account…" : "Create My Account"}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground pt-1">
                    Already a member?{" "}
                    <button type="button" onClick={() => setTab("login")} className="text-primary font-semibold hover:underline">
                      Log In
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Right side - Visual panel (hidden on mobile) */}
          <div className="hidden md:flex w-[380px] shrink-0 relative overflow-hidden bg-gradient-to-br from-primary/90 via-forest to-canopy rounded-r-2xl">
            {/* Decorative elements */}
            <div className="absolute inset-0">
              <div className="absolute top-0 right-0 w-48 h-48 bg-leaf/20 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/30 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-leaf/10 rounded-full blur-xl" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col justify-between p-8 text-primary-foreground">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-primary-foreground/15 backdrop-blur-sm flex items-center justify-center mb-6">
                  <Leaf className="w-6 h-6" />
                </div>
                <h3 className="font-display text-xl font-bold leading-snug mb-3">
                  Join the green<br />movement today
                </h3>
                <p className="text-sm text-primary-foreground/70 leading-relaxed">
                  Track waste collection, report issues, and help keep your community clean and green.
                </p>
              </div>

              <div className="space-y-4">
                {/* Stats cards */}
                <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4 border border-primary-foreground/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                      <img src="/greenway.svg" alt="GreenWay Logo" className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-xs text-primary-foreground/60 uppercase tracking-wider font-medium">Community Impact</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-2xl font-bold font-display">12k+</p>
                      <p className="text-xs text-primary-foreground/60">Active residents</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-display">98%</p>
                      <p className="text-xs text-primary-foreground/60">Collection rate</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-primary-foreground/40 text-center">
                  © {new Date().getFullYear()} GreenWay • Terms & Privacy
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
