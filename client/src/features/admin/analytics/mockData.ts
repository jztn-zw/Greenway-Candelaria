// ── Collection Performance ──
export const dailyCollectionRate = [
  { date: "Mar 1", rate: 82 }, { date: "Mar 2", rate: 78 }, { date: "Mar 3", rate: 90 },
  { date: "Mar 4", rate: 85 }, { date: "Mar 5", rate: 88 }, { date: "Mar 6", rate: 72 },
  { date: "Mar 7", rate: 45 }, { date: "Mar 8", rate: 80 }, { date: "Mar 9", rate: 76 },
  { date: "Mar 10", rate: 92 }, { date: "Mar 11", rate: 87 }, { date: "Mar 12", rate: 91 },
  { date: "Mar 13", rate: 68 }, { date: "Mar 14", rate: 42 }, { date: "Mar 15", rate: 83 },
  { date: "Mar 16", rate: 79 }, { date: "Mar 17", rate: 94 }, { date: "Mar 18", rate: 88 },
  { date: "Mar 19", rate: 86 }, { date: "Mar 20", rate: 70 }, { date: "Mar 21", rate: 38 },
  { date: "Mar 22", rate: 81 }, { date: "Mar 23", rate: 77 }, { date: "Mar 24", rate: 93 },
  { date: "Mar 25", rate: 89 }, { date: "Mar 26", rate: 85 }, { date: "Mar 27", rate: 74 },
  { date: "Mar 28", rate: 40 }, { date: "Mar 29", rate: 84 }, { date: "Mar 30", rate: 88 },
];

export const missedCollectionsWeekly = [
  { week: "W1", missed: 4 }, { week: "W2", missed: 2 }, { week: "W3", missed: 6 },
  { week: "W4", missed: 3 }, { week: "W5", missed: 5 }, { week: "W6", missed: 1 },
  { week: "W7", missed: 4 }, { week: "W8", missed: 7 }, { week: "W9", missed: 2 },
  { week: "W10", missed: 3 }, { week: "W11", missed: 5 }, { week: "W12", missed: 2 },
];

export const wasteTypeBreakdown = [
  { name: "Biodegradable", value: 58, fill: "hsl(145, 63%, 32%)" },
  { name: "Non-Biodegradable", value: 42, fill: "hsl(210, 60%, 50%)" },
];

export const heatmapData = (() => {
  const days = [];
  for (let i = 1; i <= 31; i++) {
    const rate = Math.floor(Math.random() * 60) + 40;
    days.push({ day: i, rate, month: "Mar" });
  }
  return days;
})();

// ── Barangay Compliance ──
export const barangayCompliance = [
  { name: "Malabanban Norte", rate: 96 }, { name: "Poblacion", rate: 94 },
  { name: "Mangilag Norte", rate: 93 }, { name: "San Juan", rate: 91 },
  { name: "Bukal Norte", rate: 90 }, { name: "Pahinga Norte", rate: 89 },
  { name: "Masin Norte", rate: 88 }, { name: "Malabanban Sur", rate: 87 },
  { name: "Taguan", rate: 86 }, { name: "Mangilag Sur", rate: 85 },
  { name: "Kinatihan", rate: 83 }, { name: "Bukal Sur", rate: 82 },
  { name: "Masin Sur", rate: 80 }, { name: "Mayabobo", rate: 79 },
  { name: "San Andres", rate: 78 }, { name: "Pahinga Sur", rate: 76 },
  { name: "Sta. Catalina", rate: 75 }, { name: "Conception", rate: 73 },
  { name: "Lanatan", rate: 71 }, { name: "Malabon", rate: 69 },
  { name: "Bagong Silang", rate: 67 }, { name: "Tamlong", rate: 64 },
  { name: "Mangayao", rate: 61 }, { name: "Buenavista", rate: 58 },
  { name: "Dewey", rate: 52 },
];

