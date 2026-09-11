import { AuditLogRow } from "@/services/auditService";
import { ActionSeverity, AuditLogEntry, AuditModule } from "./types";

const ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: "User Login",
  FAILED_LOGIN: "Failed Login",
  CHANGE_PASSWORD: "Password Changed",
  CREATE_POST: "Created Post",
  UPDATE_POST: "Updated Post",
  PUBLISH_POST: "Published Post",
  DELETE_POST: "Deleted Post",
  CREATE_ANNOUNCEMENT: "Created Announcement",
  UPDATE_ANNOUNCEMENT: "Updated Announcement",
  DELETE_ANNOUNCEMENT: "Deleted Announcement",
  CREATE_REPORT: "Report Submitted",
  UPDATE_REPORT_STATUS: "Status Changed",
  UPDATE_REPORT_PRIORITY: "Priority Changed",
  FLAG_REPORT: "Report Flagged",
  ADD_REPORT_NOTE: "Added Note",
  CREATE_ROUTE: "Created Route",
  UPDATE_ROUTE: "Updated Route",
  DELETE_ROUTE: "Deleted Route",
  CREATE_TRUCK: "Registered Truck",
  UPDATE_TRUCK: "Updated Truck",
  DELETE_TRUCK: "Deleted Truck",
  ASSIGN_DRIVER_TRUCK: "Assigned Driver",
  UPDATE_COLLECTION_SCHEDULE: "Updated Schedule",
  CREATE_COLLECTION_SCHEDULE: "Created Collection Rule",
  UPDATE_REMINDER_SETTINGS: "Updated Reminders",
  CREATE_USER: "Created Account",
  UPDATE_USER: "Updated Account",
  DEACTIVATE_USER: "Deactivated Account",
  ACTIVATE_USER: "Activated Account",
  BAN_USER: "Banned Account",
  UNBAN_USER: "Unbanned Account",
  DELETE_USER: "Deleted Account",
  UPDATE_LANDING_CONTENT: "Updated Landing Page",
};

const MODULE_LABELS: Record<string, AuditModule> = {
  posts: "Posts",
  announcements: "Announcements",
  reports: "Waste Reports",
  routes: "Route Manager",
  users: "Accounts",
  residents: "Resident Manager",
  drivers: "Driver Manager",
  trucks: "Route Manager",
  schedule: "Collection Schedule",
  auth: "Accounts",
  barangays: "Barangay Manager",
  "landing-content": "Landing Page",
};

const formatStatus = (s: any) => {
  if (!s || typeof s !== "string") return String(s || "");
  return s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const getCleanValueString = (val: any): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return formatStatus(val);
  if (typeof val === "object") {
    if (val.status) return formatStatus(val.status);
    if (val.deleted_at !== undefined) return val.deleted_at ? "Deleted" : "Active";
    return Object.entries(val)
      .filter(([_, v]) => typeof v !== "object" && v !== null)
      .map(([k, v]) => `${formatStatus(k)}: ${v}`)
      .join(", ");
  }
  return String(val);
};

