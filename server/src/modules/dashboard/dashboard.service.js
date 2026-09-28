const { pool } = require("../../config/db");

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Manila";

const toNumber = (value) => Number(value || 0);

const getTodayDate = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const RUN_STATUS_PRIORITY = ["ACTIVE", "PAUSED", "SCHEDULED", "PARTIAL", "COMPLETED", "CANCELLED"];

const summarizeTodayOperations = (truckRows, runStopRows) => {
  const trucks = truckRows.map((truck) => ({
    ...truck, current_route: null, run_status: null, completed_stops: 0, total_stops: 0,
  }));
  const trucksById = new Map(trucks.map((truck) => [truck.id, truck]));
  const runsById = new Map();
  const barangaysById = new Map();

  for (const row of runStopRows) {
    let run = runsById.get(row.run_id);
    if (!run) {
      run = { truck_id: row.truck_id, name: row.route_name,
        status: row.run_status, driver_name: row.driver_name, total: 0, completed: 0 };
      runsById.set(row.run_id, run);
    }
    if (!row.stop_id || row.run_status === "CANCELLED") continue;
    run.total += 1;
    if (row.stop_status === "DONE") run.completed += 1;

    let barangay = barangaysById.get(row.barangay_id);
    if (!barangay) {
      barangay = { id: row.barangay_id, name: row.barangay_name || "Barangay unavailable",
        truckNames: new Set(), total: 0, done: 0, missed: 0, inProgress: 0 };
      barangaysById.set(row.barangay_id, barangay);
    }
    const truckName = trucksById.get(row.truck_id)?.name;
    if (truckName) barangay.truckNames.add(truckName);
    barangay.total += 1;
    if (row.stop_status === "DONE") barangay.done += 1;
    if (row.stop_status === "MISSED") barangay.missed += 1;
    if (row.stop_status === "IN_PROGRESS") barangay.inProgress += 1;
  }

  const runsByTruck = new Map();
  for (const run of runsById.values()) {
    const truck = trucksById.get(run.truck_id);
    if (!truck) continue;
    if (!runsByTruck.has(run.truck_id)) runsByTruck.set(run.truck_id, []);
    runsByTruck.get(run.truck_id).push(run);
    truck.total_stops += run.total;
    truck.completed_stops += run.completed;
  }
  for (const truck of trucks) {
    const runs = runsByTruck.get(truck.id) || [];
    truck.run_status = RUN_STATUS_PRIORITY.find((status) => runs.some((run) => run.status === status)) || null;
    truck.current_route = [...new Set(runs.filter((run) => run.status !== "CANCELLED")
      .map((run) => run.name).filter(Boolean))].join(", ") || null;
    truck.driver_name = [...new Set(runs.filter((run) => run.status !== "CANCELLED")
      .map((run) => run.driver_name).filter(Boolean))].join(", ") || truck.driver_name;
  }

  const barangays = [...barangaysById.values()].map((barangay) => ({
    id: barangay.id,
    name: barangay.name,
    truck_name: [...barangay.truckNames].sort().join(", "),
    status: barangay.done === barangay.total ? "DONE"
      : barangay.missed > 0 ? "MISSED"
        : barangay.inProgress > 0 || barangay.done > 0 ? "IN_PROGRESS" : "NOT_STARTED",
  })).sort((a, b) => a.name.localeCompare(b.name));

  return { trucks, barangays };
};

