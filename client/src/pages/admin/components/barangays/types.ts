export type ZoneType = string;

export interface BarangayRoute {
  routeName: string;
  truckName: string;
  driverName: string;
  days: string[];
}

export interface BarangayReport {
  referenceNumber: string;
  violationType: string;
  status: string;
  date: string;
}

export interface Barangay {
  id: string;
  name: string;
  zone: ZoneType;
  status: "Active" | "Inactive";
  isPriority: boolean;
  residentCount: number;
  activeRoutes: number;
  totalReports: number;
  resolvedReports: number;
  pendingReports: number;
  collectionCompletionRate: number;
  notes: string;
  assignedRoutes: BarangayRoute[];
  recentReports: BarangayReport[];
  wasteSchedule: { day: string; wasteType: string }[];
}
