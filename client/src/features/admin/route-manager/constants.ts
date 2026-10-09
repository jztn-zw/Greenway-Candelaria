import type { Day,RouteForm } from "./hooks/useRoutes";
import { COLLECTION_WASTE_MAP } from "@/lib/collectionSchedule";

export const DAYS: Day[] = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export const WASTE_MAP = COLLECTION_WASTE_MAP;

export const DEFAULT_FORM: RouteForm = {
  day: "Monday",
  truckId: "",
  driverId: "",
  startTime: "06:00",
  selectedBarangayId: "",
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

