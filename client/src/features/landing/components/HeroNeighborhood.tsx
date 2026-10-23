import { useEffect, useRef, useState, type ReactNode } from "react";
import { useThemeMode } from "@/hooks/useThemeMode";
import neighborhood from "@/assets/hero-neighborhood.webp";
import neighborhoodWide from "@/assets/hero-neighborhood-wide.webp";
import neighborhoodNight from "@/assets/hero-neighborhood-night.webp";
import truck from "@/assets/hero-truck.webp";
import "./HeroNeighborhood.css";

export default function HeroNeighborhood({ children }: { children?: ReactNode }) {
  const theme = useThemeMode();
  const sceneryRef = useRef<HTMLImageElement>(null);
  const truckRef = useRef<HTMLImageElement>(null);
  const [readyTheme, setReadyTheme] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const images = [sceneryRef.current, truckRef.current];
    // Decode cached images too, so every layer is ready for the same paint.
    void Promise.all(images.map(async (image) => {
      if (!image) return;
      try {
        await image.decode?.();
      } catch {
        // A failed asset must not leave the rest of the scene hidden forever.
      }
    })).then(() => {
      if (!cancelled) setReadyTheme(theme);
    });
    return () => { cancelled = true; };
  }, [theme]);

  return (
    <div className="hero-scene-content" style={{ visibility: readyTheme === theme ? "visible" : "hidden" }}>
    <div
      className="hero-neighborhood relative isolate overflow-clip"
      role="img"
      aria-label="An illustrated green collection truck driving through a neighborhood with houses and green trees."
    >
      <div className="hero-neighborhood__scenery">
        <picture>
          {theme !== "dark" && <source media="(min-width: 1024px)" srcSet={neighborhoodWide} />}
          <img ref={sceneryRef} src={theme === "dark" ? neighborhoodNight : neighborhood} alt="" width={1536} height={1024} loading="eager" fetchPriority="high" className="hero-neighborhood__art block aspect-square w-full object-cover lg:aspect-[3/2]" />
        </picture>
      </div>
      <div className="hero-neighborhood__route" aria-hidden="true">
        <img ref={truckRef} src={truck} alt="" loading="eager" fetchPriority="high" className="hero-neighborhood__truck" />
      </div>
      <div className="hero-neighborhood__foreground" aria-hidden="true">
        <span className="hero-neighborhood__tree hero-neighborhood__tree--1" />
        <span className="hero-neighborhood__tree hero-neighborhood__tree--2" />
        <span className="hero-neighborhood__tree hero-neighborhood__tree--3" />
        <span className="hero-neighborhood__tree hero-neighborhood__tree--4" />
        <span className="hero-neighborhood__tree hero-neighborhood__tree--5" />
        <span className="hero-neighborhood__tree hero-neighborhood__tree--6" />
      </div>
    </div>
    {children}
    </div>
  );
}
