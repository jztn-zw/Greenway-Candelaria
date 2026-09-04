import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BarChart3, Building2, AlertTriangle, Users, Truck } from "lucide-react";

const sections = [
  { id: "overview", label: "Executive Overview", icon: LayoutDashboard },
  { id: "collection-performance", label: "Collections", icon: BarChart3 },
  { id: "barangay-compliance", label: "Barangay Compliance", icon: Building2 },
  { id: "waste-reports", label: "Reports & Incidents", icon: AlertTriangle },
  { id: "resident-engagement", label: "Resident Engagement", icon: Users },
  { id: "truck-driver", label: "Fleet & Drivers", icon: Truck },
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
        const Icon = s.icon;
        return (
          <button
            key={s.id}
            type="button"
            onClick={(e) => handleTabClick(s.id, e)}
            className={cn(
              "group h-9 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 shrink-0 active:scale-95 border cursor-pointer",
              active
                ? "bg-primary text-primary-foreground border-primary shadow-xs shadow-primary/25 font-bold"
                : "bg-card border-border/80 text-muted-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "w-3.5 h-3.5 transition-colors",
                active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
              )}
            />
            <span>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export { sections };
export default AnalyticsSectionNav;
