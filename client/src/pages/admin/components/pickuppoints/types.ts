export type PickupPointStatus = "verified" | "pending" | "rejected" | "deactivated";
export type PickupPointSource = "driver" | "resident" | "manual";

export interface PickupPoint {
  id: string;
  label: string;
  barangay: string;
  coords: [number, number];
  status: PickupPointStatus;
  source: PickupPointSource;
  submittedBy: string;
  submittedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  coverageRadius: number; // meters
  notes?: string;
  flagged: boolean;
  flagReason?: string;
}

export type PickupFilterTab = "all" | "pending" | "verified" | "flagged";
