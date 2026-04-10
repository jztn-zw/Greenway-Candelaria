import type { Driver, DriverActivity, Truck } from "./types";

const routes = ["Route A – North", "Route B – South", "Route C – East"];
const messages = [
  "Starting collection", "Heavy traffic at Poblacion", "Skipped — road blocked",
  "Collection complete", "Truck full — heading to MRF", "Back on route",
  "Delayed — mechanical issue", "Resuming schedule",
];

function randomTime(base: number): string {
  const h = base + Math.floor(Math.random() * 2);
  const m = Math.floor(Math.random() * 60);
  return `${h}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function generateActivity(count: number): DriverActivity[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(2025, 5, 28 - i);
    const total = 6 + Math.floor(Math.random() * 4);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      route: routes[Math.floor(Math.random() * routes.length)],
      barangaysCompleted: Math.floor(Math.random() * (total + 1)),
      barangaysTotal: total,
      startTime: randomTime(5),
      endTime: randomTime(11),
      statusMessages: Array.from(
        { length: 1 + Math.floor(Math.random() * 3) },
        () => messages[Math.floor(Math.random() * messages.length)]
      ),
    };
  });
}

export const mockTrucks: Truck[] = [
  {
    id: "trk-1",
    name: "Truck 1",
    model: "Isuzu Forward",
    plateNumber: "ABC-1234",
    assignedDriverId: "drv-1",
    wasteType: "Biodegradable",
    status: "Active",
    dateAdded: "Jan 10, 2025",
  },
  {
    id: "trk-2",
    name: "Truck 2",
    model: "Hino Dutro",
    plateNumber: "XYZ-5678",
    assignedDriverId: "drv-2",
    wasteType: "Non-Biodegradable",
    status: "Active",
    dateAdded: "Feb 5, 2025",
  },
  {
    id: "trk-3",
    name: "Truck 3",
    model: "Mitsubishi Canter",
    plateNumber: "DEF-9012",
    assignedDriverId: null,
    wasteType: "Residual",
    status: "Under Maintenance",
    dateAdded: "Mar 20, 2025",
  },
  {
    id: "trk-4",
    name: "Truck 4",
    model: "Isuzu Elf",
    plateNumber: "GHI-3456",
    assignedDriverId: null,
    wasteType: "Biodegradable",
    status: "Active",
    dateAdded: "Apr 15, 2025",
  },
];

export const mockDrivers: Driver[] = [
  {
    id: "drv-1",
    userId: "usr-1",
    fullName: "Roberto Navarro",
    username: "r.navarro",
    email: "roberto.navarro@example.com",
    contactNumber: "+63 917 123 4567",
    licenseNumber: "N04-12-345678",
    truckId: "trk-1",
    status: "Active",
    lastLogin: "Dec 27, 2025",
    dateAdded: "Jan 10, 2025",
    activityLog: generateActivity(15),
  },
  {
    id: "drv-2",
    userId: "usr-2",
    fullName: "Eduardo Salazar",
    username: "e.salazar",
    email: "eduardo.salazar@example.com",
    contactNumber: "+63 918 987 6543",
    licenseNumber: "N05-14-876543",
    truckId: "trk-2",
    status: "Active",
    lastLogin: "Dec 28, 2025",
    dateAdded: "Feb 5, 2025",
    activityLog: generateActivity(12),
  },
  {
    id: "drv-3",
    userId: "usr-3",
    fullName: "Manuel Torres",
    username: "m.torres",
    email: "manuel.torres@example.com",
    contactNumber: "+63 919 555 8899",
    licenseNumber: "N03-11-112233",
    truckId: null,
    status: "Deactivated",
    lastLogin: "Nov 15, 2025",
    dateAdded: "Mar 1, 2025",
    activityLog: generateActivity(8),
  },
];
