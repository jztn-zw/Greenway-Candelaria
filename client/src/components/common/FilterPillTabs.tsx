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
        const countNum = typeof tab.count === "number" ? tab.count : Number(tab.count);
        const hasCount = tab.count !== undefined && !isNaN(countNum);

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
              "group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border cursor-pointer active:scale-95 shrink-0 select-none",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-xs shadow-primary/25"
                : "bg-card border-border/80 text-muted-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-foreground"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{tab.label}</span>
            {hasCount && (
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full leading-none font-bold text-[10px] tabular-nums transition-colors",
                  countNum > 9 ? "h-5 min-w-5 px-1.5" : "w-5 h-5",
                  isActive
                    ? "bg-primary-foreground text-primary"
                    : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
