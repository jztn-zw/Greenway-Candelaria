export interface ResidentReport {
  referenceNumber: string;
  violationType: string;
  dateSubmitted: string;
  status: "Submitted" | "Under Review" | "Dispatched" | "Resolved";
}

export interface Resident {
  profileCompleted?: boolean;
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  email: string | null;
  phone: string;
  barangay: string;
  street?: string | null;
  dateRegistered: string;
  lastLogin: string;
  status: "Active" | "Deactivated" | "Banned";
  banReason?: string | null;
  reports: ResidentReport[];
}