export const formatAuditEntry = (row: AuditLogRow): AuditLogEntry => {
  const action = row.action || "UNKNOWN";
  const actionType = ACTION_LABELS[action] || action.replace(/_/g, " ");

  const isPositive =
    action === "UNBAN_USER" ||
    action === "ACTIVATE_USER" ||
    action === "PUBLISH_POST";

  const isCritical =
    !isPositive &&
    (action.includes("DELETE") ||
      action === "BAN_USER" ||
      action.includes("FAILED_LOGIN") ||
      action.includes("DEACTIVATE"));

  const isChange =
    !isPositive &&
    !isCritical &&
    (action.includes("UPDATE") ||
      action.includes("STATUS") ||
      action.includes("ASSIGN") ||
      action.includes("FLAG") ||
      action === "CHANGE_PASSWORD");

  const severity: ActionSeverity = isCritical
    ? "critical"
    : isPositive
      ? "positive"
      : isChange
        ? "change"
        : "routine";

  const moduleName =
    MODULE_LABELS[row.module?.toLowerCase()] || ("Accounts" as AuditModule);

  const oldVal = row.old_value || {};
  const newVal = row.new_value || {};

  // Build clean Affected Record text
  let affectedRecord = "System";
  if (newVal.user_name || oldVal.user_name) {
    affectedRecord = newVal.user_name || oldVal.user_name;
  } else if (newVal.reference_number || oldVal.reference_number) {
    affectedRecord = newVal.reference_number || oldVal.reference_number;
  } else if (newVal.title || oldVal.title) {
    affectedRecord = newVal.title || oldVal.title;
  } else if (newVal.name || oldVal.name) {
    affectedRecord = newVal.name || oldVal.name;
  } else if (newVal.plate_number || oldVal.plate_number) {
    affectedRecord = newVal.plate_number || oldVal.plate_number;
  } else if (newVal.driver || oldVal.driver) {
    affectedRecord = newVal.driver || oldVal.driver;
  } else if (newVal.barangay || oldVal.barangay) {
    affectedRecord = newVal.barangay || oldVal.barangay;
  } else if (newVal.email || oldVal.email) {
    affectedRecord = newVal.email || oldVal.email;
  } else if (row.record_id) {
    affectedRecord = `${row.record_id.slice(0, 8)}...`;
  }

  let summary = "";
  let beforeValue: string | undefined = undefined;
  let afterValue: string | undefined = undefined;

  switch (action) {
    case "CREATE_USER": {
      const name = newVal.user_name || newVal.name || "User";
      const role = formatStatus(newVal.role || "User");
      const email = newVal.email ? ` (${newVal.email})` : "";
      summary = `Created new ${role} account for "${name}"${email}.`;
      afterValue = "Active";
      break;
    }

    case "UPDATE_USER": {
      const name = newVal.user_name || oldVal.user_name || newVal.name || "User";
      summary = `Updated account details for "${name}".`;
      if (oldVal.status !== newVal.status && (oldVal.status || newVal.status)) {
        beforeValue = formatStatus(oldVal.status || "Active");
        afterValue = formatStatus(newVal.status || "Active");
      }
      break;
    }

    case "DELETE_USER": {
      const name = newVal.user_name || oldVal.user_name || "User";
      const role = formatStatus(newVal.role || oldVal.role || "User");
      summary = `Permanently deleted ${role} account for "${name}".`;
      beforeValue = formatStatus(oldVal.status || "Active");
      afterValue = "Deleted";
      break;
    }

    case "DEACTIVATE_USER": {
      const name = newVal.user_name || oldVal.user_name || "User";
      const role = formatStatus(newVal.role || oldVal.role || "User");
      summary = `Deactivated ${role} account for "${name}".`;
      beforeValue = formatStatus(oldVal.status || "Active");
      afterValue = "Deactivated";
      break;
    }

    case "BAN_USER": {
      const name = newVal.user_name || oldVal.user_name || "User";
      const role = formatStatus(newVal.role || oldVal.role || "User");
      const reason = newVal.ban_reason ? ` Reason: ${newVal.ban_reason}.` : "";
      summary = `Banned ${role} account for "${name}".${reason}`;
      beforeValue = formatStatus(oldVal.status || "Active");
      afterValue = "Banned";
      break;
    }

    case "UNBAN_USER": {
      const name = newVal.user_name || oldVal.user_name || "User";
      const role = formatStatus(newVal.role || oldVal.role || "User");
      summary = `Unbanned and restored ${role} account for "${name}".`;
      beforeValue = "Banned";
      afterValue = "Active";
      break;
    }

    case "ACTIVATE_USER": {
      const name = newVal.user_name || oldVal.user_name || "User";
      const role = formatStatus(newVal.role || oldVal.role || "User");
      summary = `Activated ${role} account for "${name}".`;
      beforeValue = formatStatus(oldVal.status || "Inactive");
      afterValue = "Active";
      break;
    }

    case "USER_LOGIN":
      summary = `User signed in successfully (${newVal.email || row.user_email || "authenticated"}).`;
      break;

    case "FAILED_LOGIN":
      summary = `Failed login attempt for account "${newVal.identifier || "unknown"}". Reason: ${newVal.reason || "Invalid credentials"}.`;
      afterValue = "Failed Login";
      break;

    case "CHANGE_PASSWORD":
      summary = `User updated account security password.`;
      break;

    case "CREATE_POST":
      summary = `Created draft content post "${newVal.title || "Untitled"}" in ${formatStatus(newVal.category || "General")}.`;
      afterValue = formatStatus(newVal.status || "Draft");
      break;

    case "PUBLISH_POST":
      summary = `Published content post "${newVal.title || oldVal.title || "Post"}" to the community feed.`;
      beforeValue = formatStatus(oldVal.status || "Draft");
      afterValue = "Published";
      break;

    case "UPDATE_POST":
      summary = `Updated content post "${newVal.title || oldVal.title || "Post"}".`;
      if (oldVal.status !== newVal.status) {
        beforeValue = formatStatus(oldVal.status);
        afterValue = formatStatus(newVal.status);
      }
      break;

    case "DELETE_POST":
      summary = `Deleted content post "${oldVal.title || affectedRecord}".`;
      beforeValue = "Active";
      afterValue = "Deleted";
      break;

    case "CREATE_ANNOUNCEMENT":
      summary = `Created announcement "${newVal.title || "Untitled"}".`;
      afterValue = formatStatus(newVal.status || "Draft");
      break;

    case "UPDATE_ANNOUNCEMENT":
      summary = `Updated announcement "${newVal.title || oldVal.title || "Announcement"}".`;
      if (oldVal.status !== newVal.status) {
        beforeValue = formatStatus(oldVal.status);
        afterValue = formatStatus(newVal.status);
      }
      break;

    case "DELETE_ANNOUNCEMENT":
      summary = `Deleted announcement "${oldVal.title || affectedRecord}".`;
      beforeValue = "Active";
      afterValue = "Deleted";
      break;

    case "CREATE_REPORT":
      summary = `Submitted waste report for ${formatStatus(newVal.violation_type || "Violation")} in ${newVal.barangay || "Barangay"}.`;
      afterValue = "Submitted";
      break;

    case "UPDATE_REPORT_STATUS": {
      const bStatus = formatStatus(oldVal.status || "Submitted");
      const aStatus = formatStatus(newVal.status || "Under Review");
      summary = `Changed report status from ${bStatus} to ${aStatus}.`;
      beforeValue = bStatus;
      afterValue = aStatus;
      break;
    }

    case "UPDATE_REPORT_PRIORITY": {
      const bPri = formatStatus(oldVal.priority || "Medium");
      const aPri = formatStatus(newVal.priority || "High");
      summary = `Changed report priority from ${bPri} to ${aPri}.`;
      beforeValue = bPri;
      afterValue = aPri;
      break;
    }

    case "FLAG_REPORT":
      summary = newVal.is_false
        ? `Flagged report as an invalid / false report.`
        : `Removed false report flag from report.`;
      beforeValue = oldVal.is_false ? "Flagged False" : "Verified";
      afterValue = newVal.is_false ? "Flagged False" : "Verified";
      break;

    case "ADD_REPORT_NOTE":
      summary = newVal.note
        ? `Added internal investigation note: "${newVal.note}".`
        : `Added internal investigation note to report.`;
      afterValue = "Note Added";
      break;

    case "CREATE_ROUTE":
      summary = `Created ${formatStatus(newVal.day_of_week || "Daily")} collection route "${newVal.name || "Route"}" with ${newVal.stops || 0} stops.`;
      afterValue = "Active";
      break;

    case "UPDATE_ROUTE":
      summary = `Updated collection route "${newVal.name || oldVal.name || "Route"}".`;
      break;

    case "DELETE_ROUTE":
      summary = `Deleted collection route "${oldVal.name || affectedRecord}".`;
      beforeValue = "Active";
      afterValue = "Deleted";
      break;

    case "CREATE_TRUCK":
      summary = `Registered collection truck "${newVal.name || "Truck"}" (Plate: ${newVal.plate_number || "N/A"}).`;
      afterValue = "Active";
      break;

    case "UPDATE_TRUCK":
      summary = `Updated truck details for "${newVal.name || oldVal.name || "Truck"}".`;
      if (oldVal.status !== newVal.status && (oldVal.status || newVal.status)) {
        beforeValue = formatStatus(oldVal.status);
        afterValue = formatStatus(newVal.status);
      }
      break;

    case "DELETE_TRUCK":
      summary = `Decommissioned collection truck "${oldVal.name || affectedRecord}" (Plate: ${oldVal.plate_number || "N/A"}).`;
      beforeValue = "Active";
      afterValue = "Deleted";
      break;

    case "ASSIGN_DRIVER_TRUCK":
      summary = `Assigned driver ${newVal.driver || "Driver"} to truck "${newVal.truck || "Unassigned"}".`;
      beforeValue = oldVal.truck ? `Truck: ${oldVal.truck}` : "Unassigned";
      afterValue = newVal.truck ? `Truck: ${newVal.truck}` : "Unassigned";
      break;

    case "CREATE_COLLECTION_SCHEDULE":
      summary = `Created collection schedule rule for ${formatStatus(newVal.barangay || "Barangay")} on ${formatStatus(newVal.day || "Day")} (${formatStatus(newVal.waste_type || "General Waste")}).`;
      afterValue = "Active";
      break;

    case "UPDATE_COLLECTION_SCHEDULE":
      summary = `Updated ${formatStatus(newVal.day || oldVal.day || "Day")} collection type from ${formatStatus(oldVal.waste_type || "None")} to ${formatStatus(newVal.waste_type || "None")}.`;
      beforeValue = formatStatus(oldVal.waste_type || "None");
      afterValue = formatStatus(newVal.waste_type || "None");
      break;

    case "UPDATE_REMINDER_SETTINGS":
      summary = `Updated collection reminder notification settings.`;
      break;

    case "UPDATE_LANDING_CONTENT":
      summary = `Updated public landing page content and announcements.`;
      break;

    default: {
      const cleanAction = actionType || action.replace(/_/g, " ");
      summary = `${cleanAction} recorded on ${affectedRecord !== "System" ? `"${affectedRecord}"` : "system record"}.`;
      if (Object.keys(oldVal).length > 0 || Object.keys(newVal).length > 0) {
        beforeValue = getCleanValueString(oldVal);
        afterValue = getCleanValueString(newVal);
      }
      break;
    }
  }

  return {
    id: row.id,
    timestamp: row.created_at,
    adminName: row.user_name || "System",
    adminRole: row.user_role || "ADMIN",
    actionType,
    module: moduleName,
    affectedRecord,
    summary,
    severity,
    beforeValue: beforeValue || undefined,
    afterValue: afterValue || undefined,
    ipAddress: row.ip_address || "127.0.0.1",
  };
};
