const { pool } = require("../../config/db");

let hasBarangayNotesColumnCache = null;

const hasBarangayNotesColumn = async () => {
  if (hasBarangayNotesColumnCache !== null) {
    return hasBarangayNotesColumnCache;
  }

  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'barangays'
       AND COLUMN_NAME = 'notes'`,
  );

  hasBarangayNotesColumnCache = Number(row?.count || 0) > 0;
  return hasBarangayNotesColumnCache;
};

const getAll = async ({ search, zone, status, priority }) => {
  let query = `SELECT * FROM barangays WHERE 1=1`;
  const params = [];

  if (search) {
    query += ` AND name LIKE ?`;
    params.push(`%${search}%`);
  }

  if (zone) {
    query += ` AND zone = ?`;
    params.push(zone);
  }

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }

  if (priority === "true") {
    query += ` AND is_priority = TRUE`;
  }

  query += ` ORDER BY name ASC`;

  const [barangays] = await pool.query(query, params);
  return barangays;
};

const getById = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM barangays WHERE id = ?`, [id]);

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Barangay not found" };
  }

  return rows[0];
};

const update = async (id, data) => {
  const barangay = await getById(id);

  const fields = [];
  const params = [];

  if (data.zone !== undefined) {
    fields.push("zone = ?");
    params.push(data.zone);
  }

  if (data.is_priority !== undefined) {
    fields.push("is_priority = ?");
    params.push(data.is_priority);
  }

  if (data.status !== undefined) {
    fields.push("status = ?");
    params.push(data.status);
  }

  if (data.notes !== undefined) {
    const notesColumnExists = await hasBarangayNotesColumn();
    if (!notesColumnExists) {
      throw {
        statusCode: 400,
        message:
          "Missing column barangays.notes. Run: ALTER TABLE barangays ADD COLUMN notes TEXT NULL;",
      };
    }
    fields.push("notes = ?");
    params.push(data.notes);
  }

  if (fields.length === 0) {
    return barangay;
  }

  params.push(id);

  await pool.query(
    `UPDATE barangays SET ${fields.join(", ")} WHERE id = ?`,
    params,
  );

  return getById(id);
};

