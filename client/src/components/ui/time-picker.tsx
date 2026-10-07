import { toManilaCalendarDate } from "@/utils/date";
import * as React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { Clock } from "lucide-react";
import { Anchor as PopoverAnchor } from "@radix-ui/react-popover";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { fieldStyles } from "./fieldStyles";

export interface TimePickerProps {
  id?: string;
  value: string; // "HH:mm" in 24-hour format
  onChange: (time24: string) => void;
  className?: string;
  containerClassName?: string;
  disabled?: boolean;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
}

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS = ["am", "pm"] as const;

function parseTime24(timeStr: string) {
  let [h, m] = (timeStr || "00:00").split(":").map(Number);
  if (isNaN(h)) h = 0;
  if (isNaN(m)) m = 0;

  const period: "am" | "pm" = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;

  return {
    hour12,
    minute: m,
    period,
  };
}

function toTime24(hour12: number, minute: number, period: "am" | "pm"): string {
  let h24 = hour12;
  if (period === "am") {
    if (h24 === 12) h24 = 0;
  } else {
    if (h24 !== 12) h24 += 12;
  }
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function TimePicker({
  id,
  value,
  onChange,
  className,
  containerClassName,
  disabled = false,
  "aria-invalid": invalid,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedHourRef = useRef<HTMLButtonElement>(null);
  const selectedMinuteRef = useRef<HTMLButtonElement>(null);

  const parsed = useMemo(() => parseTime24(value), [value]);
  const [typedValue, setTypedValue] = useState(value);

  useEffect(() => {
    setTypedValue(value);
  }, [value]);

  // Scroll active items into view when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        // Scroll only the columns; opening the picker must not move the page.
        for (const item of [selectedHourRef.current, selectedMinuteRef.current]) {
          const viewport = item?.closest<HTMLElement>("[data-radix-scroll-area-viewport]");
          if (item && viewport) {
            viewport.scrollTop += item.getBoundingClientRect().top - viewport.getBoundingClientRect().top
              - (viewport.clientHeight - item.offsetHeight) / 2;
          }
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleHourChange = (newHour: number) => {
    const new24 = toTime24(newHour, parsed.minute, parsed.period);
    onChange(new24);
  };

  const handleMinuteChange = (newMinute: number) => {
    const new24 = toTime24(parsed.hour12, newMinute, parsed.period);
    onChange(new24);
  };

  const handlePeriodChange = (newPeriod: "am" | "pm") => {
    const new24 = toTime24(parsed.hour12, parsed.minute, newPeriod);
    onChange(new24);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setTypedValue(text);
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) {
      onChange(text);
    }
  };

  const handleInputBlur = () => {
    if (!typedValue) setTypedValue(value);
  };

  const handleSetNow = () => {
    const now = toManilaCalendarDate();
    const h24 = now.getHours();
    const m = now.getMinutes();
    const time24 = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    onChange(time24);
  };

  return (
    <Popover open={isOpen && !disabled} onOpenChange={setIsOpen}>
      <div className={cn("relative inline-block w-full max-w-[150px]", containerClassName)}>
        <PopoverAnchor asChild>
          <div
            data-field-container
            data-state={isOpen ? "open" : "closed"}
            aria-disabled={disabled}
            aria-invalid={invalid}
            className={cn(
              "flex items-center justify-between gap-1.5",
              fieldStyles.surface,
              fieldStyles.compact,
              disabled && "opacity-50 pointer-events-none",
              className,
            )}
          >
            <input
              id={id}
              type="time"
              step={60}
              disabled={disabled}
              aria-invalid={invalid}
              value={typedValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              aria-label={id ? undefined : "Time"}
              className="min-w-0 w-full bg-transparent text-inherit font-semibold tabular-nums text-foreground outline-none [&::-webkit-calendar-picker-indicator]:hidden"
            />
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                className="gw-action-ghost flex size-6 shrink-0 items-center justify-center rounded-md transition-colors cursor-pointer"
                title="Toggle Time Picker"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent
          aria-label="Choose time"
          side="top"
          align="end"
          collisionPadding={16}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            selectedHourRef.current?.focus({ preventScroll: true });
          }}
          className="z-[80] w-[210px] max-w-[calc(100vw-2rem)] select-none rounded-xl border-border/80 bg-popover p-0 text-popover-foreground shadow-md"
        >
          {/* Header Row */}
          <div className="grid grid-cols-3 border-b border-border/70 bg-muted/40 py-1.5 text-center text-ui-overline font-bold uppercase tracking-wider text-muted-foreground">
            <span>Hour</span>
            <span>Min</span>
            <span>Period</span>
          </div>

          {/* 3 Columns */}
          <div className="grid grid-cols-3 divide-x divide-border/60 h-[190px]">
            {/* Hours Column */}
            <ScrollArea
              className="h-full p-1"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div role="group" aria-label="Hours" className="space-y-0.5">
                {HOURS.map((h) => {
                  const isSelected = parsed.hour12 === h;
                  return (
                    <button
                      key={h}
                      ref={isSelected ? selectedHourRef : undefined}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleHourChange(h)}
                      className={cn(
                        "w-full h-7 flex items-center justify-center text-xs font-semibold rounded-md transition-colors cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "gw-action-ghost ",
                      )}
                    >
                      {String(h).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Minutes Column */}
            <ScrollArea
              className="h-full p-1"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div role="group" aria-label="Minutes" className="space-y-0.5">
                {MINUTES.map((m) => {
                  const isSelected = parsed.minute === m;
                  return (
                    <button
                      key={m}
                      ref={isSelected ? selectedMinuteRef : undefined}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => handleMinuteChange(m)}
                      className={cn(
                        "w-full h-7 flex items-center justify-center text-xs font-semibold rounded-md transition-colors cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "gw-action-ghost ",
                      )}
                    >
                      {String(m).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* AM/PM Column */}
            <div className="p-1 space-y-1 flex flex-col justify-start">
              {PERIODS.map((p) => {
                const isSelected = parsed.period === p;
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handlePeriodChange(p)}
                    className={cn(
                      "w-full h-7 flex items-center justify-center text-xs font-semibold rounded-md transition-colors cursor-pointer uppercase",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "gw-action-ghost ",
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Quick Actions */}
          <div className="flex items-center justify-between border-t border-border/70 px-2 py-1.5 bg-muted/25">
            <button
              type="button"
              onClick={handleSetNow}
              className="gw-action-primary-ghost text-ui-caption font-semibold transition-colors cursor-pointer"
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="gw-action-ghost text-ui-caption font-semibold transition-colors cursor-pointer px-2 py-0.5 rounded-md"
            >
              Done
            </button>
          </div>
        </PopoverContent>
      </div>
    </Popover>
  );
}
