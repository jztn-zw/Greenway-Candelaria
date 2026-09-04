export type ShiftStatus = "off-duty" | "on-route" | "completed";
export type RouteState = "unassigned" | "assigned" | "in-progress" | "not-started" | "completed" | "no-schedule";

export interface AssignmentData {
  routeName: string;
  truckName: string;
  plateNumber: string;
  totalStops: number;
  completedStops: number;
  skippedStops: number;
  estimatedStart: string;
  wasteType: string;
  wasteColor?: string;
  routeState: RouteState;
  timeElapsedMinutes: number;
}