const getStats = async (id) => {
  await getById(id);

  const [[reportStats]] = await pool.query(
    `SELECT
       COUNT(*) as total_reports,
       SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved_reports,
       SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) as pending_reports
     FROM reports
     WHERE barangay_id = ?`,
    [id],
  );

  const [[residentCount]] = await pool.query(
    `SELECT COUNT(*) as total_residents
     FROM users
     WHERE barangay_id = ? AND role = 'RESIDENT' AND deleted_at IS NULL`,
    [id],
  );

  const [[collectionStats]] = await pool.query(
    `SELECT
       COUNT(*) as total_stops,
       SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) as completed_stops,
       SUM(CASE WHEN status = 'MISSED' THEN 1 ELSE 0 END) as missed_stops
     FROM route_stops
     WHERE barangay_id = ?`,
    [id],
  );

  return {
    total_residents: residentCount.total_residents,
    total_reports: reportStats.total_reports,
    resolved_reports: reportStats.resolved_reports,
    pending_reports: reportStats.pending_reports,
    total_stops: collectionStats.total_stops,
    completed_stops: collectionStats.completed_stops,
    missed_stops: collectionStats.missed_stops,
  };
};
const getAdminOverview = async ({ search, zone, status, priority }) => {
  const where = ["1=1"];
  const params = [];

  if (search) {
    where.push("b.name LIKE ?");
    params.push(`%${search}%`);
  }

  if (zone) {
    where.push("b.zone = ?");
    params.push(zone);
  }

  if (status) {
    where.push("b.status = ?");
    params.push(status);
  }

  if (priority === "true") {
    where.push("b.is_priority = TRUE");
  }

  const [barangays] = await pool.query(
    `SELECT b.*
     FROM barangays b
     WHERE ${where.join(" AND ")}
     ORDER BY b.name ASC`,
    params,
  );

  if (barangays.length === 0) {
    return [];
  }

  const barangayIds = barangays.map((row) => row.id);
  const placeholders = barangayIds.map(() => "?").join(", ");

  const [reportStatsRows] = await pool.query(
    `SELECT
       barangay_id,
       COUNT(*) AS total_reports,
       SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_reports,
       SUM(CASE WHEN status = 'SUBMITTED' THEN 1 ELSE 0 END) AS pending_reports
     FROM reports
     WHERE barangay_id IN (${placeholders})
     GROUP BY barangay_id`,
    barangayIds,
  );

  const [residentRows] = await pool.query(
    `SELECT
       barangay_id,
       COUNT(*) AS total_residents
     FROM users
     WHERE barangay_id IN (${placeholders})
       AND role = 'RESIDENT'
       AND deleted_at IS NULL
     GROUP BY barangay_id`,
    barangayIds,
  );

  const [collectionRows] = await pool.query(
    `SELECT
       barangay_id,
       COUNT(*) AS total_stops,
       SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) AS completed_stops,
       SUM(CASE WHEN status = 'MISSED' THEN 1 ELSE 0 END) AS missed_stops
     FROM route_stops
     WHERE barangay_id IN (${placeholders})
     GROUP BY barangay_id`,
    barangayIds,
  );

  const [routeRows] = await pool.query(
    `SELECT
       rs.barangay_id,
       r.id AS route_id,
       r.name AS route_name,
       r.day_of_week,
       r.waste_type,
       r.status AS route_status,
       t.name AS truck_name,
       COALESCE(u.full_name, 'Unassigned') AS driver_name
     FROM route_stops rs
     JOIN routes r ON r.id = rs.route_id
     JOIN trucks t ON t.id = r.truck_id
     LEFT JOIN drivers d ON d.id = r.driver_id
     LEFT JOIN users u ON u.id = d.user_id
     WHERE rs.barangay_id IN (${placeholders})
     ORDER BY r.day_of_week ASC, r.start_time ASC`,
    barangayIds,
  );

  const [recentReportRows] = await pool.query(
    `SELECT
       r.id,
       r.barangay_id,
       r.reference_number,
       r.violation_type,
       r.status,
       r.created_at
     FROM reports r
     WHERE r.barangay_id IN (${placeholders})
     ORDER BY r.created_at DESC`,
    barangayIds,
  );

  const reportStatsByBarangay = new Map(
    reportStatsRows.map((row) => [row.barangay_id, row]),
  );
  const residentsByBarangay = new Map(
    residentRows.map((row) => [row.barangay_id, row]),
  );
  const collectionByBarangay = new Map(
    collectionRows.map((row) => [row.barangay_id, row]),
  );

  const routesByBarangay = new Map();
  for (const row of routeRows) {
    if (!routesByBarangay.has(row.barangay_id)) {
      routesByBarangay.set(row.barangay_id, []);
    }
    const bucket = routesByBarangay.get(row.barangay_id);
    if (!bucket.some((item) => item.route_id === row.route_id)) {
      bucket.push(row);
    }
  }

  const recentReportsByBarangay = new Map();
  for (const row of recentReportRows) {
    if (!recentReportsByBarangay.has(row.barangay_id)) {
      recentReportsByBarangay.set(row.barangay_id, []);
    }
    const bucket = recentReportsByBarangay.get(row.barangay_id);
    if (bucket.length < 5) {
      bucket.push(row);
    }
  }

  return barangays.map((barangay) => ({
    ...barangay,
    stats: {
      total_residents: Number(
        residentsByBarangay.get(barangay.id)?.total_residents || 0,
      ),
      total_reports: Number(
        reportStatsByBarangay.get(barangay.id)?.total_reports || 0,
      ),
      resolved_reports: Number(
        reportStatsByBarangay.get(barangay.id)?.resolved_reports || 0,
      ),
      pending_reports: Number(
        reportStatsByBarangay.get(barangay.id)?.pending_reports || 0,
      ),
      total_stops: Number(
        collectionByBarangay.get(barangay.id)?.total_stops || 0,
      ),
      completed_stops: Number(
        collectionByBarangay.get(barangay.id)?.completed_stops || 0,
      ),
      missed_stops: Number(
        collectionByBarangay.get(barangay.id)?.missed_stops || 0,
      ),
    },
    assigned_routes: routesByBarangay.get(barangay.id) || [],
    recent_reports: recentReportsByBarangay.get(barangay.id) || [],
  }));
};

module.exports = { getAll, getById, update, getStats, getAdminOverview };
