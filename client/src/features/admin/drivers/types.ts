import { getStatusBadgeStyle } from "@/components/ui/badgeStyles";
export interface DriverActivity {
  date: string;
  route: string;
  status: "Completed" | "Partial";
  completedStops: number;
  totalStops: number;
  startTime: string;
  endTime: string;
}

export interface Driver {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  contactNumber: string;
  truckId: string | null;
  status: "Active" | "Deactivated";
  lastLogin: string;
  dateAdded: string;
  activityLog: DriverActivity[];
}

export type TruckOperationalStatus = "Active" | "Under Maintenance";

export interface Truck {
  id: string;
  name: string;
  model: string;
  plateNumber: string;
  assignedDriverId: string | null;
  status: TruckOperationalStatus;
  liveStatus?: "OFFLINE" | "SCHEDULED" | "ON_THE_WAY" | "DONE";
  dateAdded: string;
}

export const driverStatusStyles: Record<Driver["status"], string> = {
  Active:
    getStatusBadgeStyle("Active").className,
  Deactivated:
    getStatusBadgeStyle("Deactivated").className,
};

export const truckStatusStyles: Record<TruckOperationalStatus, string> = {
  Active:
    getStatusBadgeStyle("Active").className,
  "Under Maintenance":
    getStatusBadgeStyle("Under Maintenance").className,
};
