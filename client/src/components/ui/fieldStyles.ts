/** Shared web field tokens. Modules may choose a size without redefining states. */
export const fieldStyles = {
  surface: "gw-field rounded-lg border border-input/80 bg-field text-foreground shadow-none transition-colors duration-150",
  standard: "h-10 px-3.5 py-2 text-ui-body",
  compact: "h-9 px-3 py-2 text-ui-label",
  placeholder: "placeholder:text-field-placeholder",
} as const;

export type FieldSize = "standard" | "compact";
