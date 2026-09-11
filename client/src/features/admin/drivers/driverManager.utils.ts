import type {
  DriverActivityApiRow,
  DriverApiRow,
  TruckApiRow,
} from "@/services/driverManagerService";
import type { Driver, Truck as TruckType } from "./types";

const formatDriverDate = (value?: string) => {
  if (!value) return "-";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "-";
  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDriverDateTime = (value?: string | null) => {
  if (!value) return "-";

  const dateMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/,
  );
  const parsedDate = dateMatch
    ? new Date(
        Date.UTC(
          Number(dateMatch[1]),
          Number(dateMatch[2]) - 1,
          Number(dateMatch[3]),
          Number(dateMatch[4]),
          Number(dateMatch[5]),
          Number(dateMatch[6]),
          Number((dateMatch[7] ?? "0").padEnd(3, "0")),
        ),
      )
    : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return "-";
  return parsedDate.toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const toDriverStatus = (raw?: string): Driver["status"] =>
  String(raw || "").toUpperCase() === "ACTIVE" ? "Active" : "Deactivated";

const toTruckStatus = (raw?: string): TruckType["status"] =>
  String(raw || "").toUpperCase() === "ACTIVE" ? "Active" : "Under Maintenance";

export const toAvailabilityStatus = (
  status: TruckType["status"],
): "ACTIVE" | "UNDER_MAINTENANCE" =>
  status === "Active" ? "ACTIVE" : "UNDER_MAINTENANCE";

export const createTemporaryDriverPassword = () =>
  `GW-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const mapTruckRow = (row: TruckApiRow): TruckType => ({
  id: row.id,
  name: row.name,
  model: row.truck_model ?? "Unknown Model",
  plateNumber: row.plate_number,
  assignedDriverId: row.driver_id ?? null,
  wasteType: row.waste_type ?? "Not assigned",
  status: toTruckStatus(row.availability_status ?? "ACTIVE"),
  liveStatus: (row.status as TruckType["liveStatus"]) ?? "OFFLINE",
  dateAdded: formatDriverDate(row.created_at),
});

export const mapDriverRow = (row: DriverApiRow): Driver => ({
  id: row.id,
  userId: row.user_id,
  fullName: row.full_name,
  username: row.username,
  email: row.email,
  contactNumber: row.phone ?? "-",
  licenseNumber: "-",
  truckId: row.truck_id ?? null,
  status: toDriverStatus(row.account_status),
  lastLogin: formatDriverDateTime(row.last_login),
  dateAdded: formatDriverDate(row.created_at),
  activityLog: [],
});

export const mapDriverActivityRow = (
  row: DriverActivityApiRow,
): Driver["activityLog"][number] => ({
  date: row.date,
  route: row.route,
  barangaysCompleted: row.barangays_completed,
  barangaysTotal: row.barangays_total,
  startTime: row.start_time,
  endTime: row.end_time,
  statusMessages: row.status_messages ?? [],
});
