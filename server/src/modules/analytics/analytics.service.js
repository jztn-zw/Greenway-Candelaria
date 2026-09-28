const { pool } = require("../../config/db");

// ─── Helper: date range filter ─────────────────────────────

const dateFilter = (field, from, to) => {
  const conditions = [];
  const params = [];

  if (from) {
    conditions.push(`${field} >= ?`);
    params.push(from);
  }

  if (to) {
    conditions.push(`${field} <= ?`);
    params.push(to);
  }

  return { conditions, params };
};

// ─── Overview ──────────────────────────────────────────────

const getOverview = async () => {
  const [[users]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL",
  );
  const [[residents]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'RESIDENT' AND deleted_at IS NULL",
  );
  const [[drivers]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'DRIVER' AND deleted_at IS NULL",
  );
  const [[admins]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL",
  );
  const [[reports]] = await pool.query("SELECT COUNT(*) AS total FROM reports");
  const [[resolved]] = await pool.query(
    "SELECT COUNT(*) AS total FROM reports WHERE status = 'RESOLVED'",
  );
  const [[pending]] = await pool.query(
    "SELECT COUNT(*) AS total FROM reports WHERE status IN ('SUBMITTED','UNDER_REVIEW','DISPATCHED')",
  );
  const [[trucks]] = await pool.query("SELECT COUNT(*) AS total FROM trucks");
  const [[activeTrucks]] = await pool.query(
    "SELECT COUNT(*) AS total FROM trucks WHERE status != 'OFFLINE'",
  );
  const [[posts]] = await pool.query(
    "SELECT COUNT(*) AS total FROM posts WHERE deleted_at IS NULL AND status = 'PUBLISHED'",
  );
  const [[announcements]] = await pool.query(
    "SELECT COUNT(*) AS total FROM announcements WHERE status = 'ACTIVE'",
  );

  return {
    users: {
      total: users.total,
      residents: residents.total,
      drivers: drivers.total,
      admins: admins.total,
    },
    reports: {
      total: reports.total,
      resolved: resolved.total,
      pending: pending.total,
    },
    trucks: {
      total: trucks.total,
      active: activeTrucks.total,
    },
    posts: posts.total,
    announcements: announcements.total,
  };
};

// ─── Reports Analytics ─────────────────────────────────────

