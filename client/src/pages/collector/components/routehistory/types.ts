export type RouteHistoryStatus = "completed" | "partial" | "no-collection";
export type WasteTypeFilter = "all" | "Biodegradable" | "Non-Biodegradable";
export type StatusFilter = "all" | "completed" | "partial" | "no-collection";
export type DatePreset = "this-week" | "this-month" | "last-month" | "custom";

export interface RouteHistoryStop {
  stopNumber: number;
  barangay: string;
  status: "done" | "skipped";
  time: string;
  skipReason?: string;
  residentsNotified?: number;
}

export interface AdminMessageEntry {
  message: string;
  time: string;
}

export interface RouteHistoryEntry {
  id: string;
  date: string;
  dayOfWeek: string;
  wasteType: "Biodegradable" | "Non-Biodegradable";
  routeName: string;
  completedStops: number;
  totalStops: number;
  completionPct: number;
  status: RouteHistoryStatus;
  timeOnRoute: string;
  stops: RouteHistoryStop[];
  adminMessages: AdminMessageEntry[];
}

export interface PerformancePoint {
  date: string;
  pct: number;
}
