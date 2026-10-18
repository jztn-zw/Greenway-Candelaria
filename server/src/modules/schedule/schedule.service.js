const crypto = require("crypto");
const { pool } = require("../../config/db");
const auditService = require("../audit/audit.service");
const notificationService = require("../notifications/notifications.service");

// ─── Centralized Calendar Events ───────────────────────────

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Manila";

const formatCalendarDate = (value) => {
  const dateKey = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return dateKey;
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) return dateKey;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const collectorScheduleNotificationBody = (eventDate, endDate, description) => {
  const start = formatCalendarDate(eventDate);
  const end = endDate && endDate !== eventDate ? ` through ${formatCalendarDate(endDate)}` : "";
  const details = typeof description === "string" ? description.trim() : "";
  return `Scheduled for ${start}${end}.${details ? `\n\nDetails: ${details}` : ""}`;
};

const getCurrentAppDate = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
};

const validateEventDetails = async (event, originalStartDate = null) => {
  if (event.event_date && event.event_date < getCurrentAppDate() && event.event_date !== originalStartDate) {
    throw { statusCode: 400, message: "Scheduled date cannot be in the past" };
  }

  if (event.end_date && event.event_date && event.end_date < event.event_date) {
    throw { statusCode: 400, message: "End date cannot be earlier than the start date" };
  }

  if (event.event_type === "PRIVATE_EVENT" && event.visibility !== "PRIVATE") {
    throw { statusCode: 400, message: "Private events must remain private" };
  }
  if (event.event_type === "COMMUNITY_EVENT" && event.visibility !== "PUBLIC") {
    throw { statusCode: 400, message: "Community events must be public" };
  }
  if (!["PRIVATE_EVENT", "COMMUNITY_EVENT"].includes(event.event_type)) {
    throw { statusCode: 400, message: "Only MENRO and community events can be managed here" };
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

// Use the app's date for both status labels and status filters, regardless of DB timezone.
const eventStatusSql = "CASE WHEN s.event_date > ? THEN 'UPCOMING' WHEN COALESCE(s.end_date, s.event_date) < ? THEN 'COMPLETED' ELSE 'ONGOING' END";

const projectCalendarEvent = (event, user, view) => {
  if (user?.role !== "DRIVER" || view !== "collector") return event;
  const { id, title, description, event_date, end_date, start_time, end_time,
    event_type, visibility, location, barangay_id, barangay_name, status } = event;
  return { id, title, description, event_date, end_date, start_time, end_time,
    event_type, visibility, location, barangay_id, barangay_name, status };
};

/**
 * Get all calendar events with strict role-based visibility:
 * - ADMIN: Can view all (PRIVATE_EVENT, COMMUNITY_EVENT, COLLECTION_SCHEDULE)
 * - DRIVER: Can read MENRO private and shared community schedules
 * - RESIDENT / GUEST: Can view active public announcements and public community events for their area
 */
const getEvents = async (filters = {}, user = null) => {
  const today = getCurrentAppDate();
  const isAdmin = user && user.role === "ADMIN";
  const isCollector = user && user.role === "DRIVER";
  const conditions = ["s.deleted_at IS NULL"];
  const params = [];

  // Collectors are MENRO staff and share community schedules, while remaining
  // read-only and excluded from resident announcement-linked calendar records.
  if (isCollector) {
    conditions.push("((s.event_type = 'PRIVATE_EVENT' AND s.visibility = 'PRIVATE') OR (s.event_type = 'COMMUNITY_EVENT' AND s.visibility = 'PUBLIC' AND s.announcement_id IS NULL))");
  } else if (!isAdmin) {
    // Manager-created events are public only when scoped to everyone or the
    // resident's barangay. Legacy announcement-linked events keep their own
    // active, expiry, and audience checks.
    conditions.push(`s.visibility = 'PUBLIC' AND (
      (s.event_type = 'COMMUNITY_EVENT' AND s.announcement_id IS NULL
        AND (s.barangay_id IS NULL OR s.barangay_id = ?))
      OR (s.announcement_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = s.announcement_id
        AND a.status = 'ACTIVE'
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
        AND (a.target_all = TRUE OR EXISTS (
          SELECT 1 FROM announcement_barangays ab
          WHERE ab.announcement_id = a.id AND ab.barangay_id = ?
        ))
      ))
    )`);
    params.push(user?.barangay_id || "", user?.barangay_id || "");
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
    conditions.push(`${eventStatusSql} = ?`);
    params.push(today, today, filters.status);
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
      ${eventStatusSql} AS status,
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

  const [rows] = await pool.query(query, [today, today, ...params]);
  return rows.map((event) => projectCalendarEvent(event, user, filters.view));
};

const getEventById = async (id, user = null) => {
  const today = getCurrentAppDate();
  const isAdmin = user && user.role === "ADMIN";
  const isCollector = user && user.role === "DRIVER";
  const conditions = ["s.id = ?", "s.deleted_at IS NULL"];
  const params = [id];

  if (isCollector) {
    conditions.push("((s.event_type = 'PRIVATE_EVENT' AND s.visibility = 'PRIVATE') OR (s.event_type = 'COMMUNITY_EVENT' AND s.visibility = 'PUBLIC' AND s.announcement_id IS NULL))");
  } else if (!isAdmin) {
    conditions.push(`s.visibility = 'PUBLIC' AND (
      (s.event_type = 'COMMUNITY_EVENT' AND s.announcement_id IS NULL
        AND (s.barangay_id IS NULL OR s.barangay_id = ?))
      OR (s.announcement_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM announcements a
      WHERE a.id = s.announcement_id
        AND a.status = 'ACTIVE'
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
        AND (a.target_all = TRUE OR EXISTS (
          SELECT 1 FROM announcement_barangays ab
          WHERE ab.announcement_id = a.id AND ab.barangay_id = ?
        ))
      ))
    )`);
    params.push(user?.barangay_id || "", user?.barangay_id || "");
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
      ${eventStatusSql} AS status,
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

  const [rows] = await pool.query(query, [today, today, ...params]);
  if (rows.length === 0) {
    throw { statusCode: 404, message: "Calendar event not found" };
  }
  return projectCalendarEvent(rows[0], user);
};

const createEvent = async (data, user) => {
  const id = crypto.randomUUID();
  const {
    title,
    description = null,
    event_date,
    end_date = null,
    event_type = "PRIVATE_EVENT",
    visibility = "PRIVATE",
    barangay_id = null,
  } = data;

  await validateEventDetails({
    event_date,
    end_date,
    event_type,
    visibility,
    barangay_id,
  });

  const connection = await pool.getConnection();
  let delivery = { notifications: [] };
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO schedules (
        id, title, description, event_date, end_date, start_time, end_time,
        event_type, visibility, location, barangay_id, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description, event_date, end_date, null, null, event_type, visibility, null, barangay_id, "UPCOMING", user.id],
    );

    const dateRange = end_date && end_date !== event_date ? ` to ${end_date}` : "";
    const notificationBody = `Scheduled for ${event_date}${dateRange}${description ? ` — ${description}` : ""}`;
    const notification = {
      title,
      body: notificationBody,
      ref_id: id,
      ref_module: "schedule",
      metadata: { category: "SCHEDULE_EVENT", event_type, event_date, end_date, barangay_id },
      db: connection,
      emit: false,
    };

    if (event_type === "COMMUNITY_EVENT") {
      const residentNotice = { ...notification, type: "ANNOUNCEMENT" };
      delivery = barangay_id
        ? await notificationService.notifyBarangayResidents({ ...residentNotice, barangay_id })
        : await notificationService.notifyAllResidents(residentNotice);
    }
    const [collectors] = await connection.query(
      "SELECT id FROM users WHERE role = 'DRIVER' AND status = 'ACTIVE' AND deleted_at IS NULL",
    );
    const collectorDelivery = await notificationService.sendToMany({
      ...notification,
      body: collectorScheduleNotificationBody(event_date, end_date, description),
      user_ids: collectors.map((collector) => collector.id),
      type: "SYSTEM",
    });
    delivery.notifications.push(...collectorDelivery.notifications);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  notificationService.emitStoredNotifications(delivery.notifications);

  auditService.log({
    user_id: user.id,
    action: "CREATE_CALENDAR_EVENT",
    module: "schedule",
    record_id: id,
    new_value: { title, event_date, end_date, event_type, visibility, barangay_id },
  }).catch(() => {});

  return getEventById(id, user);
};

const updateEvent = async (id, data, user) => {
  const existing = await getEventById(id, user);
  if (existing.announcement_id || !["PRIVATE_EVENT", "COMMUNITY_EVENT"].includes(existing.event_type)) {
    throw { statusCode: 403, message: "This calendar entry is managed by its source module." };
  }

  const eventType = data.event_type ?? existing.event_type;
  const visibility = data.visibility ?? existing.visibility;
  const barangayId = data.barangay_id === undefined ? existing.barangay_id ?? null : data.barangay_id;

  await validateEventDetails({
    event_date: data.event_date === undefined ? existing.event_date : data.event_date,
    end_date: data.end_date === undefined ? existing.end_date : data.end_date,
    event_type: eventType,
    visibility,
    barangay_id: barangayId,
  }, existing.event_date);

  const allowedFields = [
    "title",
    "description",
    "event_date",
    "end_date",
    "event_type",
    "visibility",
    "barangay_id",
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
  if (existing.announcement_id || !["PRIVATE_EVENT", "COMMUNITY_EVENT"].includes(existing.event_type)) {
    throw { statusCode: 403, message: "This calendar entry is managed by its source module." };
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

// Collection days are derived from active routes that actually cover this resident.
const getAll = async (residentId) => {
  const [rows] = await pool.query(
    `SELECT r.id, r.day_of_week, r.start_time, r.name AS route_name,
            CASE r.waste_type
              WHEN 'Biodegradable' THEN 'BIODEGRADABLE'
              WHEN 'Non-Biodegradable' THEN 'NON_BIODEGRADABLE'
              ELSE NULL
            END AS waste_type,
            NULL AS end_time
     FROM routes r
     WHERE r.status = 'ACTIVE' AND r.driver_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM users u
         JOIN route_stops rs ON rs.route_id = r.id
         WHERE u.id = ? AND u.role = 'RESIDENT' AND u.status = 'ACTIVE'
           AND u.deleted_at IS NULL AND rs.barangay_id = u.barangay_id
           AND (rs.street_id IS NULL OR rs.street_id = u.street_id)
       )
     ORDER BY FIELD(r.day_of_week,
       'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),
       r.start_time, r.id`,
    [residentId],
  );
  return rows;
};

// Public landing lookup deliberately projects only recurring collection details.
const getPublicSchedule = async ({ barangay_id, street_id }) => {
  const [areas] = await pool.query(
    `SELECT b.collection_service_available
     FROM barangays b JOIN barangay_streets bs ON bs.barangay_id = b.id
     WHERE b.id = ? AND bs.id = ? AND b.status = 'ACTIVE'`,
    [barangay_id, street_id],
  );
  if (!areas.length) throw { statusCode: 404, message: "Street not found in this barangay" };
  if (!areas[0].collection_service_available) return [];

  const [rows] = await pool.query(
    `SELECT DISTINCT r.day_of_week, r.start_time,
       CASE r.waste_type
         WHEN 'Biodegradable' THEN 'BIODEGRADABLE'
         WHEN 'Non-Biodegradable' THEN 'NON_BIODEGRADABLE'
         ELSE NULL
       END AS waste_type
     FROM routes r
     WHERE r.status = 'ACTIVE' AND r.driver_id IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM route_stops rs WHERE rs.route_id = r.id
           AND rs.barangay_id = ? AND (rs.street_id IS NULL OR rs.street_id = ?)
       )
     ORDER BY FIELD(r.day_of_week,
       'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'),
       r.start_time, waste_type`,
    [barangay_id, street_id],
  );
  return rows.map(({ day_of_week, waste_type, start_time }) => ({ day_of_week, waste_type, start_time }));
};

// ─── Reminder Settings ─────────────────────────────────────

// Keep the read contract for existing clients; stored timing is no longer used.
const getReminder = async () => ({ id: "system-reminder-settings", timing: 3 });
const updateReminder = async ({ timing }) => {
  if (timing !== 3) throw { statusCode: 400, message: "Collection reminders are fixed at 3 hours before collection." };
  return getReminder();
};
// ─── Collection Reminder Delivery ──────────────────────────

const MANILA_TIME_ZONE = "Asia/Manila";
const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const REMINDER_GRACE_MS = 5 * 60 * 1000;

const formatCollectionStart = (start) => {
  const date = new Intl.DateTimeFormat("en-PH", {
    timeZone: MANILA_TIME_ZONE, month: "long", day: "numeric", year: "numeric",
  }).format(start);
  const time = new Intl.DateTimeFormat("en-PH", {
    timeZone: MANILA_TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true,
  }).format(start);
  return `${date} at ${time}`;
};

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

const dispatchDueCollectionReminders = async (now = new Date()) => {
  const [routes] = await pool.query(
    "SELECT id, name, day_of_week, waste_type, start_time FROM routes WHERE status = 'ACTIVE' AND driver_id IS NOT NULL",
  );
  const today = getManilaDate(now);
  let delivered = 0;

  const timings = [{ label: "3h", hours: 3 }];

  for (let offset = 0; offset <= 1; offset += 1) {
    const collectionDate = addManilaDays(today, offset);
    const dayOfWeek = getManilaDayOfWeek(collectionDate);
    const matchingRoutes = routes.filter((route) => route.day_of_week === dayOfWeek);

    for (const route of matchingRoutes) {
      const collectionStart = getScheduleStart(collectionDate, route.start_time);
      if (Number.isNaN(collectionStart.getTime())) continue;
      for (const timing of timings) {
        const reminderAt = new Date(collectionStart.getTime() - timing.hours * 60 * 60 * 1000);
        if (now < reminderAt || now >= new Date(reminderAt.getTime() + REMINDER_GRACE_MS)) continue;
        const connection = await pool.getConnection();
        try {
          await connection.beginTransaction();
          const [recipients] = await connection.query(
            `SELECT u.id FROM users u
             WHERE u.role = 'RESIDENT' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
               AND EXISTS (
                 SELECT 1 FROM route_stops rs
                 WHERE rs.route_id = ? AND rs.barangay_id = u.barangay_id
                   AND (rs.street_id IS NULL OR rs.street_id = u.street_id)
               )`,
            [route.id],
          );
          if (recipients.length === 0) {
            await connection.rollback();
            continue;
          }
          await connection.query(
            `INSERT INTO route_collection_reminder_log
             (id, route_id, collection_date, reminder_timing) VALUES (?, ?, ?, ?)`,
            [crypto.randomUUID(), route.id, collectionDate, timing.hours],
          );
          const wasteLabel = route.waste_type ? `${route.waste_type.toLowerCase()} waste` : "segregated waste";
          const delivery = await notificationService.sendToMany({
            user_ids: recipients.map((resident) => resident.id),
            type: "COLLECTION_REMINDER",
            title: "Collection reminder",
            body: `Your ${wasteLabel} collection is scheduled for ${formatCollectionStart(collectionStart)}. Please have it ready.`,
            ref_id: route.id,
            ref_module: "routes",
            metadata: {
              collection_date: collectionDate,
              scheduled_start_time: String(route.start_time).slice(0, 5),
              waste_type: route.waste_type,
              reminder_timing: timing.label,
            },
            db: connection,
            emit: false,
          });
          await connection.commit();
          notificationService.emitStoredNotifications(delivery.notifications);
          delivered += delivery.sent;
        } catch (error) {
          await connection.rollback();
          if (error.code === "ER_DUP_ENTRY") continue;
          throw error;
        } finally {
          connection.release();
        }
      }
    }
  }

  return delivered;
};

module.exports = {
  getPublicSchedule,
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getAll,
  getReminder,
  updateReminder,
  dispatchDueCollectionReminders,
};
