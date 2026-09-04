const crypto = require("crypto");
const { pool } = require("../../config/db");
const auditService = require("../audit/audit.service");

// ─── Centralized Calendar Events ───────────────────────────

/**
 * Get all calendar events with strict role-based visibility:
 * - ADMIN: Can view all (PRIVATE_EVENT, COMMUNITY_EVENT, COLLECTION_SCHEDULE)
 * - RESIDENT / GUEST: Can ONLY view PUBLIC events (PRIVATE_EVENT is strictly excluded by DB query)
 */
const getEvents = async (filters = {}, user = null) => {
  const isAdmin = user && user.role === "ADMIN";
  const conditions = ["s.deleted_at IS NULL"];
  const params = [];

  // Backend Security: Non-admins can NEVER query private events
  if (!isAdmin) {
    conditions.push("s.visibility = 'PUBLIC'");

    // If resident has an assigned barangay, show general collection or their barangay
    if (user && user.barangay_id) {
      conditions.push(
        "(s.event_type != 'COLLECTION_SCHEDULE' OR s.barangay_id IS NULL OR s.barangay_id = ?)",
      );
      params.push(user.barangay_id);
    }
  }

  if (filters.month) {
    conditions.push("DATE_FORMAT(s.event_date, '%Y-%m') = ?");
    params.push(filters.month);
  } else if (filters.year) {
    conditions.push("YEAR(s.event_date) = ?");
    params.push(filters.year);
  }

  if (filters.event_type) {
    conditions.push("s.event_type = ?");
    params.push(filters.event_type);
  }

  if (filters.visibility && isAdmin) {
    conditions.push("s.visibility = ?");
    params.push(filters.visibility);
  }

  if (filters.status) {
    conditions.push("s.status = ?");
    params.push(filters.status);
  }

  if (filters.barangay_id) {
    conditions.push("s.barangay_id = ?");
    params.push(filters.barangay_id);
  }

  const query = `
    SELECT 
      s.id,
      s.title,
      s.description,
      s.event_date,
      s.start_time,
      s.end_time,
      s.event_type,
      s.visibility,
      s.location,
      s.barangay_id,
      s.status,
      s.created_by,
      s.created_at,
      s.updated_at,
      b.name AS barangay_name,
      u.full_name AS creator_name
    FROM schedules s
    LEFT JOIN barangays b ON b.id = s.barangay_id
    LEFT JOIN users u ON u.id = s.created_by
    WHERE ${conditions.join(" AND ")}
    ORDER BY s.event_date ASC, s.start_time ASC
  `;

  const [rows] = await pool.query(query, params);
  return rows;
};

const getEventById = async (id, user = null) => {
  const isAdmin = user && user.role === "ADMIN";
  const conditions = ["s.id = ?", "s.deleted_at IS NULL"];
  const params = [id];

  if (!isAdmin) {
    conditions.push("s.visibility = 'PUBLIC'");
  }

  const query = `
    SELECT 
      s.id,
      s.title,
      s.description,
      s.event_date,
      s.start_time,
      s.end_time,
      s.event_type,
      s.visibility,
      s.location,
      s.barangay_id,
      s.status,
      s.created_by,
      s.created_at,
      s.updated_at,
      b.name AS barangay_name,
      u.full_name AS creator_name
    FROM schedules s
    LEFT JOIN barangays b ON b.id = s.barangay_id
    LEFT JOIN users u ON u.id = s.created_by
    WHERE ${conditions.join(" AND ")}
    LIMIT 1
  `;

  const [rows] = await pool.query(query, params);
  if (rows.length === 0) {
    throw { statusCode: 404, message: "Calendar event not found" };
  }
  return rows[0];
};

const createEvent = async (data, user) => {
  const id = crypto.randomUUID();
  const {
    title,
    description = null,
    event_date,
    start_time = null,
    end_time = null,
    event_type = "PRIVATE_EVENT",
    visibility = "PRIVATE",
    location = null,
    barangay_id = null,
    status = "UPCOMING",
  } = data;

  await pool.query(
    `INSERT INTO schedules (
      id, title, description, event_date, start_time, end_time,
      event_type, visibility, location, barangay_id, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      title,
      description,
      event_date,
      start_time,
      end_time,
      event_type,
      visibility,
      location,
      barangay_id,
      status,
      user.id,
    ],
  );

  auditService.log({
    user_id: user.id,
    action: "CREATE_CALENDAR_EVENT",
    module: "schedule",
    record_id: id,
    new_value: { title, event_date, event_type, visibility },
  }).catch(() => {});

  return getEventById(id, user);
};

const updateEvent = async (id, data, user) => {
  const existing = await getEventById(id, user);

  const allowedFields = [
    "title",
    "description",
    "event_date",
    "start_time",
    "end_time",
    "event_type",
    "visibility",
    "location",
    "barangay_id",
    "status",
  ];

  const updates = [];
  const params = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(data[field]);
    }
  }

  if (updates.length > 0) {
    params.push(id);
    await pool.query(
      `UPDATE schedules SET ${updates.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
      params,
    );
  }

  auditService.log({
    user_id: user.id,
    action: "UPDATE_CALENDAR_EVENT",
    module: "schedule",
    record_id: id,
    old_value: existing,
    new_value: data,
  }).catch(() => {});

  return getEventById(id, user);
};

const deleteEvent = async (id, user) => {
  const existing = await getEventById(id, user);

  await pool.query(
    "UPDATE schedules SET deleted_at = NOW() WHERE id = ?",
    [id],
  );

  auditService.log({
    user_id: user.id,
    action: "DELETE_CALENDAR_EVENT",
    module: "schedule",
    record_id: id,
    old_value: { title: existing.title, event_date: existing.event_date },
  }).catch(() => {});

  return { success: true, message: "Calendar event deleted successfully" };
};

// ─── Legacy 7-Day Collection Schedule ─────────────────────

const getAll = async () => {
  const [rows] = await pool.query(
    `SELECT * FROM collection_schedule
     ORDER BY FIELD(day_of_week,
       'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'
     )`,
  );
  return rows;
};

const getById = async (id) => {
  const [rows] = await pool.query(
    "SELECT * FROM collection_schedule WHERE id = ?",
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Schedule entry not found" };
  }

  return rows[0];
};

const update = async (id, { waste_type }) => {
  const existing = await getById(id);

  await pool.query(
    "UPDATE collection_schedule SET waste_type = ? WHERE id = ?",
    [waste_type, id],
  );

  const updated = await getById(id);

  auditService.log({
    user_id: "admin",
    action: "UPDATE_COLLECTION_SCHEDULE",
    module: "schedule",
    record_id: id,
    old_value: { day: existing.day_of_week, waste_type: existing.waste_type },
    new_value: { day: updated.day_of_week, waste_type: updated.waste_type },
  }).catch(() => {});

  return updated;
};

// ─── Reminder Settings ─────────────────────────────────────

const getReminder = async () => {
  const [rows] = await pool.query("SELECT * FROM reminder_settings LIMIT 1");

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Reminder settings not found" };
  }

  return rows[0];
};

const updateReminder = async ({ timing }) => {
  const reminder = await getReminder();

  await pool.query("UPDATE reminder_settings SET timing = ? WHERE id = ?", [
    timing,
    reminder.id,
  ]);

  auditService.log({
    user_id: "admin",
    action: "UPDATE_REMINDER_SETTINGS",
    module: "schedule",
    record_id: reminder.id,
    old_value: { timing: reminder.timing },
    new_value: { timing },
  }).catch(() => {});

  return getReminder();
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getAll,
  getById,
  update,
  getReminder,
  updateReminder,
};
