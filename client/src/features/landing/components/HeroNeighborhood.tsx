import neighborhood from "@/assets/hero-neighborhood.webp";
import neighborhoodWide from "@/assets/hero-neighborhood-wide.webp";
import neighborhoodNight from "@/assets/hero-neighborhood-night.webp";
import truck from "@/assets/hero-truck.webp";
import "./HeroNeighborhood.css";

export default function HeroNeighborhood() {
  return (
    <div
      className="hero-neighborhood relative isolate overflow-clip"
      role="img"
      aria-label="An illustrated green collection truck driving through a neighborhood with houses and green trees."
    >
      <div className="hero-neighborhood__scenery">
        <picture className="dark:hidden">
          <source media="(min-width: 1024px)" srcSet={neighborhoodWide} />
          <img src={neighborhood} alt="" width={1024} height={1024} fetchPriority="high" className="hero-neighborhood__art block aspect-square w-full lg:aspect-[3/2]" />
        </picture>
        <img src={neighborhoodNight} alt="" width={1536} height={1024} fetchPriority="high" className="hero-neighborhood__art hidden aspect-square w-full object-cover dark:block lg:aspect-[3/2]" />
      </div>
      <div className="hero-neighborhood__route" aria-hidden="true">
        <img src={truck} alt="" className="hero-neighborhood__truck" />
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
  );
}
