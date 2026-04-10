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
  distanceKm: number;
}

export interface RouteInfo {
  /** Backend route ID — used for all route mutations */
  routeId: string;
  /** Truck ID — used for GPS pinging */
  truckId: string;
  routeName: string;
  wasteType: "Biodegradable" | "Non-Biodegradable";
  totalStops: number;
  startedAt: Date;
}

export type SkipReason =
  | "Inaccessible Road"
  | "No Residents Present"
  | "Truck Issue"
  | "Weather Condition"
  | "Other";
