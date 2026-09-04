export interface DriverActivity {
  date: string;
  route: string;
  barangaysCompleted: number;
  barangaysTotal: number;
  startTime: string;
  endTime: string;
  statusMessages: string[];
}

export interface Driver {
  id: string;
  userId: string;
  fullName: string;
  username: string;
  email: string;
  contactNumber: string;
  licenseNumber: string;
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
  wasteType: string;
  status: TruckOperationalStatus;
  liveStatus?: "OFFLINE" | "SCHEDULED" | "ON_THE_WAY" | "DONE";
  dateAdded: string;
}

export const driverStatusStyles: Record<Driver["status"], string> = {
  Active:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  Deactivated:
    "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export const truckStatusStyles: Record<TruckOperationalStatus, string> = {
  Active:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "Under Maintenance":
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
};
