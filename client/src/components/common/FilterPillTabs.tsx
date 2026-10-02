import React from "react";
import { cn } from "@/lib/utils";

export interface FilterPillItem<T extends string = string> {
  id: T;
  label: string;
  count?: number | string;
  icon?: React.ElementType;
}

export interface FilterPillTabsProps<T extends string = string> {
  items: FilterPillItem<T>[];
  activeId?: T;
  onChange: (id: T) => void;
  className?: string;
  ariaLabel?: string;
}

export function FilterPillTabs<T extends string = string>({
  items,
  activeId,
  onChange,
  className,
  ariaLabel = "Filter options",
}: FilterPillTabsProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });
  const selectedIndex = items.findIndex((item) => item.id === activeId);

  const revealButton = (button: HTMLButtonElement) => {
    const container = containerRef.current;
    if (!container || container.scrollWidth <= container.clientWidth) return;
    container.scrollTo?.({
      left: button.offsetLeft - (container.clientWidth - button.offsetWidth) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const container = event.currentTarget;
    dragRef.current = {
      active: container.scrollWidth > container.clientWidth,
      moved: false,
      startX: event.clientX,
      scrollLeft: container.scrollLeft,
    };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const distance = event.clientX - drag.startX;
    if (Math.abs(distance) <= 4 && !drag.moved) return;
    drag.moved = true;
    event.currentTarget.scrollLeft = drag.scrollLeft - distance * 1.3;
  };

  const stopDragging = () => { dragRef.current.active = false; };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + items.length) %
            items.length;

    if (items[nextIndex].id !== activeId) onChange(items[nextIndex].id);
    const tabButtons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        "button",
      );
    const nextButton = tabButtons?.[nextIndex];
    if (nextButton) {
      nextButton.focus({ preventScroll: true });
      revealButton(nextButton);
    }
  };

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={ariaLabel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDragging}
      onMouseLeave={stopDragging}
      className={cn(
        "relative flex min-w-0 items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none touch-pan-x select-none cursor-grab active:cursor-grabbing",
        className
      )}
    >
      {items.map((tab, index) => {
        const isActive = activeId === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            aria-pressed={isActive}
            tabIndex={isActive || (selectedIndex === -1 && index === 0) ? 0 : -1}
            type="button"
            onClick={(event) => {
              const wasDragged = dragRef.current.moved;
              dragRef.current.moved = false;
              if (event.detail !== 0 && wasDragged) return;
              onChange(tab.id);
              revealButton(event.currentTarget);
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "group flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-150 border cursor-pointer shrink-0 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground "
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
