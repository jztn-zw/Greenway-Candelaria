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
