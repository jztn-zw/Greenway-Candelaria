import React, { useRef } from "react";
import { cn } from "@/lib/utils";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "collection-performance", label: "Collection efficiency" },
  { id: "missed-collections", label: "Missed collections" },
  { id: "waste-reports", label: "Reports & incidents" },
  { id: "resident-engagement", label: "Residents" },
  { id: "truck-driver", label: "Driver operations" },
  { id: "barangay-compliance", label: "Barangay coverage" },
];

interface Props {
  activeSection: string;
  onSectionChange: (id: string) => void;
}

const AnalyticsSectionNav: React.FC<Props> = ({ activeSection, onSectionChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeftRef.current = containerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.3;
    if (Math.abs(walk) > 4) {
      hasDraggedRef.current = true;
    }
    containerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTabClick = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (hasDraggedRef.current) return;
    onSectionChange(id);
    e.currentTarget.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none touch-pan-x select-none cursor-grab active:cursor-grabbing scroll-smooth"
    >
      {sections.map((s) => {
        const active = activeSection === s.id;
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={active}
            onClick={(e) => handleTabClick(s.id, e)}
            className={cn(
              "flex shrink-0 cursor-pointer items-center whitespace-nowrap rounded-xl border px-3.5 py-2 font-body text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-95",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/25"
                : "border-border/80 bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export { sections };
export default AnalyticsSectionNav;
