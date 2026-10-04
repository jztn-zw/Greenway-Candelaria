import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useLayoutEffect(() => {
    // Reset both possible page scroll containers before the new route is painted.
    const main = pageRef.current?.closest("main");
    if (main) {
      main.scrollTop = 0;
      main.scrollLeft = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    setIsVisible(false);
    const raf = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

  return (
    <div
      ref={pageRef}
      className={`transition-all duration-400 ease-out will-change-[transform,opacity] ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-3"
      }`}
    >
      {children}
    </div>
  );
};

export default PageTransition;
