import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Custom text sizes must merge as sizes, independently of text colors.
const mergeClasses = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [
        "ui-overline", "ui-caption", "ui-label", "ui-body", "ui-title", "ui-page", "ui-page-lg",
      ] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return mergeClasses(clsx(inputs));
}
