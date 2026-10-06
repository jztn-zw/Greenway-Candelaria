import { useEffect, useRef, useState, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileCarouselProps {
  children: React.ReactNode[];
  autoScrollInterval?: number;
  className?: string;
  cardClassName?: string;
}

const MobileCarousel = ({
  children,
  autoScrollInterval = 3500,
  className = "",
  cardClassName = "w-[75vw] shrink-0 snap-center",
}: MobileCarouselProps) => {
  const isMobile = useIsMobile();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInteracting = useRef(false);

  const count = children.length;

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el) return;
      const child = el.children[index] as HTMLElement | undefined;
      if (child) {
        el.scrollTo({ left: child.offsetLeft - 16, behavior: "smooth" });
      }
    },
    []
  );

  // Track active index from scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isMobile) return;

    const onScroll = () => {
      const scrollLeft = el.scrollLeft + 16;
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i] as HTMLElement;
        const dist = Math.abs(child.offsetLeft - scrollLeft);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      setActiveIndex(closest);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isMobile]);

  // Auto-scroll
  useEffect(() => {
    if (!isMobile) return;

    const start = () => {
      autoScrollRef.current = setInterval(() => {
        if (isInteracting.current) return;
        setActiveIndex((prev) => {
          const next = (prev + 1) % count;
          scrollToIndex(next);
          return next;
        });
      }, autoScrollInterval);
    };

    start();
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [isMobile, count, autoScrollInterval, scrollToIndex]);

  // Pause on touch
  const handleTouchStart = () => {
    isInteracting.current = true;
  };
  const handleTouchEnd = () => {
    setTimeout(() => {
      isInteracting.current = false;
    }, 2000);
  };

  if (!isMobile) return null;

  return (
    <div className={className}>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4 -mx-4 pt-2 pb-2"
        style={{ WebkitOverflowScrolling: "touch" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {children.map((child, i) => (
          <div key={i} className={cardClassName}>
            {child}
          </div>
        ))}
      </div>
      {/* Dot indicators */}
      {count > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "bg-primary w-4"
                  : "bg-muted-foreground/30"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileCarousel;
