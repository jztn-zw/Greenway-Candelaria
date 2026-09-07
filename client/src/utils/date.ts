export interface RelativeTimeOptions {
  emptyLabel?: string;
  dateOptions?: Intl.DateTimeFormatOptions;
}

/** Formats an API timestamp using GreenWay's existing compact relative-time labels. */
export const formatRelativeTime = (
  value: string | null | undefined,
  {
    emptyLabel = "",
    dateOptions = { month: "short", day: "numeric" },
  }: RelativeTimeOptions = {},
): string => {
  if (!value) return emptyLabel || "";

  // API database timestamps are UTC DATETIME values without a timezone suffix.
  // Treat them as UTC so relative labels (for example, "8h ago") are correct.
  const normalizedValue = value.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(value)
    ? value
    : /^\d{4}-\d{2}-\d{2}/.test(value)
      ? `${value.replace(" ", "T")}Z`
      : value;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) return value;

  const differenceInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (differenceInSeconds < 60) return "Just now";
  if (differenceInSeconds < 3600) return `${Math.floor(differenceInSeconds / 60)}m ago`;
  if (differenceInSeconds < 86400) return `${Math.floor(differenceInSeconds / 3600)}h ago`;
  if (differenceInSeconds < 604800) return `${Math.floor(differenceInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", dateOptions);
};
