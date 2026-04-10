const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");

const ping = async (userId, { latitude, longitude, truck_id }) => {
  const [driverRows] = await pool.query(
    "SELECT id, truck_id FROM drivers WHERE user_id = ?",
    [userId],
  );
  if (driverRows.length === 0)
    throw { statusCode: 404, message: "Driver profile not found" };

  const driver = driverRows[0];

  if (!driver.truck_id) {
    throw {
      statusCode: 400,
      message: "Driver has no truck assigned",
    };
  }

  if (driver.truck_id !== truck_id) {
    throw {
      statusCode: 403,
      message: "You can only send tracking updates for your assigned truck",
    };
  }

  const logId = generateId();

  // ✅ Use a transaction for robustness
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO tracking_logs (id, truck_id, driver_id, latitude, longitude) VALUES (?, ?, ?, ?, ?)`,
      [logId, truck_id, driver.id, latitude, longitude],
    );

    await connection.query(
      `UPDATE trucks SET status = 'ON_THE_WAY' WHERE id = ?`,
      [truck_id],
    );

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const [log] = await pool.query(
    `SELECT tl.*, t.name AS truck_name, u.full_name AS driver_name
     FROM tracking_logs tl
     JOIN trucks t ON t.id = tl.truck_id
     JOIN drivers d ON d.id = tl.driver_id
     JOIN users u ON u.id = d.user_id
     WHERE tl.id = ?`,
    [logId],
  );

  return log[0];
};

// ─── Get latest location per truck (live view) ─────────────

const getLive = async () => {
  const [rows] = await pool.query(
    `SELECT
       tl.truck_id,
       tl.driver_id,
       tl.latitude,
       tl.longitude,
       tl.created_at  AS last_ping,
       t.name         AS truck_name,
       t.plate_number AS truck_plate,
       t.status       AS truck_status,
       u.full_name    AS driver_name
     FROM tracking_logs tl
     JOIN trucks  t ON t.id = tl.truck_id
     JOIN drivers d ON d.id = tl.driver_id
     JOIN users   u ON u.id = d.user_id
     INNER JOIN (
       SELECT truck_id, MAX(created_at) AS latest
       FROM tracking_logs
       GROUP BY truck_id
     ) latest_ping
       ON tl.truck_id = latest_ping.truck_id
      AND tl.created_at = latest_ping.latest
     ORDER BY tl.created_at DESC`,
  );

  return rows;
};

// ─── Get history for a specific truck ─────────────────────

const getHistory = async (truckId) => {
  // Validate truck exists
  const [truckCheck] = await pool.query("SELECT id FROM trucks WHERE id = ?", [
    truckId,
  ]);

  if (truckCheck.length === 0) {
    throw { statusCode: 404, message: "Truck not found" };
  }

  const [rows] = await pool.query(
    `SELECT
       tl.*,
       t.name         AS truck_name,
       t.plate_number AS truck_plate,
       u.full_name    AS driver_name
     FROM tracking_logs tl
     JOIN trucks  t ON t.id = tl.truck_id
     JOIN drivers d ON d.id = tl.driver_id
     JOIN users   u ON u.id = d.user_id
     WHERE tl.truck_id = ?
     ORDER BY tl.created_at DESC`,
    [truckId],
  );

  return rows;
};

// ─── Clear history for a specific truck ───────────────────

const clearHistory = async (truckId) => {
  const [truckCheck] = await pool.query("SELECT id FROM trucks WHERE id = ?", [
    truckId,
  ]);

  if (truckCheck.length === 0) {
    throw { statusCode: 404, message: "Truck not found" };
  }

  await pool.query("DELETE FROM tracking_logs WHERE truck_id = ?", [truckId]);

  // Reset truck status to OFFLINE
  await pool.query(`UPDATE trucks SET status = 'OFFLINE' WHERE id = ?`, [
    truckId,
  ]);

  return { message: "Tracking history cleared" };
};

module.exports = { ping, getLive, getHistory, clearHistory };
