const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");

// ─── Generate reference number ─────────────────────────────

const generateRef = () => {
  const ts = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 9000 + 1000);
  return `GW-${ts}-${random}`;
};

// ─── Base select ───────────────────────────────────────────

const getById = async (id) => {
  const [rows] = await pool.query(
    `SELECT
       r.*,
       b.name        AS barangay_name,
       b.zone        AS barangay_zone,
       u.full_name   AS reporter_name,
       u.email       AS reporter_email
     FROM reports r
     JOIN  barangays b ON b.id = r.barangay_id
     LEFT JOIN users u ON u.id = r.user_id
     WHERE r.id = ?`,
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Report not found" };
  }

  const report = rows[0];

  // Attach photos
  const [photos] = await pool.query(
    "SELECT * FROM report_photos WHERE report_id = ? ORDER BY created_at ASC",
    [id],
  );
  report.photos = photos;

  return report;
};

// ─── Get All (admin) ───────────────────────────────────────

const getAll = async (filters = {}) => {
  let query = `
    SELECT
      r.*,
      b.name      AS barangay_name,
      b.zone      AS barangay_zone,
      u.full_name AS reporter_name
    FROM reports r
    JOIN  barangays b ON b.id = r.barangay_id
    LEFT JOIN users u ON u.id = r.user_id
  `;

  const params = [];
  const where = [];

  if (filters.status) {
    where.push("r.status = ?");
    params.push(filters.status);
  }

  if (filters.priority) {
    where.push("r.priority = ?");
    params.push(filters.priority);
  }

  if (filters.barangay_id) {
    where.push("r.barangay_id = ?");
    params.push(filters.barangay_id);
  }

  if (filters.violation_type) {
    where.push("r.violation_type = ?");
    params.push(filters.violation_type);
  }

  if (where.length > 0) query += " WHERE " + where.join(" AND ");
  query += " ORDER BY r.created_at DESC";

  const [reports] = await pool.query(query, params);

  // Attach photos to each
  for (const report of reports) {
    const [photos] = await pool.query(
      "SELECT * FROM report_photos WHERE report_id = ? ORDER BY created_at ASC",
      [report.id],
    );
    report.photos = photos;
  }

  return reports;
};

// ─── Get My Reports (resident) ────────────────────────────

const getMyReports = async (userId) => {
  const [reports] = await pool.query(
    `SELECT
       r.*,
       b.name AS barangay_name,
       b.zone AS barangay_zone
     FROM reports r
     JOIN barangays b ON b.id = r.barangay_id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC`,
    [userId],
  );

  for (const report of reports) {
    const [photos] = await pool.query(
      "SELECT * FROM report_photos WHERE report_id = ?",
      [report.id],
    );
    report.photos = photos;
  }

  return reports;
};

// ─── Create ────────────────────────────────────────────────

const create = async (userId, data) => {
  const {
    barangay_id,
    violation_type,
    landmark,
    description,
    is_anonymous,
    pin_lat,
    pin_lng,
    photos = [],
  } = data;

  // Validate barangay
  const [bCheck] = await pool.query("SELECT id FROM barangays WHERE id = ?", [
    barangay_id,
  ]);
  if (bCheck.length === 0) {
    throw { statusCode: 404, message: "Barangay not found" };
  }

  const reportId = generateId();
  const refNumber = generateRef();

  await pool.query(
    `INSERT INTO reports
       (id, reference_number, user_id, barangay_id, violation_type,
        landmark, description, is_anonymous, pin_lat, pin_lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reportId,
      refNumber,
      is_anonymous ? null : userId,
      barangay_id,
      violation_type,
      landmark || null,
      description,
      is_anonymous ? true : false,
      pin_lat || null,
      pin_lng || null,
    ],
  );

  // Insert photos
  for (const url of photos) {
    await pool.query(
      "INSERT INTO report_photos (id, report_id, url) VALUES (?, ?, ?)",
      [generateId(), reportId, url],
    );
  }

  // Insert initial status history
  await pool.query(
    `INSERT INTO report_status_history (id, report_id, status, changed_by)
     VALUES (?, ?, 'SUBMITTED', ?)`,
    [generateId(), reportId, userId],
  );

  return getById(reportId);
};

// ─── Update Status ─────────────────────────────────────────

const updateStatus = async (id, adminId, { status, admin_response }) => {
  await getById(id);

  const fields = ["status = ?"];
  const params = [status];

  if (admin_response !== undefined) {
    fields.push("admin_response = ?");
    params.push(admin_response);
  }

  params.push(id);
  await pool.query(
    `UPDATE reports SET ${fields.join(", ")} WHERE id = ?`,
    params,
  );

  // Log status change
  await pool.query(
    `INSERT INTO report_status_history (id, report_id, status, changed_by)
     VALUES (?, ?, ?, ?)`,
    [generateId(), id, status, adminId],
  );

  return getById(id);
};

// ─── Flag Report ───────────────────────────────────────────

const flagReport = async (id, data) => {
  await getById(id);

  const fields = [];
  const params = [];

  if (data.is_false !== undefined) {
    fields.push("is_false = ?");
    params.push(data.is_false);
  }

  if (data.is_duplicate !== undefined) {
    fields.push("is_duplicate = ?");
    params.push(data.is_duplicate);
  }

  if (data.duplicate_of_id !== undefined) {
    fields.push("duplicate_of_id = ?");
    params.push(data.duplicate_of_id);
  }

  if (fields.length === 0) {
    throw { statusCode: 400, message: "Nothing to update" };
  }

  params.push(id);
  await pool.query(
    `UPDATE reports SET ${fields.join(", ")} WHERE id = ?`,
    params,
  );

  return getById(id);
};

// ─── Update Priority ───────────────────────────────────────

const updatePriority = async (id, priority) => {
  await getById(id);

  await pool.query("UPDATE reports SET priority = ? WHERE id = ?", [
    priority,
    id,
  ]);

  return getById(id);
};

// ─── Add Note ──────────────────────────────────────────────

const addNote = async (reportId, adminId, note) => {
  await getById(reportId);

  const noteId = generateId();

  await pool.query(
    `INSERT INTO report_notes (id, report_id, note, created_by)
     VALUES (?, ?, ?, ?)`,
    [noteId, reportId, note, adminId],
  );

  const [rows] = await pool.query(
    `SELECT
       n.*,
       u.full_name AS created_by_name
     FROM report_notes n
     JOIN users u ON u.id = n.created_by
     WHERE n.id = ?`,
    [noteId],
  );

  return rows[0];
};

// ─── Get Notes ─────────────────────────────────────────────

const getNotes = async (reportId) => {
  await getById(reportId);

  const [rows] = await pool.query(
    `SELECT
       n.*,
       u.full_name AS created_by_name
     FROM report_notes n
     JOIN users u ON u.id = n.created_by
     WHERE n.report_id = ?
     ORDER BY n.created_at ASC`,
    [reportId],
  );

  return rows;
};

// ─── Get Status History ────────────────────────────────────

const getStatusHistory = async (reportId) => {
  await getById(reportId);

  const [rows] = await pool.query(
    `SELECT
       h.*,
       u.full_name AS changed_by_name
     FROM report_status_history h
     JOIN users u ON u.id = h.changed_by
     WHERE h.report_id = ?
     ORDER BY h.created_at ASC`,
    [reportId],
  );

  return rows;
};

module.exports = {
  getAll,
  getById,
  getMyReports,
  create,
  updateStatus,
  flagReport,
  updatePriority,
  addNote,
  getNotes,
  getStatusHistory,
};
