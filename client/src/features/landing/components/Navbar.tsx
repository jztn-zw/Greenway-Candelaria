import { useEffect,useRef,useState } from "react";
import { useThemeMode } from "@/hooks/useThemeMode";
import { toggleThemeMode } from "@/lib/theme";
import { useLocation,useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu,X,Moon,Sun } from "lucide-react";
import AuthModal from "./AuthModal";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const dark = useThemeMode() === "dark";
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openAuth = (tab: "login" | "register") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  useEffect(() => {
    if (location.pathname === "/login") {
      setAuthTab("login");
      setAuthOpen(true);
      return;
    }

    if (authOpen) {
      setAuthOpen(false);
    }
  }, [location.pathname]);

  const links = [
    { label: "Home", href: "#home" },
    { label: "Weekly Guide", href: "#collection-schedule" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "App", href: "#greenway-app" },
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-300 dark:border-border/50 dark:bg-background/95 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md border-b shadow-sm"
          : "bg-background/80 backdrop-blur border-b border-transparent"
      }`}>
        <div className="container flex items-center justify-between h-16">
          <a href="#home" className="font-display font-semibold tracking-tight flex items-center gap-2 text-xl text-primary dark:text-accent-foreground">
            <img src="/greenway.svg" alt="GreenWay Logo" className="w-8 h-8 dark:brightness-125" />
            GreenWay
          </a>

          <div className="hidden lg:flex items-center gap-5 xl:gap-8">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="landing-nav-link relative inline-flex min-h-11 items-center rounded-sm text-sm font-medium text-foreground/70 dark:text-foreground/80 transition-colors duration-200 after:content-[''] after:absolute after:bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-primary after:scale-x-0 after:origin-center after:transition-transform after:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleThemeMode}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="relative h-11 w-11 overflow-hidden"
            >
              <Sun
                className={`gw-theme-icon w-4 h-4 absolute ${
                  dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                }`}
              />
              <Moon
                className={`gw-theme-icon w-4 h-4 absolute ${
                  dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                }`}
              />
            </Button>
            <div className="hidden items-center gap-3 lg:flex">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openAuth("login")}>Login</Button>
              <Button size="sm" className="rounded-xl" onClick={() => openAuth("register")}>Sign Up</Button>
            </div>

            <Button ref={menuToggle} variant="ghost" size="icon" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="landing-mobile-navigation" className="h-11 w-11 lg:hidden" onClick={() => setOpen(!open)}>
              {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </Button>
          </div>
        </div>

        <div
          id="landing-mobile-navigation"
          hidden={!open}
          className="landing-mobile-navigation absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-y border-border bg-background shadow-lg lg:hidden"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
              menuToggle.current?.focus();
            }
          }}
        >
          <div className="container py-3">
            <ul>
              {links.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="landing-mobile-nav-link flex min-h-11 items-center rounded-md px-2 py-2 text-sm font-medium text-foreground transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2 border-t border-border pt-3">
              <Button variant="outline" className="h-11 flex-1" onClick={() => { setOpen(false); openAuth("login"); }}>Login</Button>
              <Button className="h-11 flex-1" onClick={() => { setOpen(false); openAuth("register"); }}>Sign Up</Button>
            </div>
          </div>
        </div>
      </nav>

      <AuthModal
        open={authOpen}
        onOpenChange={(nextOpen) => {
          setAuthOpen(nextOpen);
          if (!nextOpen && location.pathname === "/login") {
            navigate("/", { replace: true });
          }
        }}
        defaultTab={authTab}
      />
    </>
  );
};

export default Navbar;
