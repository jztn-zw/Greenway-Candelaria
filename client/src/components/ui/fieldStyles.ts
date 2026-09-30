/** Shared web field tokens. Modules may choose a size without redefining states. */
export const fieldStyles = {
  surface: "gw-field rounded-[10px] border border-input/80 bg-background text-foreground shadow-2xs transition-colors duration-150",
  standard: "h-10 px-3.5 py-2 text-sm",
  compact: "h-9 px-3 py-2 text-[13px]",
  placeholder: "placeholder:text-muted-foreground/70",
} as const;

export type FieldSize = "standard" | "compact";
