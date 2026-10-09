import { useEffect, useRef, useState } from "react";
import "./AnimatedSection.css";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  animation?: "fade-up" | "fade-in" | "scale-in" | "slide-right";
}

const AnimatedSection = ({
  children,
  className = "",
  delay = 0,
  animation = "fade-up",
}: AnimatedSectionProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionPreference.matches || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    let timer: number | undefined;
    const reveal = () => setIsVisible(true);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          if (delay > 0) timer = window.setTimeout(reveal, delay);
          else reveal();
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px 64px 0px" }
    );
    const handleMotionChange = (event: MediaQueryListEvent) => {
      if (event.matches) reveal();
    };

    if (ref.current) observer.observe(ref.current);
    motionPreference.addEventListener("change", handleMotionChange);
    return () => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
      motionPreference.removeEventListener("change", handleMotionChange);
    };
  }, [delay, isVisible]);

  return (
    <div
      ref={ref}
      className={`gw-section-reveal ${className}`}
      data-animation={animation}
      data-revealed={isVisible}
      onFocusCapture={() => setIsVisible(true)}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
