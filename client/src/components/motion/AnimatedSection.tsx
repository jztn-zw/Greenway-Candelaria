import { useEffect, useRef, useState } from "react";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  animation?: "fade-up" | "fade-in" | "scale-in" | "slide-right";
}

const animationClasses: Record<string, { initial: string; animate: string }> = {
  "fade-up": {
    initial: "opacity-0 translate-y-6",
    animate: "opacity-100 translate-y-0",
  },
  "fade-in": {
    initial: "opacity-0",
    animate: "opacity-100",
  },
  "scale-in": {
    initial: "opacity-0 scale-[0.97]",
    animate: "opacity-100 scale-100",
  },
  "slide-right": {
    initial: "opacity-0 -translate-x-6",
    animate: "opacity-100 translate-x-0",
  },
};

const AnimatedSection = ({
  children,
  className = "",
  delay = 0,
  animation = "fade-up",
}: AnimatedSectionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "20px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  const config = animationClasses[animation];

  return (
    <div
      ref={ref}
      className={`transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible ? config.animate : config.initial
      } ${className}`}
      style={{ willChange: isVisible ? "auto" : "transform, opacity" }}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
