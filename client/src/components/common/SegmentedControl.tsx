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
              "flex items-center gap-1.5 rounded-lg font-semibold transition-all cursor-pointer select-none ",
              size === "sm" ? "h-7 px-2.5 text-ui-caption" : "h-8 px-3 text-xs",
              isActive
                ? "bg-card text-foreground shadow-2xs"
                : "gw-action-ghost "
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
