export const trackingStopPresentation = {
  "in-progress": { label: "Current", color: "hsl(var(--highlight))" },
  done: { label: "Completed", color: "hsl(var(--success-700))" },
  "not-started": { label: "Upcoming", color: "hsl(var(--neutral-400))" },
  skipped: { label: "Skipped", color: "hsl(var(--warning))" },
} as const;
