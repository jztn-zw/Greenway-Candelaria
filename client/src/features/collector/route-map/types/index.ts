export type StopStatus = "done" | "in-progress" | "not-yet" | "skipped";

export interface RouteStop {
  id: string;
  barangayId?: string;
  stopNumber: number;
  barangay: string;
  status: StopStatus;
  completedAt?: string;
  skippedReason?: string;
  coords: [number, number];
  hasCoordinates?: boolean;
  coveragePath: [number, number][] | null;
  distanceKm: number;
}

export interface RouteInfo {
  pausedAt: Date | null;
  totalPausedSeconds: number;
  /** Backend route ID — used for all route mutations */
  routeId: string;
  templateRouteId?: string | null;
  /** Truck ID — used for GPS pinging */
  truckId: string;
  routeName: string;
  wasteType: "Biodegradable" | "Non-Biodegradable";
  totalStops: number;
  startedAt: Date;
  collectionStartedAt: Date | null;
  routeStatus: "SCHEDULED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "PARTIAL" | "CANCELLED";
}

export type SkipReason =
  | "Inaccessible Road"
  | "No Residents Present"
  | "Truck Issue"
  | "Weather Condition"
  | "Other";