export const barangayTrend = [
  { month: "Oct", "Malabanban Norte": 90, Poblacion: 88, Dewey: 60, Buenavista: 55 },
  { month: "Nov", "Malabanban Norte": 92, Poblacion: 90, Dewey: 58, Buenavista: 56 },
  { month: "Dec", "Malabanban Norte": 93, Poblacion: 91, Dewey: 55, Buenavista: 54 },
  { month: "Jan", "Malabanban Norte": 94, Poblacion: 93, Dewey: 53, Buenavista: 57 },
  { month: "Feb", "Malabanban Norte": 95, Poblacion: 93, Dewey: 51, Buenavista: 56 },
  { month: "Mar", "Malabanban Norte": 96, Poblacion: 94, Dewey: 52, Buenavista: 58 },
];

// ── Waste Reports Analysis ──
export const reportsPerWeek = [
  { week: "W1", reports: 18 }, { week: "W2", reports: 22 }, { week: "W3", reports: 15 },
  { week: "W4", reports: 28 }, { week: "W5", reports: 20 }, { week: "W6", reports: 35 },
  { week: "W7", reports: 24 }, { week: "W8", reports: 19 }, { week: "W9", reports: 31 },
  { week: "W10", reports: 26 }, { week: "W11", reports: 22 }, { week: "W12", reports: 17 },
];

export const reportStatusBreakdown = [
  { name: "Submitted", value: 14, fill: "hsl(35, 90%, 55%)" },
  { name: "Under Review", value: 8, fill: "hsl(210, 70%, 55%)" },
  { name: "Dispatched", value: 5, fill: "hsl(270, 50%, 55%)" },
  { name: "Resolved", value: 42, fill: "hsl(145, 63%, 32%)" },
];

export const resolutionTimeMonthly = [
  { month: "Oct", days: 4.2 }, { month: "Nov", days: 3.8 }, { month: "Dec", days: 5.1 },
  { month: "Jan", days: 3.5 }, { month: "Feb", days: 3.2 }, { month: "Mar", days: 2.9 },
];

export const violationTypes = [
  { type: "Illegal Dumping", count: 34 },
  { type: "Missed Collection", count: 28 },
  { type: "Overflowing Bin", count: 22 },
  { type: "Improper Segregation", count: 18 },
  { type: "Open Burning", count: 12 },
  { type: "Littering", count: 9 },
  { type: "Other", count: 6 },
];

export const reportsByBarangay = [
  { name: "Dewey", reports: 18 }, { name: "Buenavista", reports: 15 },
  { name: "Tamlong", reports: 12 }, { name: "Mangayao", reports: 11 },
  { name: "Bagong Silang", reports: 9 }, { name: "Malabon", reports: 8 },
  { name: "Lanatan", reports: 7 }, { name: "Conception", reports: 6 },
  { name: "Sta. Catalina", reports: 5 }, { name: "Pahinga Sur", reports: 4 },
];

// ── Resident Engagement ──
export const registrationGrowth = [
  { month: "Oct", registrations: 45 }, { month: "Nov", registrations: 62 },
  { month: "Dec", registrations: 38 }, { month: "Jan", registrations: 71 },
  { month: "Feb", registrations: 58 }, { month: "Mar", registrations: 84 },
];

export const residentActivity = { active: 876, inactive: 358, total: 1234 };
export const reportsPerResident = 2.4;

// ── Truck & Driver Performance ──
export const truckUtilization = [
  { truck: "Truck 1", active: 22, idle: 4 },
  { truck: "Truck 2", active: 19, idle: 7 },
];

export const avgBarangaysPerTrip = [
  { truck: "Truck 1", avg: 6.2 },
  { truck: "Truck 2", avg: 5.8 },
];

export const driverComparison = [
  { name: "Juan Dela Cruz", truck: "Truck 1", routesCompleted: 22, avgBarangays: 6.2, onTimeRate: 91 },
  { name: "Pedro Santos", truck: "Truck 2", routesCompleted: 19, avgBarangays: 5.8, onTimeRate: 84 },
];
