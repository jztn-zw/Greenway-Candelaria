import { getActionErrorMessage } from "@/lib/feedbackMessages";
import GreenWayLogo from "@/components/common/GreenWayLogo";
import { getManilaNow } from "@/utils/date";
import authService from "@/services/authService";
import { AccountRecovery,RecoveryCodeReceipt } from "./AccountRecovery";
import useAuthStore from "@/store/authStore";
import { useState,useRef,useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
Dialog,
DialogContent,
DialogDescription,
DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputClearButton,inputIconButtonClassName } from "@/components/common/InputClearButton";
import { Label } from "@/components/ui/label";
import { ArrowRight,Eye,EyeOff,Heart,Leaf,Lock,User,Users,X } from "lucide-react";
import { useAuthCooldown } from "./useAuthCooldown";
import { toast } from "@/lib/toast";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "register";
}

const CooldownNotice = ({ action, seconds }: { action: "login" | "signup"; seconds: number }) => (
  <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
    <p role="alert" className="font-medium">Too many {action} attempts.</p>
    <p className="mt-1">Please wait <span role="timer" aria-live="off" className="font-semibold tabular-nums">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span> before trying again.</p>
  </div>
);

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
        className={`${className} ${hasValue && !rightElement ? "pr-8" : ""} ${hasValue && rightElement ? "pr-[4.5rem]" : !hasValue && rightElement ? "pr-10" : ""}`}
        {...props}
      />
      {hasValue && !props.disabled && !props.readOnly && (
        <InputClearButton
          onClick={() => {
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype, 'value'
            )?.set;
            if (nativeInputValueSetter && inputRef.current) {
              nativeInputValueSetter.call(inputRef.current, '');
              inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
            }
            onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
            inputRef.current?.focus();
          }}
          className={rightElement ? "right-10" : undefined}
        />
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
  const location = useLocation();
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [loading, setLoading] = useState(false);
  const submissionPending = useRef(false);
  const loginCooldown = useAuthCooldown("login");
  const registerCooldown = useAuthCooldown("register");

  // Sync tab when defaultTab prop changes (e.g. clicking Sign Up vs Login)
  const prevDefaultTab = useRef(defaultTab);
  if (prevDefaultTab.current !== defaultTab && !loading) {
    prevDefaultTab.current = defaultTab;
    if (tab !== defaultTab) setTab(defaultTab);
  }
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Register fields
  const [username, setUsername] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryReceipt, setRecoveryReceipt] = useState<string | null>(null);

  // Login fields
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  useEffect(() => {
    if (!open) {
      setRecoveryReceipt(null); setRecoveryOpen(false);
      setPassword(""); setConfirmPassword(""); setLoginPassword("");
      setShowPassword(false); setShowConfirmPassword(false); setErrors({});
    }
  }, [open]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetRegisterForm = () => {
    setUsername("");
    setTermsAccepted(false);
    setPassword("");
    setConfirmPassword("");
    setShowConfirmPassword(false);
  };

  const validateRegister = () => {
    const errs: Record<string, string> = {};
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) errs.username = "Use 3–20 letters, numbers, or underscores";
    if (!password) errs.password = "Password is required";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters";
    if (!confirmPassword) errs.confirmPassword = "Please confirm your password";
    else if (confirmPassword !== password) errs.confirmPassword = "Passwords do not match";
    return errs;
  };

  const validateLogin = () => {
    const errs: Record<string, string> = {};
    if (!/^[^\s@]{1,50}$/.test(identifier.trim())) errs.identifier = "Enter your username";
    if (!loginPassword) errs.loginPassword = "Password is required";
    return errs;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionPending.current || registerCooldown.isBlocked()) return;
    const errs = validateRegister();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    submissionPending.current = true;
    setLoading(true);
    try {
      const registration = { username: username.trim(), password, confirm_password: confirmPassword, terms_accepted: termsAccepted };
      const result = await authService.register(registration);
      setIdentifier(registration.username);
      setLoginPassword("");
      if (result.data.recovery_code) setRecoveryReceipt(result.data.recovery_code);
      setTab("login");
      resetRegisterForm();
      setErrors({});
      toast.success("Account created. Save your recovery code before signing in.");
    } catch (err: unknown) {
      toast.error("Could not create your account", { description: getActionErrorMessage(err) });
      if (registerCooldown.start(err)) { setErrors({}); return; }
      const responseError = err as { response?: { data?: { message?: string; errors?: { field: string; message: string }[] } } };
      const message = responseError.response?.data?.message;
      const usernameError = responseError.response?.data?.errors?.find(issue => issue.field === "username")?.message;
      setErrors(message === "Username already taken"
        ? { username: "Username already taken. Choose another username." }
        : usernameError ? { username: usernameError } : { form: message || "Registration failed. Please try again." });
    } finally {
      submissionPending.current = false;
      setLoading(false);
    }
  };

  const { login } = useAuthStore();
  const finishLogin = () => {
    const user = useAuthStore.getState().user;
    setErrors({});
    onOpenChange(false);
    if (user?.role === "ADMIN") navigate("/admin");
    else if (user?.role === "DRIVER") navigate("/collector");
    else {
      const post = new URLSearchParams(location.search).get("post");
      navigate(post ? `/resident/contents?post=${encodeURIComponent(post)}` : "/resident");
    }
  };
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionPending.current || loginCooldown.isBlocked()) return;
    const errs = validateLogin();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    submissionPending.current = true;
    setLoading(true);
    try {
      const result = await login(identifier.trim(), loginPassword, rememberMe);
      finishLogin();
      if (result?.reactivated) toast.success("Welcome back! Your account has been reactivated.");
      else toast.success("Signed in successfully");
    } catch (err: unknown) {
      toast.error("Could not sign in", { description: getActionErrorMessage(err) });
      if (loginCooldown.start(err)) { setErrors({}); return; }
      const responseError = err as { response?: { data?: { message?: string } } };
      setErrors({ form: responseError.response?.data?.message || "Invalid username or password" });
    } finally {
      submissionPending.current = false;
      setLoading(false);
    }
  };

  const PasswordToggle = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={showPassword ? "Hide password" : "Show password"}
      aria-label={showPassword ? "Hide password" : "Show password"}
      aria-pressed={showPassword}
      onClick={() => setShowPassword(!showPassword)}
      className={inputIconButtonClassName}
    >
      {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
    </Button>
  );

  // Keep Edge's native reveal icon from overlapping our visibility button.
  const fieldClass = "[&::-ms-reveal]:hidden";
  const fieldLabelClass = "text-ui-label font-medium text-foreground";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!loading) onOpenChange(nextOpen); }}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-2xl sm:max-w-[600px] md:max-w-[960px] [&>button]:hidden">
        <div className="relative grid min-h-0 max-h-[92dvh] grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            aria-label="Close authentication dialog"
            className="gw-action-ghost absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:bg-canopy/60 md:text-forest-foreground/80 md:hover:bg-canopy/80 md:hover:text-forest-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Left side - Form */}
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-card text-card-foreground">
            {/* Header - fixed */}
            <div className="shrink-0 px-6 pb-5 pt-6 sm:px-10 sm:pb-6 sm:pt-8">
              <div className="mb-5 flex items-center gap-2.5 sm:mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
                  <GreenWayLogo />
                </div>
                <span className="font-display text-lg font-semibold tracking-tight text-foreground">GreenWay</span>
              </div>
              <DialogTitle className="gw-heading gw-auth-title text-foreground">
                {recoveryReceipt ? "Save Your Recovery Code" : recoveryOpen ? "Reset Your Password" : tab === "login" ? "Welcome Back" : "Create an Account"}
                <span className="text-primary">.</span>
              </DialogTitle>
              {!recoveryReceipt && (
                <DialogDescription className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {recoveryOpen ? "Recover your account using your saved code." : tab === "login"
                    ? "Use your username and GreenWay password."
                    : "Create your login. Complete your resident profile after signing in."}
                </DialogDescription>
              )}
            </div>

            {/* Scrollable form area */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 sm:px-10 sm:pb-8">
              {recoveryReceipt ? <RecoveryCodeReceipt key={recoveryReceipt} code={recoveryReceipt} onContinue={() => { setRecoveryReceipt(null); setTab("login"); }} /> : recoveryOpen ? <AccountRecovery onBack={() => { setRecoveryOpen(false); setLoginPassword(""); setTab("login"); }} /> : tab === "login" ? (
                <form onSubmit={handleLogin} noValidate className="space-y-5">
                  {loginCooldown.seconds > 0 && <CooldownNotice action="login" seconds={loginCooldown.seconds} />}
                  {loginCooldown.seconds === 0 && errors.form && (
                    <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-2.5 font-medium">
                      {errors.form}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="identifier" className={fieldLabelClass}>
                      Username
                    </Label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <ClearableInput
                        id="identifier"
                        aria-invalid={Boolean(errors.identifier)}
                        autoComplete="username"
                        placeholder="Enter your username"
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
                        autoComplete="current-password"
                        aria-invalid={Boolean(errors.loginPassword)}
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => { setLoginPassword(e.target.value); setErrors((prev) => { const { loginPassword, ...rest } = prev; return rest; }); }}
                        className={`pl-10 pr-10 ${fieldClass} ${errors.loginPassword ? "border-destructive" : ""}`}
                      />
                      {PasswordToggle}
                    </div>
                    {errors.loginPassword && <p className="text-xs text-destructive mt-0.5">{errors.loginPassword}</p>}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Checkbox id="remember-me" checked={rememberMe} disabled={loading} onCheckedChange={(checked) => setRememberMe(checked === true)} />
                      <Label htmlFor="remember-me" className="cursor-pointer text-xs font-normal text-muted-foreground">Remember Me</Label>
                    </div>
                    <button type="button" disabled={loading} onClick={() => { setLoginPassword(""); setErrors({}); setRecoveryOpen(true); }} className="gw-action-link text-xs font-medium transition-colors hover:underline">
                      Forgot Password?
                    </button>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading || loginCooldown.seconds > 0} loading={loading} loadingLabel="Signing in…">

                    <span>Log In to GreenWay</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  <p className="border-t border-border/70 pt-5 text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <button type="button" disabled={loading} onClick={() => { setLoginPassword(""); setTab("register"); setErrors({}); }} className="gw-action-link font-semibold transition-colors hover:underline">
                      Sign Up
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegister} noValidate className="space-y-4">
                  {registerCooldown.seconds > 0 && <CooldownNotice action="signup" seconds={registerCooldown.seconds} />}
                  {registerCooldown.seconds === 0 && errors.form && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{errors.form}</p>}
                  <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-username" className={fieldLabelClass}>Username</Label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <ClearableInput
                            id="reg-username"
                            aria-invalid={Boolean(errors.username)}
                            aria-describedby={errors.username ? "username-error" : undefined}
                            autoComplete="username" maxLength={20} spellCheck={false}
                            placeholder="Choose your username"
                            value={username}
                            onChange={(e) => { setUsername(e.target.value); setErrors((prev) => { const { username, ...rest } = prev; return rest; }); }}
                            className={`pl-10 ${fieldClass} ${errors.username ? "border-destructive" : ""}`}
                          />
                        </div>
                        {errors.username && <p id="username-error" role="alert" className="text-xs text-destructive mt-0.5">{errors.username}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="reg-password" className={fieldLabelClass}>Password</Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="reg-password"
                            autoComplete="new-password"
                            aria-invalid={Boolean(errors.password)}
                            type={showPassword ? "text" : "password"}
                            placeholder="Minimum 8 characters"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setErrors((prev) => { const { password, confirmPassword, ...rest } = prev; return rest; }); }}
                            className={`pl-10 pr-10 ${fieldClass} ${errors.password ? "border-destructive" : ""}`}
                          />
                          {PasswordToggle}
                        </div>
                        {errors.password && <p className="text-xs text-destructive mt-0.5">{errors.password}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="confirm-password" className={fieldLabelClass}>Confirm Password</Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="confirm-password"
                            autoComplete="new-password"
                            aria-invalid={Boolean(errors.confirmPassword)}
                            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Re-enter your password"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setErrors((prev) => { const { confirmPassword, ...rest } = prev; return rest; }); }}
                            className={`pl-10 pr-10 ${fieldClass} ${errors.confirmPassword ? "border-destructive" : ""}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            aria-pressed={showConfirmPassword}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className={inputIconButtonClassName}
                          >
                            {showConfirmPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                          </Button>
                        </div>
                        {errors.confirmPassword && <p id="confirm-password-error" className="mt-0.5 text-xs text-destructive">{errors.confirmPassword}</p>}
                      </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(checked) => {
                        setTermsAccepted(checked === true);
                      }}
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" className="cursor-pointer text-xs font-normal leading-5 text-muted-foreground">
                      I agree to the <span className="font-semibold text-primary">Terms</span> and <span className="font-semibold text-primary">Privacy Policy</span>.
                    </Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || registerCooldown.seconds > 0 || !termsAccepted} loading={loading} loadingLabel="Creating account…">Create My Account <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  <p className="border-t border-border/70 pt-5 text-center text-sm text-muted-foreground">
                    Already a member?{" "}
                    <button type="button" disabled={loading} onClick={() => { setLoginPassword(""); setTab("login"); setErrors({}); }} className="gw-action-link font-semibold transition-colors hover:underline">
                      Log In
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Right side - Visual panel (hidden on mobile) */}
          <aside className="relative hidden min-w-0 overflow-hidden border-l border-forest-foreground/10 bg-forest text-forest-foreground md:flex">

            <div className="relative z-10 flex w-full flex-col justify-between gap-8 p-8">
              <div>
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-forest-foreground/10 ring-1 ring-forest-foreground/15">
                  <GreenWayLogo alt="" className="text-forest-foreground" />
                </div>
                <h3 className="gw-heading text-2xl leading-tight tracking-tight text-balance">
                  Join the green movement today.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-forest-foreground/75">
                  Track waste collection, report issues, and help keep your community clean and green.
                </p>

                <ul className="mt-7 space-y-4 border-t border-forest-foreground/15 pt-5" aria-label="GreenWay community benefits">
                  <li className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-foreground/10"><Users className="h-4 w-4" /></span>
                    <span className="text-sm font-medium leading-snug">Cleaner Communities</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-foreground/10"><Leaf className="h-4 w-4" /></span>
                    <span className="text-sm font-medium leading-snug">A Greener Tomorrow</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-foreground/10"><Heart className="h-4 w-4" /></span>
                    <span className="text-sm font-medium leading-snug">Stronger Together</span>
                  </li>
                </ul>
              </div>

              <div>
                <div className="grid grid-cols-2 gap-4 border-t border-forest-foreground/15 pt-5">
                  <div>
                    <p className="gw-stat-value text-2xl tracking-[-0.04em]">Calendar</p>
                    <p className="text-ui-caption text-forest-foreground/70">Collection schedule</p>
                  </div>
                  <div className="border-l border-forest-foreground/15 pl-4">
                    <p className="gw-stat-value text-2xl tracking-[-0.04em]">Reports</p>
                    <p className="text-ui-caption text-forest-foreground/70">Waste concerns for MENRO</p>
                  </div>
                </div>
                <p className="mt-6 text-ui-caption text-forest-foreground/65">© {getManilaNow().year} GreenWay</p>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
