import { Button } from "@/components/ui/button";
import { useStaggerReveal } from "@/hooks/useScrollReveal";
import { MapPin, Truck, Users, Flag, LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_CONTENT, StatisticsContent } from "@/pages/admin/components/landingmanager/types";
import { useNavigate } from "react-router-dom";
import { handleLandingNavigation } from "@/pages/landingpage/utils/navigation";

const statIcons: LucideIcon[] = [MapPin, Truck, Users, Flag];

function parseStatValue(rawValue: string) {
  const numeric = Number(rawValue.replace(/[^0-9]/g, ""));
  return {
    numberValue: Number.isFinite(numeric) ? numeric : 0,
    suffix: rawValue.replace(/[0-9,]/g, ""),
    isNumeric: /\d/.test(rawValue),
  };
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function useCountUpOnView(target: number, duration = 1500) {
  const [count, setCount] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setCount(target);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [target]);

  useEffect(() => {
    if (!triggered) return;

    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [triggered, target, duration]);

  return { count, ref };
}

const StatCard = ({
  icon: Icon,
  value,
  label,
  sub,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  sub: string;
}) => {
  const { numberValue, suffix, isNumeric } = parseStatValue(value);
  const { count, ref } = useCountUpOnView(numberValue);

  return (
    <div
      ref={ref}
      className="bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 flex flex-col items-center text-center border border-white/10 hover:bg-white/15 transition-colors duration-300"
    >
      <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-white/90 flex items-center justify-center mb-2 sm:mb-4 shadow-lg shadow-black/10">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-[hsl(var(--forest))]" />
      </div>
      <p className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white font-display tabular-nums">
        {isNumeric ? formatNumber(count) : value}
        {isNumeric ? suffix : ""}
      </p>
      <p className="text-xs sm:text-sm lg:text-base font-medium text-white mt-1 sm:mt-2">{label}</p>
      <p className="text-[11px] sm:text-xs lg:text-sm text-white/60 mt-0.5 sm:mt-1">{sub}</p>
    </div>
  );
};

interface ImpactStatsSectionProps {
  content?: StatisticsContent;
};

const ImpactStatsSection = ({ content = DEFAULT_CONTENT.statistics }: ImpactStatsSectionProps) => {
  const navigate = useNavigate();
  const statsRef = useStaggerReveal(content.stats.length);

  return (
    <section id="statistics" className="py-10 sm:py-16 lg:py-20">
      <div className="container">
        <div className="bg-gradient-to-br from-[hsl(var(--forest))] via-[hsl(var(--accent))] to-[hsl(var(--canopy))] rounded-2xl sm:rounded-3xl p-6 sm:p-10 lg:p-14 text-forest-foreground relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none hidden sm:block" />
          <div className="absolute bottom-0 left-10 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 pointer-events-none hidden sm:block" />

          <div className="max-w-3xl mx-auto text-center space-y-3 sm:space-y-6 relative">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest opacity-80">
              <span className="w-8 h-px bg-white/40" />
              {content.sectionLabel}
              <span className="w-8 h-px bg-white/40" />
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold whitespace-pre-line">{content.heading}</h2>
          </div>
          <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 mt-6 sm:mt-10 relative">
            {content.stats.map((stat, index) => (
              <StatCard key={stat.id} icon={statIcons[index % statIcons.length]} value={stat.value} label={stat.label} sub={stat.sub} />
            ))}
          </div>
          <div className="text-center mt-6 sm:mt-10 relative">
            <Button
              variant="secondary"
              size="lg"
              className="shadow-xl"
              onClick={() => handleLandingNavigation(content.ctaLink, navigate)}
            >
              {content.ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ImpactStatsSection;
