import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Moon, Sun } from "lucide-react";
import AuthModal from "@/pages/landingpage/components/AuthModal";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    const nextDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
    setDark(nextDark);
  };

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
    { label: "About", href: "#about" },
    { label: "Services", href: "#services" },
    { label: "News & Updates", href: "#news-updates" },
    { label: "FAQ", href: "#faq" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/95 backdrop-blur-md border-b shadow-sm"
          : "bg-background/80 backdrop-blur border-b border-transparent"
      }`}>
        <div className="container flex items-center justify-between h-16">
          <a href="#" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
            <img src="/greenway.svg" alt="GreenWay Logo" className="w-8 h-8" />
            GreenWay
          </a>

          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="relative text-sm font-medium text-foreground/70 hover:text-primary transition-colors duration-200 after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[2px] after:bg-primary after:scale-x-0 after:origin-center after:transition-transform after:duration-300 hover:after:scale-x-100"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-secondary transition-colors relative w-8 h-8 flex items-center justify-center overflow-hidden"
            >
              <Sun
                className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${
                  dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"
                }`}
              />
              <Moon
                className={`w-4 h-4 absolute transition-all duration-500 ease-in-out ${
                  dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                }`}
              />
            </button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => openAuth("login")}>Login</Button>
            <Button size="sm" className="rounded-xl" onClick={() => openAuth("register")}>Sign Up</Button>
          </div>

          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <div
          className={`md:hidden border-t bg-background overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "max-h-[400px] opacity-100 p-4" : "max-h-0 opacity-0 p-0"
          }`}
        >
          <div className="space-y-3">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="block text-sm font-medium text-foreground/70 hover:text-primary transition-colors duration-200 hover:translate-x-1 transform"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => { setOpen(false); openAuth("login"); }}>Login</Button>
              <Button size="sm" className="flex-1 rounded-xl" onClick={() => { setOpen(false); openAuth("register"); }}>Sign Up</Button>
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
