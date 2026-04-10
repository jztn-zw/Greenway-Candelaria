import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: React.ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [displayKey, setDisplayKey] = useState(location.key);

  useEffect(() => {
    setIsVisible(false);
    const raf = requestAnimationFrame(() => {
      setDisplayKey(location.key);
      requestAnimationFrame(() => setIsVisible(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [location.key]);

  return (
    <div
      key={displayKey}
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
