export type AdminRole = "Super Admin" | "Operations Admin" | "Content Admin" | "Reports Admin";

export interface AdminAccount {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: AdminRole;
  lastLogin: string;
  status: "Active" | "Deactivated";
  isSelf: boolean;
}

export const roleDescriptions: Record<AdminRole, string> = {
  "Super Admin": "Full access to all modules including Admin Account Manager",
  "Operations Admin": "Truck Tracking, Route Manager, Collection Schedule, Waste Reports, Barangay Manager, Driver Manager, Messages",
  "Content Admin": "Posts, Announcements, Landing Page Manager, Messages",
  "Reports Admin": "Waste Reports, Analytics Dashboard, Audit Logs",
};

export const roleColors: Record<AdminRole, { bg: string; text: string; border: string }> = {
  "Super Admin": { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
  "Operations Admin": { bg: "bg-[hsl(var(--leaf))]/10", text: "text-[hsl(var(--leaf))]", border: "border-[hsl(var(--leaf))]/20" },
  "Content Admin": { bg: "bg-[hsl(var(--earth))]/60", text: "text-[hsl(var(--earth-dark))]", border: "border-[hsl(var(--earth-dark))]/20" },
  "Reports Admin": { bg: "bg-muted", text: "text-muted-foreground", border: "border-muted" },
};

export const mockAdmins: AdminAccount[] = [
  {
    id: "adm-1", fullName: "Engr. Ricardo Mendoza", username: "r.mendoza",
    email: "r.mendoza@candelaria.gov.ph", role: "Super Admin",
    lastLogin: "Dec 28, 2025", status: "Active", isSelf: true,
  },
  {
    id: "adm-2", fullName: "Maria Santos", username: "m.santos",
    email: "m.santos@candelaria.gov.ph", role: "Operations Admin",
    lastLogin: "Dec 27, 2025", status: "Active", isSelf: false,
  },
  {
    id: "adm-3", fullName: "Ana Reyes", username: "a.reyes",
    email: "a.reyes@candelaria.gov.ph", role: "Content Admin",
    lastLogin: "Dec 26, 2025", status: "Active", isSelf: false,
  },
  {
    id: "adm-4", fullName: "Pedro Bautista", username: "p.bautista",
    email: "p.bautista@candelaria.gov.ph", role: "Reports Admin",
    lastLogin: "Dec 20, 2025", status: "Active", isSelf: false,
  },
  {
    id: "adm-5", fullName: "Elena Cruz", username: "e.cruz",
    email: "e.cruz@candelaria.gov.ph", role: "Operations Admin",
    lastLogin: "Nov 10, 2025", status: "Deactivated", isSelf: false,
  },
];
