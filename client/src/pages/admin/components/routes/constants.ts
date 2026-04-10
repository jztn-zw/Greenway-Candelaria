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
