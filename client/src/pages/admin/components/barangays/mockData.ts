import { Barangay, ZoneType } from "./types";

const zones: ZoneType[] = ["Urban", "Coastal", "East", "West", "Highland"];

const barangayNames = [
  "Malabanban Norte", "Malabanban Sur", "Mangilag Norte", "Mangilag Sur",
  "Masalukot I", "Masalukot II", "Masalukot III", "Masalukot IV", "Masalukot V",
  "Pahinga Norte", "Pahinga Sur", "San Andres", "San Isidro", "San Juan",
  "Santa Catalina Norte", "Santa Catalina Sur", "Poblacion", "Bukal Norte",
  "Bukal Sur", "Kinatihan I", "Kinatihan II", "Masin Norte", "Masin Sur",
  "Mayabobo", "Mandasig"
];

const violationTypes = ["Illegal Dumping", "Overflowing Bin", "Missed Collection", "Improper Segregation", "Open Burning"];
const reportStatuses = ["Submitted", "Under Review", "Dispatched", "Resolved"];
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const wasteTypes = ["Biodegradable", "Non-Biodegradable", "Recyclable", "Residual", "Special Waste"];

export const mockBarangays: Barangay[] = barangayNames.map((name, i) => {
  const zone = zones[i % zones.length];
  const residentCount = 80 + Math.floor(Math.random() * 320);
  const totalReports = 5 + Math.floor(Math.random() * 40);
  const resolvedReports = Math.floor(totalReports * (0.5 + Math.random() * 0.4));
  const pendingReports = totalReports - resolvedReports;
  const completionRate = 60 + Math.floor(Math.random() * 38);

  return {
    id: `brgy-${i + 1}`,
    name,
    zone,
    status: Math.random() > 0.1 ? "Active" : "Inactive",
    isPriority: Math.random() > 0.75,
    residentCount,
    activeRoutes: 1 + Math.floor(Math.random() * 3),
    totalReports,
    resolvedReports,
    pendingReports,
    collectionCompletionRate: completionRate,
    notes: i % 4 === 0 ? "Flood-prone area during rainy season. Extra coordination needed." : "",
    assignedRoutes: [
      {
        routeName: `Route ${String.fromCharCode(65 + (i % 8))}`,
        truckName: `Truck ${(i % 2) + 1}`,
        driverName: i % 2 === 0 ? "Juan Reyes" : "Pedro Santos",
        days: [days[i % 6], days[(i + 2) % 6]],
      },
    ],
    recentReports: Array.from({ length: Math.min(5, totalReports) }, (_, j) => ({
      referenceNumber: `WR-${2025}-${String(i * 10 + j + 1).padStart(4, "0")}`,
      violationType: violationTypes[j % violationTypes.length],
      status: reportStatuses[j % reportStatuses.length],
      date: `2025-03-${String(15 + j).padStart(2, "0")}`,
    })),
    wasteSchedule: [
      { day: days[i % 6], wasteType: wasteTypes[0] },
      { day: days[(i + 2) % 6], wasteType: wasteTypes[1] },
      { day: days[(i + 4) % 6], wasteType: wasteTypes[2] },
    ],
  };
});

export const zoneList: ZoneType[] = ["Urban", "Coastal", "East", "West", "Highland"];