const getReportsAnalytics = async (filters = {}) => {
  const { conditions, params } = dateFilter(
    "created_at",
    filters.from,
    filters.to,
  );
  const where =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  // By status
  const [byStatus] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM reports ${where} GROUP BY status`,
    params,
  );

  // By violation type
  const [byType] = await pool.query(
    `SELECT violation_type, COUNT(*) AS count FROM reports ${where} GROUP BY violation_type ORDER BY count DESC`,
    params,
  );

  // By barangay (top 10)
  const [byBarangay] = await pool.query(
    `SELECT
       b.name AS barangay_name,
       COUNT(r.id) AS count
     FROM reports r
     JOIN barangays b ON b.id = r.barangay_id
     ${where}
     GROUP BY r.barangay_id, b.name
     ORDER BY count DESC
     LIMIT 10`,
    params,
  );

  // Monthly trend (last 6 months)
  const [monthly] = await pool.query(
    `SELECT
       DATE_FORMAT(created_at, '%Y-%m') AS month,
       COUNT(*) AS count
     FROM reports
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
     GROUP BY month
     ORDER BY month ASC`,
  );

  // Resolution rate
  const [[total]] = await pool.query(
    `SELECT COUNT(*) AS count FROM reports ${where}`,
    params,
  );
  const [[resolved]] = await pool.query(
    `SELECT COUNT(*) AS count FROM reports ${where ? where + " AND" : "WHERE"} status = 'RESOLVED'`,
    params,
  );

  const resolutionRate =
    total.count > 0
      ? ((resolved.count / total.count) * 100).toFixed(2)
      : "0.00";

  return {
    by_status: byStatus,
    by_type: byType,
    by_barangay: byBarangay,
    monthly_trend: monthly,
    total: total.count,
    resolved: resolved.count,
    resolution_rate: `${resolutionRate}%`,
  };
};

// ─── Trucks Analytics ──────────────────────────────────────

const getTrucksAnalytics = async () => {
  // Status breakdown
  const [byStatus] = await pool.query(
    "SELECT status, COUNT(*) AS count FROM trucks GROUP BY status",
  );

  // Trucks with most tracking pings (most active)
  const [mostActive] = await pool.query(
    `SELECT
       t.id,
       t.name,
       t.plate_number,
       t.status,
       COUNT(tl.id) AS ping_count
     FROM trucks t
     LEFT JOIN tracking_logs tl ON tl.truck_id = t.id
     GROUP BY t.id, t.name, t.plate_number, t.status
     ORDER BY ping_count DESC`,
  );

  // Routes per truck
  const [routesPerTruck] = await pool.query(
    `SELECT
       t.name,
       t.plate_number,
       COUNT(r.id) AS route_count
     FROM trucks t
     LEFT JOIN routes r ON r.truck_id = t.id
     GROUP BY t.id, t.name, t.plate_number
     ORDER BY route_count DESC`,
  );

  return {
    by_status: byStatus,
    most_active: mostActive,
    routes_per_truck: routesPerTruck,
  };
};

// ─── Users Analytics ───────────────────────────────────────

const getUsersAnalytics = async () => {
  // Role breakdown
  const [byRole] = await pool.query(
    `SELECT role, COUNT(*) AS count
     FROM users
     WHERE deleted_at IS NULL
     GROUP BY role`,
  );

  // Status breakdown
  const [byStatus] = await pool.query(
    `SELECT status, COUNT(*) AS count
     FROM users
     WHERE deleted_at IS NULL
     GROUP BY status`,
  );

  // Monthly signups (last 6 months)
  const [monthlySignups] = await pool.query(
    `SELECT
       DATE_FORMAT(created_at, '%Y-%m') AS month,
       COUNT(*) AS count
     FROM users
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       AND deleted_at IS NULL
     GROUP BY month
     ORDER BY month ASC`,
  );

  // Users per barangay (top 10)
  const [perBarangay] = await pool.query(
    `SELECT
       b.name AS barangay_name,
       COUNT(u.id) AS user_count
     FROM users u
     JOIN barangays b ON b.id = u.barangay_id
     WHERE u.deleted_at IS NULL
     GROUP BY u.barangay_id, b.name
     ORDER BY user_count DESC
     LIMIT 10`,
  );

  return {
    by_role: byRole,
    by_status: byStatus,
    monthly_signups: monthlySignups,
    per_barangay: perBarangay,
  };
};

// ─── Posts Analytics ───────────────────────────────────────

const getPostsAnalytics = async () => {
  // By category
  const [byCategory] = await pool.query(
    `SELECT category, COUNT(*) AS count
     FROM posts
     WHERE deleted_at IS NULL
     GROUP BY category`,
  );

  // By status
  const [byStatus] = await pool.query(
    `SELECT status, COUNT(*) AS count
     FROM posts
     WHERE deleted_at IS NULL
     GROUP BY status`,
  );

  // Top 5 most viewed
  const [mostViewed] = await pool.query(
    `SELECT id, title, category, view_count, published_at
     FROM posts
     WHERE deleted_at IS NULL AND status = 'PUBLISHED'
     ORDER BY view_count DESC
     LIMIT 5`,
  );

  // Top 5 most liked
  const [mostLiked] = await pool.query(
    `SELECT
       p.id,
       p.title,
       p.category,
       COUNT(pl.id) AS like_count
     FROM posts p
     LEFT JOIN post_likes pl ON pl.post_id = p.id
     WHERE p.deleted_at IS NULL AND p.status = 'PUBLISHED'
     GROUP BY p.id, p.title, p.category
     ORDER BY like_count DESC
     LIMIT 5`,
  );

  // Total engagement
  const [[totalViews]] = await pool.query(
    "SELECT SUM(view_count) AS total FROM posts WHERE deleted_at IS NULL AND status = 'PUBLISHED'",
  );
  const [[totalLikes]] = await pool.query(
    "SELECT COUNT(*) AS total FROM post_likes",
  );
  return {
    by_category: byCategory,
    by_status: byStatus,
    most_viewed: mostViewed,
    most_liked: mostLiked,
    engagement: {
      total_views: totalViews.total || 0,
      total_likes: totalLikes.total || 0,
    },
  };
};

// ─── Barangays Analytics ───────────────────────────────────

const getBarangaysAnalytics = async () => {
  // Most reports submitted per barangay
  const [byReports] = await pool.query(
    `SELECT
       b.id,
       b.name,
       COUNT(r.id) AS report_count
     FROM barangays b
     LEFT JOIN reports r ON r.barangay_id = b.id
     GROUP BY b.id, b.name
     ORDER BY report_count DESC`,
  );

  // Most users per barangay
  const [byUsers] = await pool.query(
    `SELECT
       b.id,
       b.name,
       COUNT(u.id) AS user_count
     FROM barangays b
     LEFT JOIN users u ON u.barangay_id = b.id AND u.deleted_at IS NULL
     GROUP BY b.id, b.name
     ORDER BY user_count DESC`,
  );

  // Barangays with most unresolved reports
  const [unresolved] = await pool.query(
    `SELECT
       b.name,
       COUNT(r.id) AS unresolved_count
     FROM reports r
     JOIN barangays b ON b.id = r.barangay_id
     WHERE r.status != 'RESOLVED'
     GROUP BY r.barangay_id, b.name
     ORDER BY unresolved_count DESC
     LIMIT 10`,
  );

  return {
    by_reports: byReports,
    by_users: byUsers,
    unresolved: unresolved,
  };
};

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Manila";
const REPORT_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "DISPATCHED", "RESOLVED"];

const toNumber = (value) => Number(value || 0);

const getManilaDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const shiftDate = (dateString, days) => {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const getDatePartsInTimeZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

const getUtcTimestampForLocalMidnight = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const desiredLocalAsUtc = Date.UTC(year, month - 1, day);
  let utcTimestamp = desiredLocalAsUtc;

  // Resolve the timezone offset against the target date. Repeating once handles
  // offset changes around daylight-saving transitions in configurable zones.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = getDatePartsInTimeZone(new Date(utcTimestamp), APP_TIME_ZONE);
    const renderedAsUtc = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second),
    );
    utcTimestamp += desiredLocalAsUtc - renderedAsUtc;
  }

  return new Date(utcTimestamp).toISOString().slice(0, 19).replace("T", " ");
};

const mondayFor = (dateString) => {
  const date = new Date(`${dateString}T12:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
};

