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
  twoFactorEnabled: boolean;
  reports: ResidentReport[];
}

export interface ResidentReport {
  referenceNumber: string;
  violationType: string;
  dateSubmitted: string;
  status: "Pending" | "Under Review" | "Resolved" | "Dismissed";
}

const barangays = [
  "Masin Norte", "Masin Sur", "Poblacion", "Bukal Norte", "Bukal Sur",
  "Malabanban Norte", "Malabanban Sur", "Pahinga Norte", "Pahinga Sur",
  "San Andres", "Kinatihan I", "Kinatihan II", "Mangilag Norte", "Mangilag Sur",
];

const violationTypes = [
  "Illegal Dumping", "Missed Collection", "Overflowing Bin",
  "Improper Segregation", "Blocked Access", "Hazardous Waste",
];

const reportStatuses: ResidentReport["status"][] = ["Pending", "Under Review", "Resolved", "Dismissed"];

const firstNames = [
  "Maria", "Juan", "Ana", "Pedro", "Rosa", "Jose", "Elena", "Carlos",
  "Lorna", "Ramon", "Gloria", "Ricardo", "Luz", "Fernando", "Teresa",
  "Miguel", "Carmen", "Roberto", "Dolores", "Antonio", "Patricia",
  "Eduardo", "Cristina", "Manuel", "Isabela", "Francisco", "Juana",
  "Rafael", "Mercedes", "Alejandro",
];

const lastNames = [
  "Santos", "Reyes", "Cruz", "Bautista", "Del Rosario", "Gonzales",
  "Ramos", "Aquino", "Garcia", "Mendoza", "Torres", "Villanueva",
  "Flores", "De Leon", "Castillo", "Rivera", "Navarro", "Diaz",
  "Santiago", "Hernandez", "Lopez", "Martinez", "Perez", "Jimenez",
  "Morales", "Ortega", "Guerrero", "Romero", "Aguilar", "Salazar",
];

function randomDate(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const d = new Date(s + Math.random() * (e - s));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function generateReports(count: number): ResidentReport[] {
  return Array.from({ length: count }, (_, i) => ({
    referenceNumber: `RPT-${2025}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`,
    violationType: violationTypes[Math.floor(Math.random() * violationTypes.length)],
    dateSubmitted: randomDate("2024-06-01", "2025-12-31"),
    status: reportStatuses[Math.floor(Math.random() * reportStatuses.length)],
  }));
}

export const mockResidents: Resident[] = Array.from({ length: 48 }, (_, i) => {
  const first = firstNames[i % firstNames.length];
  const last = lastNames[i % lastNames.length];
  const fullName = `${first} ${last}`;
  const username = `${first.toLowerCase()}.${last.toLowerCase().replace(/ /g, "")}${i}`;
  return {
    id: `res-${i + 1}`,
    fullName,
    username,
    email: `${username}@gmail.com`,
    phone: `+63 9${Math.floor(100000000 + Math.random() * 900000000)}`,
    barangay: barangays[Math.floor(Math.random() * barangays.length)],
    dateRegistered: randomDate("2023-01-01", "2025-06-01"),
    lastLogin: randomDate("2025-01-01", "2025-12-28"),
    status: Math.random() > 0.12 ? "Active" : "Deactivated",
    twoFactorEnabled: Math.random() > 0.6,
    reports: generateReports(Math.floor(Math.random() * 6)),
  };
});

export const barangayList = barangays;
