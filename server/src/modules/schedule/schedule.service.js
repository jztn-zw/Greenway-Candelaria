const crypto = require("crypto");
const { pool } = require("../../config/db");
const auditService = require("../audit/audit.service");
const { notifyAllResidents } = require("../notifications/notifications.service");

// ─── Centralized Calendar Events ───────────────────────────

const validateEventDetails = async (event) => {
  if (event.end_date && event.event_date && event.end_date < event.event_date) {
    throw { statusCode: 400, message: "End date cannot be earlier than the start date" };
  }

  if (event.event_type === "PRIVATE_EVENT" && event.visibility !== "PRIVATE") {
    throw { statusCode: 400, message: "Private events must remain private" };
  }
  if (event.event_type !== "PRIVATE_EVENT" && event.visibility !== "PUBLIC") {
    throw { statusCode: 400, message: "Community and collection events must be public" };
  }

  if (event.barangay_id) {
    const [barangays] = await pool.query(
      "SELECT id FROM barangays WHERE id = ?",
      [event.barangay_id],
    );
    if (barangays.length === 0) {
      throw { statusCode: 404, message: "Barangay not found" };
    }
  }
};

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
    // Resident calendar content is deliberately published from announcements,
    // never directly from MENRO's internal Schedule Manager.
    conditions.push(`s.announcement_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = s.announcement_id
        AND a.status = 'ACTIVE'
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
        AND (a.target_all = TRUE OR EXISTS (
          SELECT 1 FROM announcement_barangays ab
          WHERE ab.announcement_id = a.id AND ab.barangay_id = ?
        ))
    )`);
    params.push(user?.barangay_id || "");
  }

  if (filters.month) {
    conditions.push("s.event_date <= LAST_DAY(CONCAT(?, '-01')) AND COALESCE(s.end_date, s.event_date) >= CONCAT(?, '-01')");
    params.push(filters.month, filters.month);
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
    conditions.push("CASE WHEN s.event_date > CURDATE() THEN 'UPCOMING' WHEN COALESCE(s.end_date, s.event_date) < CURDATE() THEN 'COMPLETED' ELSE 'ONGOING' END = ?");
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
      s.end_date,
      s.start_time,
      s.end_time,
      s.event_type,
      s.visibility,
      s.location,
      s.barangay_id,
      CASE WHEN s.event_date > CURDATE() THEN 'UPCOMING' WHEN COALESCE(s.end_date, s.event_date) < CURDATE() THEN 'COMPLETED' ELSE 'ONGOING' END AS status,
      s.created_by,
      s.announcement_id,
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
    conditions.push(`s.announcement_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = s.announcement_id
        AND a.status = 'ACTIVE'
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
        AND (a.target_all = TRUE OR EXISTS (
          SELECT 1 FROM announcement_barangays ab
          WHERE ab.announcement_id = a.id AND ab.barangay_id = ?
        ))
    )`);
    params.push(user?.barangay_id || "");
  }

  const query = `
    SELECT 
      s.id,
      s.title,
      s.description,
      s.event_date,
      s.end_date,
      s.start_time,
      s.end_time,
      s.event_type,
      s.visibility,
      s.location,
      s.barangay_id,
      CASE WHEN s.event_date > CURDATE() THEN 'UPCOMING' WHEN COALESCE(s.end_date, s.event_date) < CURDATE() THEN 'COMPLETED' ELSE 'ONGOING' END AS status,
      s.created_by,
      s.announcement_id,
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
    end_date = null,
  } = data;

  await validateEventDetails({
    event_date,
    end_date,
    event_type: "PRIVATE_EVENT",
    visibility: "PRIVATE",
    barangay_id: null,
  });

  await pool.query(
    `INSERT INTO schedules (
      id, title, description, event_date, end_date, start_time, end_time,
      event_type, visibility, location, barangay_id, status, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
       id,
      title,
       description,
       event_date,
       end_date,
       null,
       null,
      "PRIVATE_EVENT",
      "PRIVATE",
      null,
      null,
      "UPCOMING",
      user.id,
    ],
  );

  auditService.log({
    user_id: user.id,
    action: "CREATE_CALENDAR_EVENT",
    module: "schedule",
    record_id: id,
    new_value: { title, event_date, end_date, event_type: "PRIVATE_EVENT", visibility: "PRIVATE" },
  }).catch(() => {});

  return getEventById(id, user);
};

