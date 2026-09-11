export interface ResidentReport {
  referenceNumber: string;
  violationType: string;
  dateSubmitted: string;
  status: "Pending" | "Under Review" | "Resolved" | "Dismissed";
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
  status: "Active" | "Deactivated";
  reports: ResidentReport[];
}
