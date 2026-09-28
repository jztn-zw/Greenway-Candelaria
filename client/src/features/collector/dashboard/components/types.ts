export type RouteState = "unassigned" | "in-progress" | "paused" | "not-started" | "completed" | "partial" | "no-collection" | "cancelled" | "no-schedule";

export interface AssignmentData {
  routeName: string;
  plateNumber?: string | null;
  totalStops: number;
  completedStops: number;
  skippedStops: number;
  remainingStops: number;
  completionPct: number;
  estimatedStart: string;
  wasteType: string;
  routeState: RouteState;
  statusLabel: string;
  durationLabel: string;
  nextStopName?: string;
  nextStopOrder?: number;
  upcomingStops: {
    id: string;
    name: string;
    order: number;
  }[];
}
