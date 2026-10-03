import { residentPageStyles } from "@/components/common/residentPageStyles";
import "./report.css";

export const reportStyles = {
  page: `${residentPageStyles.page} resident-report max-w-[960px]`,
  form: "resident-report-form min-w-0 divide-y divide-border/60 rounded-2xl border border-border/80 bg-card p-4",
  section: "min-w-0 py-5 first:pt-0 last:pb-0",
  categories: "resident-report-categories grid min-w-0 gap-2",
  category: "resident-report-category group relative flex min-w-0 items-center gap-2 rounded-xl border p-3 text-left transition-colors duration-150 cursor-pointer select-none touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  location: "resident-report-location grid min-w-0 gap-3",
  photos: "resident-report-photos grid min-w-0 gap-2 pt-0.5",
  review: "resident-report-review grid grid-cols-3 gap-2",
  footer: "resident-report-footer flex min-w-0 flex-wrap items-center justify-end gap-3 pt-4",
  submit: "resident-report-submit h-10 max-w-full gap-1.5 px-4 text-xs [&_svg]:size-3.5",
} as const;
