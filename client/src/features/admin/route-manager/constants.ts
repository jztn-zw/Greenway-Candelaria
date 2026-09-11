import type { Day, RouteForm } from "./hooks/useRoutes";

export const DAYS: Day[] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export const WASTE_MAP: Record<
  Day,
  { type: "biodegradable" | "non-biodegradable"; label: string; local: string }
> = {
  Monday: { type: "biodegradable", label: "Biodegradable", local: "Nabubulok" },
  Tuesday: { type: "non-biodegradable", label: "Non-Biodegradable", local: "Di-Nabubulok" },
  Wednesday: { type: "biodegradable", label: "Biodegradable", local: "Nabubulok" },
  Thursday: { type: "non-biodegradable", label: "Non-Biodegradable", local: "Di-Nabubulok" },
  Friday: { type: "biodegradable", label: "Biodegradable", local: "Nabubulok" },
  Saturday: { type: "non-biodegradable", label: "Non-Biodegradable", local: "Di-Nabubulok" },
  Sunday: { type: "biodegradable", label: "Biodegradable", local: "Nabubulok" },
};

export const DEFAULT_FORM: RouteForm = {
  day: "Monday",
  truckId: "",
  driverId: "",
  startTime: "06:00",
  barangays: [],
};

export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return "";
  if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
    return timeStr;
  }
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2);
  if (isNaN(hours)) return timeStr;
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${minutes} ${period}`;
}

