import type { Truck, CollectionSchedule, CollectionHistoryEntry, RouteStopInfo } from "./types";

const truck1Route: RouteStopInfo[] = [
  { barangay: "Malabanban Norte", status: "done", completedAt: "6:15 AM" },
  { barangay: "Malabanban Sur", status: "done", completedAt: "6:32 AM" },
  { barangay: "Mangilag Norte", status: "skipped", skippedReason: "Road blocked" },
  { barangay: "Mangilag Sur", status: "in-progress" },
  { barangay: "Buenavista East", status: "not-started" },
  { barangay: "Buenavista West", status: "not-started" },
  { barangay: "Pahinga Norte", status: "not-started" },
  { barangay: "Pahinga Sur", status: "not-started" },
];

export const RESIDENT_BARANGAY: [number, number] = [14.0424, 121.4234];
export const RESIDENT_AREA = "Buenavista East";

export const mockTrucks: Truck[] = [
  {
    id: "truck-1",
    name: "Truck 1",
    plateNumber: "ABC-1234",
    status: "on-the-way",
    wasteType: "Biodegradable",
    driver: "Juan Dela Cruz",
    assignedArea: "Buenavista East",
    completedBarangays: 2,
    totalBarangays: 8,
    coords: [14.0450, 121.4200] as [number, number],
    eta: 12,
    driverMessage: "Heavy traffic at Mangilag area",
    isResidentTruck: true,
    barangaysAway: null,
    routeStops: truck1Route,
  },
  {
    id: "truck-3",
    name: "Truck 3",
    plateNumber: "XYZ-5678",
    status: "offline",
    wasteType: "",
    driver: "",
    assignedArea: "",
    completedBarangays: 0,
    totalBarangays: 0,
    coords: null,
    eta: null,
    driverMessage: null,
    isResidentTruck: false,
    barangaysAway: null,
    routeStops: [],
  },
];

export const mockSchedule: CollectionSchedule = {
  nextCollectionDay: "tomorrow",
  nextCollectionTime: "8:00 AM",
  nextCollectionDate: new Date(Date.now() + 86400000),
  wasteType: "Biodegradable",
};

export const mockCollectionHistory: CollectionHistoryEntry[] = [
  { date: "March 28, 2026", wasteType: "Non-Biodegradable", status: "completed" },
  { date: "March 25, 2026", wasteType: "Biodegradable", status: "completed" },
  { date: "March 22, 2026", wasteType: "Non-Biodegradable", status: "missed" },
  { date: "March 19, 2026", wasteType: "Biodegradable", status: "completed" },
  { date: "March 16, 2026", wasteType: "Non-Biodegradable", status: "completed" },
];