const getWeeklyPeriods = (from, to) => {
  const periods = [];
  const lastMonday = mondayFor(to);
  for (let period = mondayFor(from); period <= lastMonday; period = shiftDate(period, 7)) {
    periods.push(period);
  }
  return periods;
};

const getMonthlyPeriods = (from, to) => {
  const periods = [];
  const fromDate = new Date(`${from.slice(0, 7)}-01T12:00:00Z`);
  const lastMonth = to.slice(0, 7);
  for (
    let date = fromDate;
    date.toISOString().slice(0, 7) <= lastMonth;
    date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 12))
  ) {
    periods.push(date.toISOString().slice(0, 7));
  }
  return periods;
};

const fillPeriodRows = (rows, periods, keyField, valueFields) => {
  const rowByPeriod = new Map(rows.map((row) => [String(row[keyField]).slice(0, keyField === "month_key" ? 7 : 10), row]));
  return periods.map((period) => {
    const row = rowByPeriod.get(period);
    return Object.fromEntries([
      [keyField === "month_key" ? "month" : "period", period],
      ...valueFields.map((field) => [field.output, row ? toNumber(row[field.input]) : 0]),
    ]);
  });
};

const isIsoDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const resolveDateRange = ({ from, to } = {}) => {
  const today = getManilaDate();
  const start = from || shiftDate(today, -55);
  const end = to || today;

  if (!isIsoDate(start) || !isIsoDate(end) || start > end) {
    throw { statusCode: 400, message: "Use a valid date range." };
  }

  if (shiftDate(start, 366) < end) {
    throw { statusCode: 400, message: "Analytics date ranges can be up to 366 days." };
  }

  return {
    from: start,
    to: end,
    utcFrom: getUtcTimestampForLocalMidnight(start),
    utcToExclusive: getUtcTimestampForLocalMidnight(shiftDate(end, 1)),
  };
};

