import React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string = string> {
  id?: T;
  value?: T;
  label: string;
  icon?: React.ElementType;
  badge?: number | string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
  ariaLabel?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = "md",
  ariaLabel = "View options",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border/80 gap-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const optKey = (opt.id ?? opt.value ?? opt.label) as T;
        const isActive = value === optKey;
        const Icon = opt.icon;

        return (
          <button
            key={String(optKey)}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(optKey)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg font-semibold transition-all cursor-pointer select-none active:scale-95",
              size === "sm" ? "h-7 px-2.5 text-[11px]" : "h-8 px-3 text-xs",
              isActive
                ? "bg-card text-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "bg-muted-foreground/15 text-muted-foreground"
                )}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
