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
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}

export function FilterPillTabs<T extends string = string>({
  items,
  activeId,
  onChange,
  className,
}: FilterPillTabsProps<T>) {
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

    onChange(items[nextIndex].id);
    const tabButtons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]',
      );
    tabButtons?.[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none touch-pan-x",
        className
      )}
    >
      {items.map((tab, index) => {
        const isActive = activeId === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            type="button"
            onClick={() => onChange(tab.id)}
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
