export type TruckStatus = "scheduled" | "on-the-way" | "done" | "offline";

export type RouteStopStatus = "done" | "in-progress" | "not-started" | "skipped";

export interface RouteStopInfo {
  barangay: string;
  status: RouteStopStatus;
  coords?: [number, number] | null;
  completedAt?: string;
  skippedReason?: string;
  isResidentBarangay?: boolean;
}

export interface Truck {
  id: string;
  name: string;
  plateNumber: string;
  status: TruckStatus;
  wasteType: string;
  driver: string;
  assignedArea: string;
  completedBarangays: number;
  totalBarangays: number;
  coords: [number, number] | null;
  eta: number | null; // minutes
  roadDistanceKm?: number | null;
  driverMessage: string | null;
  isResidentTruck: boolean;
  barangaysAway: number | null;
  routeStops: RouteStopInfo[];
  arrivedAtResident?: boolean; // truck is currently at resident's barangay
  residentStopStatus?: RouteStopStatus | null;
  residentStopCompletedAt?: string;
}

export interface CollectionSchedule {
  nextCollectionDay: string;
  nextCollectionTime: string;
  nextCollectionDate: Date;
  wasteType?: string;
}

export type CollectionDayStatus = "not-collection-day" | "scheduled-not-started" | "active" | "completed";

export interface CollectionHistoryEntry {
  date: string;
  wasteType: string;
  status: "completed" | "missed";
}
