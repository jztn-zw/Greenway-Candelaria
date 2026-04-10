export type ShiftStatus = "off-duty" | "on-route" | "completed";
export type TruckCondition = "good" | "needs-inspection" | "issue-reported";
export type RouteState = "unassigned" | "assigned" | "in-progress" | "completed" | "no-schedule";

export interface AssignmentData {
  routeName: string;
  truckName: string;
  plateNumber: string;
  totalStops: number;
  completedStops: number;
  skippedStops: number;
  estimatedStart: string;
  wasteType: string;
  wasteColor: string;
  routeState: RouteState;
  timeElapsedMinutes: number;
}

export interface TruckStatusData {
  name: string;
  plateNumber: string;
  condition: TruckCondition;
  lastInspection: string;
}

export interface AdminMessage {
  id: string;
  preview: string;
  time: string;
}

export const mockAssignment: AssignmentData = {
  routeName: "Route B-7 · Barangay Loop South",
  truckName: "GreenWay Hauler 03",
  plateNumber: "NCR-8821",
  totalStops: 12,
  completedStops: 5,
  skippedStops: 1,
  estimatedStart: "6:00 AM",
  wasteType: "Biodegradable",
  wasteColor: "primary",
  routeState: "in-progress",
  timeElapsedMinutes: 83,
};

export const mockTruckStatus: TruckStatusData = {
  name: "GreenWay Hauler 03",
  plateNumber: "NCR-8821",
  condition: "good",
  lastInspection: "March 28, 2026",
};

export const mockAdminMessages: AdminMessage[] = [
  { id: "1", preview: "Please prioritize Brgy. Masin Sur today — residents reported missed pickup last week.", time: "10 minutes ago" },
  { id: "2", preview: "Truck inspection scheduled for Friday. Please confirm availability.", time: "Yesterday" },
];

export const mockSkippedYesterday = 2;
export const mockCompletionRate = 92;
export const mockNextCollection = { day: "Thursday", wasteType: "Non-Biodegradable" };
