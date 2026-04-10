import type { RouteHistoryEntry, PerformancePoint } from "./types";

const makeStops = (completed: number, total: number, skipped: number) => {
  const stops = [];
  for (let i = 1; i <= total; i++) {
    if (i <= completed) {
      stops.push({
        stopNumber: i,
        barangay: `Brgy. Stop ${i}`,
        status: "done" as const,
        time: `${6 + Math.floor(i * 0.4)}:${String(Math.floor(Math.random() * 50) + 10).slice(0, 2)} AM`,
        residentsNotified: Math.floor(Math.random() * 30) + 15,
      });
    } else if (i <= completed + skipped) {
      stops.push({
        stopNumber: i,
        barangay: `Brgy. Stop ${i}`,
        status: "skipped" as const,
        time: `${6 + Math.floor(i * 0.4)}:${String(Math.floor(Math.random() * 50) + 10).slice(0, 2)} AM`,
        skipReason: ["Inaccessible Road", "No Residents Present", "Truck Issue", "Weather Condition"][Math.floor(Math.random() * 4)],
      });
    } else {
      stops.push({
        stopNumber: i,
        barangay: `Brgy. Stop ${i}`,
        status: "done" as const,
        time: `${6 + Math.floor(i * 0.4)}:${String(Math.floor(Math.random() * 50) + 10).slice(0, 2)} AM`,
        residentsNotified: Math.floor(Math.random() * 30) + 15,
      });
    }
  }
  return stops;
};

export const mockRouteHistory: RouteHistoryEntry[] = [
  // Week of Mar 24-28
  {
    id: "r1", date: "March 28, 2026", dayOfWeek: "Friday",
    wasteType: "Non-Biodegradable", routeName: "Route B-7 · Loop South",
    completedStops: 12, totalStops: 12, completionPct: 100, status: "completed",
    timeOnRoute: "3h 52m", stops: makeStops(12, 12, 0),
    adminMessages: [{ message: "Great work this week! Enjoy your weekend.", time: "10:30 AM" }],
  },
  {
    id: "r2", date: "March 27, 2026", dayOfWeek: "Thursday",
    wasteType: "Biodegradable", routeName: "Route B-7 · Loop South",
    completedStops: 11, totalStops: 12, completionPct: 92, status: "partial",
    timeOnRoute: "3h 28m", stops: makeStops(11, 12, 1),
    adminMessages: [],
  },
  {
    id: "r3", date: "March 26, 2026", dayOfWeek: "Wednesday",
    wasteType: "Non-Biodegradable", routeName: "Route B-7 · Loop South",
    completedStops: 12, totalStops: 12, completionPct: 100, status: "completed",
    timeOnRoute: "3h 45m", stops: makeStops(12, 12, 0),
    adminMessages: [{ message: "Skip Brgy. Mahal Na Pangalan — road flooded", time: "7:15 AM" }],
  },
  {
    id: "r4", date: "March 25, 2026", dayOfWeek: "Tuesday",
    wasteType: "Biodegradable", routeName: "Route B-7 · Loop South",
    completedStops: 10, totalStops: 12, completionPct: 83, status: "partial",
    timeOnRoute: "3h 10m", stops: makeStops(10, 12, 2),
    adminMessages: [],
  },
  {
    id: "r5", date: "March 24, 2026", dayOfWeek: "Monday",
    wasteType: "Non-Biodegradable", routeName: "Route B-7 · Loop South",
    completedStops: 12, totalStops: 12, completionPct: 100, status: "completed",
    timeOnRoute: "4h 05m", stops: makeStops(12, 12, 0),
    adminMessages: [],
  },
  // Week of Mar 17-21
  {
    id: "r6", date: "March 21, 2026", dayOfWeek: "Friday",
    wasteType: "Non-Biodegradable", routeName: "Route B-7 · Loop South",
    completedStops: 12, totalStops: 12, completionPct: 100, status: "completed",
    timeOnRoute: "3h 38m", stops: makeStops(12, 12, 0),
    adminMessages: [],
  },
  {
    id: "r7", date: "March 20, 2026", dayOfWeek: "Thursday",
    wasteType: "Biodegradable", routeName: "Route B-7 · Loop South",
    completedStops: 12, totalStops: 12, completionPct: 100, status: "completed",
    timeOnRoute: "3h 50m", stops: makeStops(12, 12, 0),
    adminMessages: [],
  },
  {
    id: "r8", date: "March 19, 2026", dayOfWeek: "Wednesday",
    wasteType: "Non-Biodegradable", routeName: "Route B-7 · Loop South",
    completedStops: 11, totalStops: 12, completionPct: 92, status: "partial",
    timeOnRoute: "3h 22m", stops: makeStops(11, 12, 1),
    adminMessages: [{ message: "Truck 03 inspection tomorrow at 8 AM", time: "2:00 PM" }],
  },
  {
    id: "r9", date: "March 18, 2026", dayOfWeek: "Tuesday",
    wasteType: "Biodegradable", routeName: "Route B-7 · Loop South",
    completedStops: 12, totalStops: 12, completionPct: 100, status: "completed",
    timeOnRoute: "3h 55m", stops: makeStops(12, 12, 0),
    adminMessages: [],
  },
  {
    id: "r10", date: "March 17, 2026", dayOfWeek: "Monday",
    wasteType: "Non-Biodegradable", routeName: "Route B-7 · Loop South",
    completedStops: 12, totalStops: 12, completionPct: 100, status: "completed",
    timeOnRoute: "4h 12m", stops: makeStops(12, 12, 0),
    adminMessages: [],
  },
];

export const mockPerformanceData: PerformancePoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return {
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    pct: Math.min(100, Math.max(75, 90 + Math.floor(Math.random() * 15) - 5)),
  };
});
