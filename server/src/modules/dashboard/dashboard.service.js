const { pool } = require("../../config/db");

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Manila";

const toNumber = (value) => Number(value || 0);

const getToday = () =>
  new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: APP_TIME_ZONE,
    })
    .toUpperCase();

const groupRoutes = (rows) => {
  const routes = new Map();

  for (const row of rows) {
    if (!routes.has(row.id)) {
      routes.set(row.id, {
        id: row.id,
        day_of_week: row.day_of_week,
        truck_id: row.truck_id,
        truck_name: row.truck_name,
        truck_plate: row.truck_plate,
        driver_name: row.driver_name ?? null,
        start_time: row.start_time,
        status: row.status,
        name: row.name ?? null,
        waste_type: row.waste_type ?? null,
        stops: [],
      });
    }

    if (row.stop_id) {
      routes.get(row.id).stops.push({
        id: row.stop_id,
        barangay_id: row.barangay_id,
        barangay_name: row.barangay_name,
        stop_order: toNumber(row.stop_order),
        status: row.stop_status || "NOT_STARTED",
      });
    }
  }

  return Array.from(routes.values());
};

// This endpoint intentionally runs a small number of predictable queries in
// sequence. It prevents one dashboard load from creating a burst of concurrent
// work against a remote TiDB connection.
const getAdminDashboard = async () => {
  const [[overviewRow]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) AS users_total,
      (SELECT COUNT(*) FROM users WHERE role = 'RESIDENT' AND deleted_at IS NULL) AS residents,
      (SELECT COUNT(*) FROM users WHERE role = 'DRIVER' AND deleted_at IS NULL) AS drivers,
      (SELECT COUNT(*) FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL) AS admins,
      (SELECT COUNT(*) FROM reports WHERE deleted_at IS NULL) AS reports_total,
      (SELECT COUNT(*) FROM reports WHERE status = 'RESOLVED' AND deleted_at IS NULL) AS reports_resolved,
      (SELECT COUNT(*) FROM reports
        WHERE status IN ('SUBMITTED', 'UNDER_REVIEW', 'DISPATCHED')
          AND deleted_at IS NULL) AS reports_pending,
      (SELECT COUNT(*) FROM trucks) AS trucks_total,
      (SELECT COUNT(*) FROM trucks
        WHERE status <> 'OFFLINE' AND availability_status = 'ACTIVE') AS trucks_active,
      (SELECT COUNT(*) FROM posts
        WHERE deleted_at IS NULL AND status = 'PUBLISHED') AS posts_total,
      (SELECT COUNT(*) FROM announcements WHERE status = 'ACTIVE') AS announcements_total
  `);

  const [reportStatusRows] = await pool.query(`
    SELECT status, COUNT(*) AS count
    FROM reports
    WHERE deleted_at IS NULL
    GROUP BY status
  `);

  const [reportTrendRows] = await pool.query(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
    FROM reports
    WHERE deleted_at IS NULL
      AND created_at >= DATE_FORMAT(
        DATE_SUB(CURRENT_DATE(), INTERVAL 5 MONTH),
        '%Y-%m-01'
      )
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month ASC
  `);

  const [residentTrendRows] = await pool.query(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
    FROM users
    WHERE role = 'RESIDENT'
      AND deleted_at IS NULL
      AND created_at >= DATE_FORMAT(
        DATE_SUB(CURRENT_DATE(), INTERVAL 5 MONTH),
        '%Y-%m-01'
      )
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month ASC
  `);

  const [recentReports] = await pool.query(`
    SELECT
      r.id,
      r.reference_number,
      r.violation_type,
      b.name AS barangay_name,
      r.landmark,
      COALESCE(u.full_name, 'Anonymous Resident') AS reporter_name,
      r.priority,
      r.status,
      r.created_at
    FROM reports r
    JOIN barangays b ON b.id = r.barangay_id
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.deleted_at IS NULL
    ORDER BY r.created_at DESC
    LIMIT 5
  `);

  const [activityLogs] = await pool.query(`
    SELECT
      al.id,
      al.user_id,
      COALESCE(u.full_name, 'System / Unknown') AS user_name,
      al.action,
      al.module,
      al.record_id,
      al.created_at,
      al.ip_address
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    ORDER BY al.created_at DESC
    LIMIT 8
  `);

  const [trucks] = await pool.query(
    `SELECT
       t.id,
       t.name,
       t.plate_number,
       t.status,
       t.availability_status,
       u.full_name AS driver_name,
       COALESCE(r.name, CONCAT('Route for ', r.day_of_week)) AS current_route,
       COALESCE(SUM(CASE WHEN rs.status = 'DONE' THEN 1 ELSE 0 END), 0) AS completed_barangays,
       COUNT(rs.id) AS total_barangays
     FROM trucks t
     LEFT JOIN drivers d ON d.truck_id = t.id
     LEFT JOIN users u ON u.id = d.user_id
     LEFT JOIN routes r
       ON r.truck_id = t.id
      AND UPPER(r.day_of_week) = ?
      AND r.status = 'ACTIVE'
     LEFT JOIN route_stops rs ON rs.route_id = r.id
     GROUP BY
       t.id, t.name, t.plate_number, t.status, t.availability_status,
       u.full_name, r.id, r.name, r.day_of_week
     ORDER BY t.created_at ASC`,
    [getToday()],
  );

  const [barangays] = await pool.query(`
    SELECT id, name, NULL AS zone
    FROM barangays
    ORDER BY name ASC
  `);

  const [routeRows] = await pool.query(`
    SELECT
      r.id,
      r.day_of_week,
      r.truck_id,
      t.name AS truck_name,
      t.plate_number AS truck_plate,
      u.full_name AS driver_name,
      r.start_time,
      r.status,
      r.name,
      r.waste_type,
      rs.id AS stop_id,
      rs.barangay_id,
      b.name AS barangay_name,
      rs.stop_order,
      rs.status AS stop_status
    FROM routes r
    JOIN trucks t ON t.id = r.truck_id
    LEFT JOIN drivers d ON d.id = r.driver_id
    LEFT JOIN users u ON u.id = d.user_id
    LEFT JOIN route_stops rs ON rs.route_id = r.id
    LEFT JOIN barangays b ON b.id = rs.barangay_id
    ORDER BY
      FIELD(r.day_of_week, 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'),
      r.start_time ASC,
      rs.stop_order ASC
  `);

  const reportsTotal = toNumber(overviewRow.reports_total);
  const reportsResolved = toNumber(overviewRow.reports_resolved);
  const resolutionRate = reportsTotal
    ? `${((reportsResolved / reportsTotal) * 100).toFixed(2)}%`
    : "0.00%";

  return {
    overview: {
      users: {
        total: toNumber(overviewRow.users_total),
        residents: toNumber(overviewRow.residents),
        drivers: toNumber(overviewRow.drivers),
        admins: toNumber(overviewRow.admins),
      },
      reports: {
        total: reportsTotal,
        resolved: reportsResolved,
        pending: toNumber(overviewRow.reports_pending),
      },
      trucks: {
        total: toNumber(overviewRow.trucks_total),
        active: toNumber(overviewRow.trucks_active),
      },
      posts: toNumber(overviewRow.posts_total),
      announcements: toNumber(overviewRow.announcements_total),
    },
    reportsAnalytics: {
      by_status: reportStatusRows,
      by_type: [],
      by_priority: [],
      by_barangay: [],
      monthly_trend: reportTrendRows,
      total: reportsTotal,
      resolved: reportsResolved,
      resolution_rate: resolutionRate,
    },
    usersAnalytics: {
      by_role: [],
      by_status: [],
      monthly_signups: residentTrendRows,
      per_barangay: [],
    },
    recentReports,
    activityLogs,
    trucks,
    barangays,
    routes: groupRoutes(routeRows),
  };
};

module.exports = { getAdminDashboard };
