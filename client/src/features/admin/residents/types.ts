export interface ResidentReport {
  referenceNumber: string;
  violationType: string;
  dateSubmitted: string;
  status: "Submitted" | "Under Review" | "Dispatched" | "Resolved";
}

export interface Resident {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  barangay: string;
  dateRegistered: string;
  lastLogin: string;
  status: "Active" | "Deactivated" | "Banned";
  banReason?: string | null;
  reports: ResidentReport[];
}