const formatEnumLabel = (value) =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const withBarangayFilter = (baseConditions, column, barangayId, params) => {
  if (!barangayId) return baseConditions;
  params.push(barangayId);
  return [...baseConditions, `${column} = ?`];
};

// A past run that never collected a stop also counts as missed, even if its
// status was never closed. Cancellations are kept separate because they do not
// prove that a driver attempted collection.
const runMetricsSql = (barangayId, range) => {
  const scopedStop = barangayId ? "rrs.barangay_id = ?" : "1 = 1";
  return {
    sql: `SELECT rr.id, rr.driver_id, rr.truck_id, rr.run_date, rr.status,
       COALESCE(SUM(rrs.status = 'DONE'), 0) AS all_completed_stops,
       COALESCE(SUM(rrs.status = 'MISSED'), 0) AS all_missed_stops,
       COALESCE(SUM(rrs.id IS NOT NULL AND ${scopedStop}), 0) AS scheduled_stops,
       COALESCE(SUM(rrs.status = 'DONE' AND ${scopedStop}), 0) AS completed_stops,
       COALESCE(SUM(rrs.status = 'MISSED' AND ${scopedStop}), 0) AS missed_stops
     FROM route_runs rr
     LEFT JOIN route_run_stops rrs ON rrs.route_run_id = rr.id
     WHERE rr.run_date BETWEEN ? AND ?
       ${barangayId ? "AND EXISTS (SELECT 1 FROM route_run_stops selected_stop WHERE selected_stop.route_run_id = rr.id AND selected_stop.barangay_id = ?)" : ""}
     GROUP BY rr.id, rr.driver_id, rr.truck_id, rr.run_date, rr.status`,
    params: barangayId
      ? [barangayId, barangayId, barangayId, range.from, range.to, barangayId]
      : [range.from, range.to],
  };
};