const updateEvent = async (id, data, user) => {
  const existing = await getEventById(id, user);
  if (existing.event_type !== "PRIVATE_EVENT" || existing.announcement_id) {
    throw { statusCode: 403, message: "Resident calendar entries are managed from Announcements." };
  }

  await validateEventDetails({
    event_date: data.event_date === undefined ? existing.event_date : data.event_date,
    end_date: data.end_date === undefined ? existing.end_date : data.end_date,
    event_type: "PRIVATE_EVENT",
    visibility: "PRIVATE",
    barangay_id: null,
  });

  const allowedFields = [
    "title",
    "description",
    "event_date",
    "end_date",
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
      `UPDATE schedules SET ${updates.join(", ")}, start_time = NULL, end_time = NULL, location = NULL WHERE id = ? AND deleted_at IS NULL`,
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
  if (existing.event_type !== "PRIVATE_EVENT" || existing.announcement_id) {
    throw { statusCode: 403, message: "Resident calendar entries are managed from Announcements." };
  }

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

const createRule = async ({ day_of_week, waste_type, start_time, end_time = null }, adminId) => {
  if (end_time && start_time >= end_time) {
    throw { statusCode: 400, message: "End time must be later than start time" };
  }
  const [existing] = await pool.query(
    "SELECT id FROM collection_schedule WHERE day_of_week = ?",
    [day_of_week],
  );
  if (existing.length > 0) {
    throw { statusCode: 409, message: "A collection rule already exists for this day" };
  }

  const id = crypto.randomUUID();
  await pool.query(
    "INSERT INTO collection_schedule (id, day_of_week, waste_type, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
    [id, day_of_week, waste_type, start_time, end_time],
  );
  const created = await getById(id);
  auditService.log({
    user_id: adminId,
    action: "CREATE_COLLECTION_SCHEDULE",
    module: "schedule",
    record_id: id,
    new_value: { day: day_of_week, waste_type, start_time, end_time },
  }).catch(() => {});
  return created;
};

const update = async (id, { waste_type, start_time, end_time }, adminId) => {
  const existing = await getById(id);

  if (start_time && end_time && start_time >= end_time) {
    throw { statusCode: 400, message: "End time must be later than start time" };
  }

  await pool.query(
    "UPDATE collection_schedule SET waste_type = ?, start_time = COALESCE(?, start_time), end_time = ? WHERE id = ?",
    [waste_type, start_time || null, end_time === undefined ? existing.end_time : end_time, id],
  );

  const updated = await getById(id);

  auditService.log({
    user_id: adminId,
    action: "UPDATE_COLLECTION_SCHEDULE",
    module: "schedule",
    record_id: id,
    old_value: { day: existing.day_of_week, waste_type: existing.waste_type, start_time: existing.start_time, end_time: existing.end_time },
    new_value: { day: updated.day_of_week, waste_type: updated.waste_type, start_time: updated.start_time, end_time: updated.end_time },
  }).catch(() => {});

  return updated;
};

// ─── Reminder Settings ─────────────────────────────────────

const getReminder = async () => {
  const [rows] = await pool.query("SELECT * FROM reminder_settings LIMIT 1");

  if (rows.length > 0) {
    return rows[0];
  }

  // Older databases may have the table but no singleton configuration row.
  // Create it lazily so the reminder feature becomes usable without seeds.
  const id = "system-reminder-settings";
  try {
    await pool.query(
      "INSERT INTO reminder_settings (id, timing) VALUES (?, ?)",
      [id, 3],
    );
  } catch (error) {
    if (error.code !== "ER_DUP_ENTRY") throw error;
  }
  const [created] = await pool.query("SELECT * FROM reminder_settings WHERE id = ?", [id]);
  return created[0];
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

// ─── Collection Reminder Delivery ──────────────────────────

const MANILA_TIME_ZONE = "Asia/Manila";
const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

const getManilaDate = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const addManilaDays = (dateString, days) => {
  const date = new Date(`${dateString}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const getManilaDayOfWeek = (dateString) => DAYS[new Date(`${dateString}T12:00:00+08:00`).getUTCDay()];

const getScheduleStart = (dateString, startTime) => {
  const time = String(startTime).slice(0, 8).padEnd(8, ":00");
  return new Date(`${dateString}T${time}+08:00`);
};

const claimReminderDelivery = async (scheduleId, collectionDate, timing) => {
  try {
    await pool.query(
      `INSERT INTO collection_schedule_reminder_log
       (id, schedule_id, collection_date, reminder_timing)
       VALUES (?, ?, ?, ?)`,
      [crypto.randomUUID(), scheduleId, collectionDate, timing],
    );
    return true;
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return false;
    throw error;
  }
};

const dispatchDueCollectionReminders = async (now = new Date()) => {
  const reminder = await getReminder();
  const timing = Number(reminder.timing);
  const [rules] = await pool.query(
    "SELECT id, day_of_week, waste_type, start_time FROM collection_schedule",
  );
  const today = getManilaDate(now);
  let delivered = 0;

  // A maximum setting of 72 hours means a reminder can be due for a rule up
  // to three days away. The delivery log makes this safe across restarts.
  for (let offset = 0; offset <= Math.ceil(timing / 24); offset += 1) {
    const collectionDate = addManilaDays(today, offset);
    const dayOfWeek = getManilaDayOfWeek(collectionDate);
    const matchingRules = rules.filter((rule) => rule.day_of_week === dayOfWeek);

    for (const rule of matchingRules) {
      const collectionStart = getScheduleStart(collectionDate, rule.start_time);
      const reminderAt = new Date(collectionStart.getTime() - timing * 60 * 60 * 1000);
      if (now < reminderAt || now >= collectionStart) continue;

      const claimed = await claimReminderDelivery(rule.id, collectionDate, timing);
      if (!claimed) continue;

      try {
        const wasteLabel = rule.waste_type === "BIODEGRADABLE" ? "biodegradable" : "non-biodegradable";
        await notifyAllResidents({
          type: "COLLECTION_REMINDER",
          title: "Collection reminder",
          body: `Please prepare your ${wasteLabel} waste for collection on ${collectionDate} at ${String(rule.start_time).slice(0, 5)}.`,
          ref_id: rule.id,
          ref_module: "collection_schedule",
          metadata: { collection_date: collectionDate, waste_type: rule.waste_type },
        });
        delivered += 1;
      } catch (error) {
        // Do not permanently suppress a reminder if notification persistence
        // fails. A later scheduler run can safely retry it.
        await pool.query(
          "DELETE FROM collection_schedule_reminder_log WHERE schedule_id = ? AND collection_date = ? AND reminder_timing = ?",
          [rule.id, collectionDate, timing],
        );
        throw error;
      }
    }
  }

  return delivered;
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getAll,
  getById,
  createRule,
  update,
  getReminder,
  updateReminder,
  dispatchDueCollectionReminders,
};
