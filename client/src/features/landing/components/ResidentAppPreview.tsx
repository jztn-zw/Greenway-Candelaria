import { useEffect, useRef, useState } from "react";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import { useThemeMode } from "@/hooks/useThemeMode";
import lightPreview from "@/assets/resident-app-preview-light.png";
import darkPreview from "@/assets/resident-app-preview-dark.png";
import lightTracking from "@/assets/resident-app-tracking-light.png";
import darkTracking from "@/assets/resident-app-tracking-dark.png";
import lightReport from "@/assets/resident-app-report-light.png";
import darkReport from "@/assets/resident-app-report-dark.png";
import lightReports from "@/assets/resident-app-reports-light.png";
import darkReports from "@/assets/resident-app-reports-dark.png";

const scenes = [
  { name: "Home", light: lightPreview, dark: darkPreview, alt: "Resident dashboard with collection information and quick actions", tap: { left: "50%", top: "95%" } },
  { name: "Tracking", light: lightTracking, dark: darkTracking, alt: "Truck tracking with the Candelaria map and assigned collection truck", tap: { left: "30%", top: "95%" } },
  { name: "Report", light: lightReport, dark: darkReport, alt: "Waste report form with photos, location, and violation categories", tap: null },
  { name: "Reports", light: lightReports, dark: darkReports, alt: "Report history showing an overflowing bin concern under review", tap: { left: "13%", top: "95%" } },
];

function AnimatedAppScreens({ theme }: { theme: "light" | "dark" }) {
  const frame = useRef<HTMLDivElement>(null);
  const images = useRef<(HTMLImageElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [preload, setPreload] = useState(false);
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const moving = ready && visible && !hovered && !focused && !reducedMotion;

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(motion.matches);
    motion.addEventListener("change", change);
    return () => motion.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    if (!frame.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      setPreload(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting) setPreload(true);
    }, { threshold: 0.15 });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!preload) return;
    let cancelled = false;
    // Keep Home visible until every full-resolution screen is decoded.
    void Promise.all(images.current.map(image => image?.decode?.())).then(() => {
      if (!cancelled) setReady(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [preload]);

  useEffect(() => {
    if (!moving) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % scenes.length), 4200);
    return () => window.clearInterval(timer);
  }, [moving]);

  return (
    <div className="flex min-h-0 flex-1 items-center">
      <div ref={frame} role="region" aria-label="Animated resident app preview" tabIndex={0} data-screen={scenes[active].name}
        className="app-preview-screens relative aspect-[39/79] w-full overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}>
        {scenes.map((scene, index) => <img key={scene.name} ref={element => { images.current[index] = element; }}
          src={index === 0 || preload ? scene[theme] : undefined}
          alt={scene.alt} aria-hidden={active !== index} width={780} height={1580}
          loading={index === 0 ? "lazy" : "eager"} decoding="async"
          className={`app-preview-capture absolute inset-0 h-full w-full object-contain ${active === index ? "is-active" : ""}`} />)}
        {moving && scenes[active].tap && <span key={active} aria-hidden="true" className="app-preview-tap" style={scenes[active].tap!} />}
        {scenes[active].name === "Tracking" && <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"
          className="absolute bottom-[34%] right-0 bg-card px-1 py-0.5 text-[10px] leading-tight text-foreground underline underline-offset-2">© OpenStreetMap contributors</a>}
        <span className="sr-only">Automatic preview using sample data. Hover or focus to hold the current screen.</span>
      </div>
    </div>
  );
}

export default function ResidentAppPreview() {
  const theme = useThemeMode();

  return (
    <figure className="app-download-preview relative m-0 flex min-w-0 flex-col items-center justify-center gap-4 px-6 py-8">
      <div aria-hidden="true" className="app-download-orbit pointer-events-none absolute rounded-full border border-primary/15" />
      <div className="app-download-phone relative w-full p-2">
        <span aria-hidden="true" className="app-download-phone-switch absolute rounded-full" />
        <span aria-hidden="true" className="app-download-phone-volume absolute rounded-full" />
        <span aria-hidden="true" className="app-download-phone-power absolute rounded-full" />
        <div className="app-download-phone-screen absolute inset-2 flex flex-col overflow-hidden bg-background">
          <div aria-hidden="true" className="relative flex h-6 shrink-0 items-center justify-between px-4 text-foreground">
            <span className="text-[8px] font-semibold tabular-nums">9:41</span>
            <span className="app-download-phone-island absolute left-1/2 top-1.5 h-3 w-14 -translate-x-1/2 rounded-full" />
            <span className="flex items-center gap-0.5"><Signal className="h-2 w-2" /><Wifi className="h-2 w-2" /><BatteryFull className="h-2.5 w-2.5" /></span>
          </div>
          <AnimatedAppScreens key={theme} theme={theme} />
          <div aria-hidden="true" className="mx-auto my-1.5 h-0.5 w-16 shrink-0 rounded-full bg-foreground/60" />
        </div>
      </div>
      <figcaption className="relative rounded-xl bg-card/95 px-4 py-2 text-center">
        <p className="text-xs font-medium text-foreground">GreenWay Candelaria</p>
        <p className="mt-1 text-[10px] text-muted-foreground">Resident app demonstration · Sample data</p>
      </figcaption>
    </figure>
  );
}