// This endpoint intentionally runs a small number of predictable queries in
// sequence. It prevents one dashboard load from creating a burst of concurrent
// work against a remote TiDB connection.
const getAdminDashboard = async () => {
  const todayDate = getTodayDate();
  const [year, month] = todayDate.split("-").map(Number);
  const firstMonth = new Date(Date.UTC(year, month - 6, 1)).toISOString().slice(0, 10);
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
        WHERE availability_status = 'ACTIVE') AS trucks_active,
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

  const [[attentionRow]] = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END), 0) AS awaiting_triage,
      (
        SELECT COUNT(*)
        FROM trucks
        WHERE availability_status = 'UNDER_MAINTENANCE'
      ) AS maintenance_trucks
    FROM reports
    WHERE deleted_at IS NULL
  `);

  const [reportTrendRows] = await pool.query(`
    SELECT DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', ?), '%Y-%m') AS month, COUNT(*) AS count
    FROM reports
    WHERE deleted_at IS NULL
      AND created_at >= CONVERT_TZ(?, ?, '+00:00')
    GROUP BY month
    ORDER BY month ASC
  `, [APP_TIME_ZONE, `${firstMonth} 00:00:00`, APP_TIME_ZONE]);

  const [pendingReports] = await pool.query(`
    SELECT r.id, r.reference_number, r.violation_type, r.created_at,
      b.name AS barangay_name
    FROM reports r LEFT JOIN barangays b ON b.id = r.barangay_id
    WHERE r.deleted_at IS NULL AND r.status = 'SUBMITTED'
    ORDER BY r.created_at ASC, r.id ASC
    LIMIT 100
  `);

  const [residentTrendRows] = await pool.query(`
    SELECT DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', ?), '%Y-%m') AS month, COUNT(*) AS count
    FROM users
    WHERE role = 'RESIDENT'
      AND deleted_at IS NULL
      AND created_at >= CONVERT_TZ(?, ?, '+00:00')
    GROUP BY month
    ORDER BY month ASC
  `, [APP_TIME_ZONE, `${firstMonth} 00:00:00`, APP_TIME_ZONE]);

  const [recentReports] = await pool.query(`
    SELECT
      r.id,
      r.reference_number,
      r.violation_type,
      b.name AS barangay_name,
      r.landmark,
      COALESCE(u.full_name, 'Anonymous Resident') AS reporter_name,
      r.status,
      r.created_at
    FROM reports r
    JOIN barangays b ON b.id = r.barangay_id
    LEFT JOIN users u ON u.id = r.user_id
    WHERE r.deleted_at IS NULL
    ORDER BY r.created_at DESC, r.id DESC
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
    ORDER BY al.created_at DESC, al.id DESC
    LIMIT 8
  `);

  const [truckRows] = await pool.query(`
    SELECT t.id, t.name, t.plate_number, t.availability_status,
      (SELECT MIN(u.full_name) FROM drivers d JOIN users u ON u.id = d.user_id
       WHERE d.truck_id = t.id AND u.deleted_at IS NULL AND u.status = 'ACTIVE') AS driver_name
    FROM trucks t ORDER BY t.created_at ASC, t.id ASC
  `);
  const [runStopRows] = await pool.query(`
    SELECT rr.id AS run_id, rr.truck_id, rr.route_name, rr.status AS run_status,
      u.full_name AS driver_name, rrs.id AS stop_id, rrs.barangay_id,
      b.name AS barangay_name, rrs.status AS stop_status,
      rrs.stop_name, rrs.completed_at
    FROM route_runs rr
    LEFT JOIN drivers d ON d.id = rr.driver_id
    LEFT JOIN users u ON u.id = d.user_id
    LEFT JOIN route_run_stops rrs ON rrs.route_run_id = rr.id
    LEFT JOIN barangays b ON b.id = rrs.barangay_id
    WHERE rr.run_date = ?
    ORDER BY rr.scheduled_start_time ASC, rr.id ASC, rrs.stop_order ASC
  `, [todayDate]);
  const { trucks, barangays } = summarizeTodayOperations(truckRows, runStopRows);
  const truckNames = new Map(truckRows.map((truck) => [truck.id, truck.name]));
  const missedStops = runStopRows.filter((row) => row.run_status !== "CANCELLED" && row.stop_status === "MISSED");
  const attentionItems = [
    ...missedStops.map((stop) => ({
      id: `stop:${stop.stop_id}`, kind: "missed_stop", target_id: stop.truck_id,
      title: `${truckNames.get(stop.truck_id) || "Truck"} · ${stop.route_name || "Collection route"}`,
      description: `Missed stop: ${stop.stop_name || stop.barangay_name || "Location unavailable"}`,
      occurred_at: stop.completed_at,
    })),
    ...pendingReports.map((report) => ({
      id: `report:${report.id}`, kind: "report", target_id: report.id,
      title: `${report.reference_number || "Waste report"} · ${report.barangay_name || "Location unavailable"}`,
      description: `${report.violation_type.replaceAll("_", " ").toLowerCase()} · Awaiting review`,
      occurred_at: report.created_at,
    })),
    ...truckRows.filter((truck) => truck.availability_status === "UNDER_MAINTENANCE").map((truck) => ({
      id: `truck:${truck.id}`, kind: "maintenance", target_id: truck.id,
      title: `${truck.name} · ${truck.plate_number}`,
      description: "Under maintenance", occurred_at: null,
    })),
  ];

  const reportsTotal = toNumber(overviewRow.reports_total);
  const reportsResolved = toNumber(overviewRow.reports_resolved);
  const resolutionRate = reportsTotal
    ? `${((reportsResolved / reportsTotal) * 100).toFixed(2)}%`
    : "0.00%";

  return {
    overview: {
      as_of_date: todayDate,
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
    attention: {
      awaiting_triage: toNumber(attentionRow.awaiting_triage),
      maintenance_trucks: toNumber(attentionRow.maintenance_trucks),
      missed_stops: missedStops.length,
      items: attentionItems,
    },
    recentReports,
    activityLogs,
    trucks,
    barangays,
  };
};

module.exports = { getAdminDashboard, summarizeTodayOperations };