// Analytics uses immutable route-run history, rather than the recurring route
// templates, so a later route edit cannot change a previously reported result.
const getAnalyticsDashboard = async (filters = {}) => {
  const range = resolveDateRange(filters);
  const barangayId = typeof filters.barangayId === "string" && filters.barangayId.trim()
    ? filters.barangayId.trim()
    : null;

  const routeStopParams = [range.from, range.to];
  const routeStopConditions = withBarangayFilter(
    ["rr.run_date BETWEEN ? AND ?"],
    "rrs.barangay_id",
    barangayId,
    routeStopParams,
  );
  const routeStopWhere = routeStopConditions.join(" AND ");

  const reportParams = [range.utcFrom, range.utcToExclusive];
  const reportConditions = withBarangayFilter(
    [
      "r.deleted_at IS NULL",
      "r.created_at >= ?",
      "r.created_at < ?",
    ],
    "r.barangay_id",
    barangayId,
    reportParams,
  );
  const reportWhere = reportConditions.join(" AND ");

  const [[stopSummary]] = await pool.query(
    `SELECT
       COUNT(rrs.id) AS scheduled_stops,
       COALESCE(SUM(rrs.status = 'DONE'), 0) AS completed_stops,
       COALESCE(SUM(rrs.status = 'MISSED'), 0) AS missed_stops
     FROM route_runs rr
     JOIN route_run_stops rrs ON rrs.route_run_id = rr.id
     WHERE ${routeStopWhere}`,
    routeStopParams,
  );

  const [[currentReportQueue]] = await pool.query(
    `SELECT COUNT(*) AS open_reports
     FROM reports r
     WHERE r.deleted_at IS NULL
       AND r.status IN ('SUBMITTED', 'UNDER_REVIEW', 'DISPATCHED')
       ${barangayId ? "AND r.barangay_id = ?" : ""}`,
    barangayId ? [barangayId] : [],
  );

  const [collectionTrendRows] = await pool.query(
    `SELECT
       DATE_SUB(rr.run_date, INTERVAL WEEKDAY(rr.run_date) DAY) AS period_date,
       COUNT(rrs.id) AS scheduled,
       COALESCE(SUM(rrs.status = 'DONE'), 0) AS completed,
       COALESCE(SUM(rrs.status = 'MISSED'), 0) AS missed
     FROM route_runs rr
     JOIN route_run_stops rrs ON rrs.route_run_id = rr.id
     WHERE ${routeStopWhere}
     GROUP BY period_date
     ORDER BY period_date ASC`,
    routeStopParams,
  );

  const [missedByAreaRows] = await pool.query(
    `SELECT
       b.name,
       COUNT(rrs.id) AS scheduled,
       COALESCE(SUM(rrs.status = 'MISSED'), 0) AS missed
     FROM route_runs rr
     JOIN route_run_stops rrs ON rrs.route_run_id = rr.id
     JOIN barangays b ON b.id = rrs.barangay_id
     WHERE ${routeStopWhere}
     GROUP BY b.id, b.name
     HAVING missed > 0
     ORDER BY missed DESC, b.name ASC
     LIMIT 10`,
    routeStopParams,
  );

  const [missedReasonRows] = await pool.query(
    `SELECT
       COALESCE(NULLIF(TRIM(rrs.skipped_reason), ''), 'No reason recorded') AS reason,
       COUNT(*) AS count
     FROM route_runs rr
     JOIN route_run_stops rrs ON rrs.route_run_id = rr.id
     WHERE ${routeStopWhere} AND rrs.status = 'MISSED'
     GROUP BY reason
     ORDER BY count DESC, reason ASC
     LIMIT 8`,
    routeStopParams,
  );

  const runMetrics = runMetricsSql(barangayId, range);
  const today = getManilaDate();
  const missedRoute = `rm.status = 'PARTIAL' AND rm.all_completed_stops = 0 AND rm.all_missed_stops > 0
     OR rm.run_date < '${today}' AND rm.status IN ('SCHEDULED', 'ACTIVE', 'PAUSED') AND rm.all_completed_stops = 0`;
  const incompleteRoute = `rm.status = 'PARTIAL' AND rm.all_completed_stops > 0
     OR rm.run_date < '${today}' AND rm.status IN ('ACTIVE', 'PAUSED') AND rm.all_completed_stops > 0`;

  const [driverRows] = await pool.query(
    `SELECT
       COALESCE(rm.driver_id, 'unassigned') AS id,
       COALESCE(u.full_name, 'Unassigned') AS name,
       COALESCE(current_truck.name, 'Unassigned') AS truck,
       COUNT(rm.id) AS assigned,
       COALESCE(SUM(rm.status = 'COMPLETED'), 0) AS completed,
       COALESCE(SUM(${incompleteRoute}), 0) AS incomplete,
       COALESCE(SUM(${missedRoute}), 0) AS missed_routes,
       COALESCE(SUM(rm.status = 'CANCELLED'), 0) AS cancelled,
       COALESCE(SUM(CASE WHEN rm.status <> 'CANCELLED' THEN rm.scheduled_stops ELSE 0 END), 0) AS scheduled_stops,
       COALESCE(SUM(CASE WHEN rm.status <> 'CANCELLED' THEN rm.completed_stops ELSE 0 END), 0) AS completed_stops,
       COALESCE(SUM(CASE WHEN rm.status <> 'CANCELLED' THEN rm.missed_stops ELSE 0 END), 0) AS missed_stops
     FROM (${runMetrics.sql}) rm
     LEFT JOIN drivers d ON d.id = rm.driver_id
     LEFT JOIN users u ON u.id = d.user_id
     LEFT JOIN trucks current_truck ON current_truck.id = d.truck_id
     WHERE rm.driver_id IS NOT NULL
     GROUP BY rm.driver_id, u.full_name, current_truck.id, current_truck.name
     ORDER BY name ASC, id ASC`,
    runMetrics.params,
  );

  const [fleetRows] = await pool.query(
    `SELECT
       t.id,
       t.name AS truck,
       t.plate_number AS plate,
       CASE
         WHEN t.availability_status = 'UNDER_MAINTENANCE' THEN 'Under maintenance'
         WHEN COALESCE(today.active_runs, 0) > 0 AND gps.last_ping >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 120 SECOND) THEN 'Collecting'
         WHEN COALESCE(today.active_runs, 0) > 0 THEN 'GPS unavailable'
         WHEN COALESCE(today.paused_runs, 0) > 0 THEN 'Paused'
         WHEN COALESCE(today.scheduled_runs, 0) > 0 THEN 'Scheduled'
         WHEN COALESCE(today.closed_runs, 0) > 0 THEN 'Routes closed'
         ELSE 'Idle'
       END AS availability,
       COUNT(rm.id) AS assigned,
       COALESCE(SUM(rm.status = 'COMPLETED'), 0) AS completed,
       COALESCE(SUM(${incompleteRoute}), 0) AS incomplete,
       COALESCE(SUM(${missedRoute}), 0) AS missed_routes,
       COALESCE(SUM(rm.status = 'CANCELLED'), 0) AS cancelled,
       COALESCE(SUM(CASE WHEN rm.status <> 'CANCELLED' THEN rm.missed_stops ELSE 0 END), 0) AS missed_stops
     FROM trucks t
     LEFT JOIN (${runMetrics.sql}) rm ON rm.truck_id = t.id
     LEFT JOIN (
       SELECT truck_id, MAX(created_at) AS last_ping
       FROM tracking_logs GROUP BY truck_id
     ) gps ON gps.truck_id = t.id
     LEFT JOIN (
       SELECT truck_id,
         COALESCE(SUM(status = 'ACTIVE'), 0) AS active_runs,
         COALESCE(SUM(status = 'PAUSED'), 0) AS paused_runs,
         COALESCE(SUM(status = 'SCHEDULED'), 0) AS scheduled_runs,
         COALESCE(SUM(status IN ('COMPLETED', 'PARTIAL')), 0) AS closed_runs
       FROM route_runs WHERE run_date = ? GROUP BY truck_id
     ) today ON today.truck_id = t.id
     ${barangayId ? "WHERE rm.id IS NOT NULL" : ""}
     GROUP BY t.id, t.name, t.plate_number, t.availability_status,
       today.active_runs, today.paused_runs, today.scheduled_runs, today.closed_runs, gps.last_ping
     ORDER BY t.name ASC`,
    [...runMetrics.params, today],
  );

  const [statusRows] = await pool.query(
    `SELECT r.status, COUNT(*) AS count
     FROM reports r
     WHERE ${reportWhere}
     GROUP BY r.status`,
    reportParams,
  );

  const [reportsPerWeekRows] = await pool.query(
    `SELECT
       DATE_SUB(
         DATE(CONVERT_TZ(r.created_at, '+00:00', ?)),
         INTERVAL WEEKDAY(CONVERT_TZ(r.created_at, '+00:00', ?)) DAY
       ) AS period_date,
       COUNT(*) AS reports
     FROM reports r
     WHERE ${reportWhere}
     GROUP BY period_date
     ORDER BY period_date ASC`,
    [APP_TIME_ZONE, APP_TIME_ZONE, ...reportParams],
  );

  const [resolutionRows] = await pool.query(
    `SELECT
       DATE_FORMAT(CONVERT_TZ(r.created_at, '+00:00', ?), '%Y-%m') AS month_key,
       AVG(TIMESTAMPDIFF(SECOND, r.created_at, resolved_at) / 86400) AS days
     FROM reports r
     JOIN (
       SELECT report_id, MIN(created_at) AS resolved_at
       FROM report_status_history
       WHERE status = 'RESOLVED'
       GROUP BY report_id
     ) resolved_history ON resolved_history.report_id = r.id
     WHERE ${reportWhere}
     GROUP BY month_key
     ORDER BY month_key ASC`,
    [APP_TIME_ZONE, ...reportParams],
  );

  const [violationRows] = await pool.query(
    `SELECT r.violation_type AS type, COUNT(*) AS count
     FROM reports r
     WHERE ${reportWhere}
     GROUP BY r.violation_type
     ORDER BY count DESC, type ASC`,
    reportParams,
  );

  const [reportsByBarangayRows] = await pool.query(
    `SELECT b.name, COUNT(*) AS reports
     FROM reports r
     JOIN barangays b ON b.id = r.barangay_id
     WHERE ${reportWhere}
     GROUP BY b.id, b.name
     ORDER BY reports DESC, b.name ASC
     LIMIT 10`,
    reportParams,
  );

  const [[reportingResidentsRow]] = await pool.query(
    `SELECT COUNT(DISTINCT r.user_id) AS count
     FROM reports r
     WHERE ${reportWhere}
       AND r.user_id IS NOT NULL`,
    reportParams,
  );

  const residentParams = [];
  const residentConditions = ["u.role = 'RESIDENT'", "u.deleted_at IS NULL"];
  if (barangayId) {
    residentConditions.push("u.barangay_id = ?");
    residentParams.push(barangayId);
  }
  const residentWhere = residentConditions.join(" AND ");

  const [[residentSummary]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(u.created_at >= ? AND u.created_at < ?), 0) AS new_this_period
     FROM users u
     WHERE ${residentWhere}`,
    [range.utcFrom, range.utcToExclusive, ...(barangayId ? [barangayId] : [])],
  );

  const [registrationRows] = await pool.query(
    `SELECT DATE_FORMAT(CONVERT_TZ(u.created_at, '+00:00', ?), '%Y-%m') AS month_key, COUNT(*) AS registrations
     FROM users u
     WHERE ${residentWhere}
       AND u.created_at >= ?
       AND u.created_at < ?
     GROUP BY month_key
     ORDER BY month_key ASC`,
    [APP_TIME_ZONE, ...(barangayId ? [barangayId] : []), range.utcFrom, range.utcToExclusive],
  );

  const [participationRows] = await pool.query(
    `SELECT
       DATE_FORMAT(CONVERT_TZ(r.created_at, '+00:00', ?), '%Y-%m') AS month_key,
       COUNT(DISTINCT r.user_id) AS residents,
       COUNT(*) AS reports
     FROM reports r
     WHERE ${reportWhere}
       AND r.user_id IS NOT NULL
     GROUP BY month_key
     ORDER BY month_key ASC`,
    [APP_TIME_ZONE, ...reportParams],
  );

  const [[announcementReads]] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM announcement_read_receipts receipt
     JOIN users u ON u.id = receipt.user_id
     WHERE u.role = 'RESIDENT'
       AND u.deleted_at IS NULL
       AND receipt.read_at >= ?
       AND receipt.read_at < ?
       ${barangayId ? "AND u.barangay_id = ?" : ""}`,
    barangayId
      ? [range.utcFrom, range.utcToExclusive, barangayId]
      : [range.utcFrom, range.utcToExclusive],
  );

  const [barangayCoverageRows] = await pool.query(
    `SELECT
       b.name,
       COUNT(rrs.id) AS scheduled,
       COALESCE(SUM(rrs.status = 'DONE'), 0) AS completed,
       COALESCE(SUM(rrs.status = 'MISSED'), 0) AS missed
     FROM route_runs rr
     JOIN route_run_stops rrs ON rrs.route_run_id = rr.id
     JOIN barangays b ON b.id = rrs.barangay_id
     WHERE ${routeStopWhere}
     GROUP BY b.id, b.name
     ORDER BY b.name ASC`,
    routeStopParams,
  );

  const scheduledStops = toNumber(stopSummary.scheduled_stops);
  const completedStops = toNumber(stopSummary.completed_stops);
  const statusCounts = new Map(statusRows.map((row) => [row.status, toNumber(row.count)]));
  const weeklyPeriods = getWeeklyPeriods(range.from, range.to);
  const monthlyPeriods = getMonthlyPeriods(range.from, range.to);
  const collectionTrend = fillPeriodRows(
    collectionTrendRows,
    weeklyPeriods,
    "period_date",
    [
      { input: "scheduled", output: "scheduled" },
      { input: "completed", output: "completed" },
      { input: "missed", output: "missed" },
    ],
  ).map((row) => ({
    ...row,
    rate: row.scheduled ? Math.round((row.completed / row.scheduled) * 100) : 0,
  }));

  return {
    range: { from: range.from, to: range.to },
    overview: {
      scheduledStops,
      completedStops,
      completionRate: scheduledStops ? Math.round((completedStops / scheduledStops) * 100) : 0,
      missedStops: toNumber(stopSummary.missed_stops),
      openReports: toNumber(currentReportQueue.open_reports),
      resolvedReports: statusCounts.get("RESOLVED") || 0,
      activeTrucks: fleetRows.filter((row) => row.availability === "Collecting").length,
      totalTrucks: fleetRows.length,
    },
    collectionCompletionTrend: collectionTrend,
    missedCollectionsWeekly: collectionTrend.map(({ period, missed }) => ({ period, missed })),
    driverOperations: driverRows.map((row) => {
      const scheduled = toNumber(row.scheduled_stops);
      const completed = toNumber(row.completed_stops);
      return {
        id: row.id,
        name: row.name,
        truck: row.truck,
        assigned: toNumber(row.assigned),
        completed: toNumber(row.completed),
        incomplete: toNumber(row.incomplete),
        missedRoutes: toNumber(row.missed_routes),
        cancelled: toNumber(row.cancelled),
        scheduledStops: scheduled,
        completedStops: completed,
        missedStops: toNumber(row.missed_stops),
        rate: scheduled ? Math.round((completed / scheduled) * 100) : 0,
      };
    }),
    missedByArea: missedByAreaRows.map((row) => ({
      name: row.name,
      scheduled: toNumber(row.scheduled),
      missed: toNumber(row.missed),
    })),
    missedReasons: missedReasonRows.map((row) => ({ reason: row.reason, count: toNumber(row.count) })),
    reportStatusBreakdown: REPORT_STATUSES.map((status) => ({
      name: formatEnumLabel(status),
      value: statusCounts.get(status) || 0,
    })),
    reportsPerWeek: fillPeriodRows(reportsPerWeekRows, weeklyPeriods, "period_date", [
      { input: "reports", output: "reports" },
    ]),
    resolutionTimeMonthly: fillPeriodRows(resolutionRows, monthlyPeriods, "month_key", [
      { input: "days", output: "days" },
    ]).map((row) => ({ ...row, days: Number(row.days.toFixed(1)) })),
    violationTypes: violationRows.map((row) => ({ type: formatEnumLabel(row.type), count: toNumber(row.count) })),
    reportsByBarangay: reportsByBarangayRows.map((row) => ({ name: row.name, reports: toNumber(row.reports) })),
    residentRegistrationGrowth: fillPeriodRows(registrationRows, monthlyPeriods, "month_key", [
      { input: "registrations", output: "registrations" },
    ]),
    residentParticipation: fillPeriodRows(participationRows, monthlyPeriods, "month_key", [
      { input: "residents", output: "residents" },
      { input: "reports", output: "reports" },
    ]),
    residentSummary: {
      total: toNumber(residentSummary.total),
      newResidents: toNumber(residentSummary.new_this_period),
      reportingResidents: toNumber(reportingResidentsRow.count),
      announcementReads: toNumber(announcementReads.count),
    },
    fleetStatus: fleetRows.map((row) => ({
      id: row.id,
      truck: row.truck,
      plate: row.plate,
      availability: row.availability,
      assigned: toNumber(row.assigned),
      completed: toNumber(row.completed),
      incomplete: toNumber(row.incomplete),
      missedRoutes: toNumber(row.missed_routes),
      cancelled: toNumber(row.cancelled),
      missedStops: toNumber(row.missed_stops),
    })),
    barangayCoverage: barangayCoverageRows.map((row) => {
      const scheduled = toNumber(row.scheduled);
      const completed = toNumber(row.completed);
      return {
        name: row.name,
        scheduled,
        completed,
        missed: toNumber(row.missed),
        rate: scheduled ? Math.round((completed / scheduled) * 100) : 0,
      };
    }),
  };
};

module.exports = {
  getOverview,
  getReportsAnalytics,
  getTrucksAnalytics,
  getUsersAnalytics,
  getPostsAnalytics,
  getBarangaysAnalytics,
  getAnalyticsDashboard,
};
