export type TruckStatus = "scheduled" | "on-the-way" | "paused" | "done" | "offline";

export interface BarangayStop {
  name: string;
  state: "done" | "in-progress" | "not-started" | "skipped";
  completedAt?: string; // time string e.g. "8:15 AM"
  skippedReason?: string;
  coords?: [number, number];
}

export interface DriverMessage {
  id: string;
  text: string;
  timestamp: string; // ISO string or display string
  sender?: "driver" | "admin";
  senderName?: string;
  senderRole?: string;
  isRead?: boolean;
}

export interface AdminTruck {
  id: string;
  driverId: string | null;
  routeId: string | null;
  driverUserId: string | null;
  name: string;
  plateNumber: string;
  status: TruckStatus;
  wasteType: string;
  driver: string;
  currentBarangay: string;
  completedBarangays: number;
  totalBarangays: number;
  coords: [number, number] | null;
  lastGpsUpdate: string;
  /** Raw ISO timestamp from the last GPS ping â€” used to recompute elapsed labels */
  lastPingIso: string | null;
  driverMessages: DriverMessage[];
  barangaysAway: number | null;
  route: BarangayStop[];
}

export interface MissedCollectionEntry {
  id: string;
  date: string;
  barangay: string;
  truck: string;
  driver: string;
  residentReportLink?: string;
}

export interface RouteReplayPoint {
  coords: [number, number];
  barangay: string;
  arrivedAt: string;
}
