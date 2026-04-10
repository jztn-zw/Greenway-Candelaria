const { pool } = require("../../config/db");

// ─── Get All Schedule ──────────────────────────────────────

const getAll = async () => {
  const [rows] = await pool.query(
    `SELECT * FROM collection_schedule
     ORDER BY FIELD(day_of_week,
       'MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'
     )`,
  );
  return rows;
};

// ─── Get Single Schedule Entry ─────────────────────────────

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

// ─── Update Schedule Entry ─────────────────────────────────

const update = async (id, { waste_type }) => {
  await getById(id);

  await pool.query(
    "UPDATE collection_schedule SET waste_type = ? WHERE id = ?",
    [waste_type, id],
  );

  return getById(id);
};

// ─── Get Reminder Settings ─────────────────────────────────

const getReminder = async () => {
  const [rows] = await pool.query("SELECT * FROM reminder_settings LIMIT 1");

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Reminder settings not found" };
  }

  return rows[0];
};

// ─── Update Reminder Settings ──────────────────────────────

const updateReminder = async ({ timing }) => {
  const reminder = await getReminder();

  await pool.query("UPDATE reminder_settings SET timing = ? WHERE id = ?", [
    timing,
    reminder.id,
  ]);

  return getReminder();
};

module.exports = {
  getAll,
  getById,
  update,
  getReminder,
  updateReminder,
};
