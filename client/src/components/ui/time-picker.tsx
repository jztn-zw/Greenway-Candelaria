import * as React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface TimePickerProps {
  value: string; // "HH:mm" in 24-hour format
  onChange: (time24: string) => void;
  className?: string;
  disabled?: boolean;
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
    formatted: `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`,
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

function parseUserTypedTime(input: string): string | null {
  const clean = input.trim().toLowerCase();
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!match12) return null;

  let h = parseInt(match12[1], 10);
  const m = parseInt(match12[2], 10);
  const period = match12[3] as "am" | "pm" | undefined;

  if (m < 0 || m > 59) return null;

  if (period) {
    if (h < 1 || h > 12) return null;
    return toTime24(h, m, period);
  } else {
    if (h < 0 || h > 23) return null;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
}

export function TimePicker({
  value,
  onChange,
  className,
  disabled = false,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedHourRef = useRef<HTMLButtonElement>(null);
  const selectedMinuteRef = useRef<HTMLButtonElement>(null);

  const parsed = useMemo(() => parseTime24(value), [value]);
  const [typedValue, setTypedValue] = useState(parsed.formatted);

  useEffect(() => {
    setTypedValue(parsed.formatted);
  }, [parsed.formatted]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Scroll active items into view when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        selectedHourRef.current?.scrollIntoView({
          block: "center",
          behavior: "auto",
        });
        selectedMinuteRef.current?.scrollIntoView({
          block: "center",
          behavior: "auto",
        });
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
    const parsedTime = parseUserTypedTime(text);
    if (parsedTime) {
      onChange(parsedTime);
    }
  };

  const handleInputBlur = () => {
    const parsedTime = parseUserTypedTime(typedValue);
    if (parsedTime) {
      onChange(parsedTime);
    } else {
      setTypedValue(parsed.formatted);
    }
  };

  const handleSetNow = () => {
    const now = new Date();
    const h24 = now.getHours();
    const m = now.getMinutes();
    const time24 = `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    onChange(time24);
  };

  return (
    <div ref={containerRef} className="relative inline-block w-full max-w-[150px]">
      {/* Time Input Trigger */}
      <div
        className={cn(
          "h-9 px-2.5 text-xs rounded-xl border border-border bg-background flex items-center justify-between gap-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all",
          disabled && "opacity-50 pointer-events-none",
          className,
        )}
      >
        <input
          type="text"
          value={typedValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onFocus={() => setIsOpen(true)}
          placeholder="12:00 am"
          className="w-full bg-transparent text-xs font-medium text-foreground outline-none tracking-wide"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5"
          title="Toggle Time Picker"
        >
          <Clock className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3-Column Dropdown Picker matching GreenWay Design */}
      {isOpen && (
        <div
          className="absolute bottom-[44px] right-0 z-[80] w-[210px] rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 select-none"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* Header Row */}
          <div className="grid grid-cols-3 border-b border-border/70 bg-muted/40 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
              <div className="space-y-0.5">
                {HOURS.map((h) => {
                  const isSelected = parsed.hour12 === h;
                  return (
                    <button
                      key={h}
                      ref={isSelected ? selectedHourRef : undefined}
                      type="button"
                      onClick={() => handleHourChange(h)}
                      className={cn(
                        "w-full h-7 flex items-center justify-center text-xs font-semibold rounded-md transition-colors cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground",
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
              <div className="space-y-0.5">
                {MINUTES.map((m) => {
                  const isSelected = parsed.minute === m;
                  return (
                    <button
                      key={m}
                      ref={isSelected ? selectedMinuteRef : undefined}
                      type="button"
                      onClick={() => handleMinuteChange(m)}
                      className={cn(
                        "w-full h-7 flex items-center justify-center text-xs font-semibold rounded-md transition-colors cursor-pointer",
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-2xs"
                          : "text-foreground/80 hover:bg-muted hover:text-foreground",
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
                    onClick={() => handlePeriodChange(p)}
                    className={cn(
                      "w-full h-7 flex items-center justify-center text-xs font-semibold rounded-md transition-colors cursor-pointer uppercase",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-foreground/80 hover:bg-muted hover:text-foreground",
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
              className="text-[11px] font-semibold text-primary hover:text-emerald-500 transition-colors cursor-pointer"
            >
              Now
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-0.5 rounded-md hover:bg-muted"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
