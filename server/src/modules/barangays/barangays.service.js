const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");

const getLocalDate = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.APP_TIME_ZONE || "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const getAll = async ({ search, status } = {}) => {
  let query = `SELECT * FROM barangays WHERE 1=1`;
  const params = [];

  if (search) {
    query += ` AND name LIKE ?`;
    params.push(`%${search}%`);
  }

  if (status) {
    query += ` AND status = ?`;
    params.push(status);
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

const getStreets = async (barangayId) => {
  const [barangays] = await pool.query(
    "SELECT id, collection_service_available FROM barangays WHERE id = ?",
    [barangayId],
  );

  if (barangays.length === 0) {
    throw { statusCode: 404, message: "Barangay not found" };
  }

  if (!barangays[0].collection_service_available) {
    return { collection_service_available: false, streets: [] };
  }

  const [streets] = await pool.query(
    `SELECT bs.id, bs.barangay_id, bs.name, bs.area, bs.coverage_path, b.latitude, b.longitude
     FROM barangay_streets bs
     JOIN barangays b ON b.id = bs.barangay_id
     WHERE bs.barangay_id = ?
     ORDER BY bs.name ASC, bs.area ASC`,
    [barangayId],
  );

  return {
    collection_service_available: Boolean(barangays[0].collection_service_available),
    streets,
  };
};

const normalizeStreet = (data) => {
  const name = typeof data?.name === "string" ? data.name.trim() : "";
  const area = data?.area == null ? "" : typeof data.area === "string" ? data.area.trim() : null;
  if (!name || name.length > 150) {
    throw { statusCode: 400, message: "Street name must be 1–150 characters" };
  }
  if (area === null || area.length > 100) {
    throw { statusCode: 400, message: "Area must be text of 100 characters or fewer" };
  }
  return { name, area: area || null };
};

const assertUniqueStreet = async (executor, barangayId, street, excludeId = null) => {
  const [duplicates] = await executor.query(
    `SELECT id FROM barangay_streets
     WHERE barangay_id = ?
       AND LOWER(TRIM(name)) = LOWER(?)
       AND LOWER(COALESCE(TRIM(area), '')) = LOWER(?)
       AND (? IS NULL OR id <> ?)
     LIMIT 1 FOR UPDATE`,
    [barangayId, street.name, street.area || "", excludeId, excludeId],
  );
  if (duplicates.length) {
    throw { statusCode: 409, message: "This street and area already exist in the barangay" };
  }
};

const getManagerOverview = async () => {
  const [barangays] = await pool.query(
    `SELECT b.id, b.name, b.status, b.collection_service_available, b.latitude, b.longitude,
            COUNT(bs.id) AS street_count,
            COUNT(bs.coverage_path) AS streets_with_path,
            (SELECT COUNT(DISTINCT r.id)
             FROM route_stops rs JOIN routes r ON r.id = rs.route_id
             WHERE rs.barangay_id = b.id AND r.status = 'ACTIVE') AS active_route_count,
            (SELECT COUNT(DISTINCT rr.id)
             FROM route_run_stops rrs JOIN route_runs rr ON rr.id = rrs.route_run_id
             WHERE rrs.barangay_id = b.id AND rr.run_date >= ?
               AND rr.status IN ('SCHEDULED', 'ACTIVE', 'PAUSED')) AS live_run_count
     FROM barangays b
     LEFT JOIN barangay_streets bs ON bs.barangay_id = b.id
     GROUP BY b.id, b.name, b.status, b.collection_service_available, b.latitude, b.longitude
     ORDER BY b.name ASC`,
    [getLocalDate()],
  );
  return barangays.map((barangay) => ({
    ...barangay,
    collection_service_available: Boolean(barangay.collection_service_available),
    street_count: Number(barangay.street_count),
    streets_with_path: Number(barangay.streets_with_path),
    active_route_count: Number(barangay.active_route_count),
    live_run_count: Number(barangay.live_run_count),
  }));
};

const getManagerStreets = async (barangayId) => {
  const barangay = await getById(barangayId);
  const [streets] = await pool.query(
    `SELECT bs.id, bs.barangay_id, bs.name, bs.area, bs.coverage_path,
            (SELECT COUNT(*) FROM users u WHERE u.street_id = bs.id
              AND u.role = 'RESIDENT' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL) AS active_resident_count,
            (SELECT COUNT(*) FROM users u WHERE u.street_id = bs.id) AS account_link_count,
            (SELECT COUNT(DISTINCT rs.route_id) FROM route_stops rs WHERE rs.street_id = bs.id) AS route_plan_count,
            (SELECT COUNT(*) FROM route_run_stops rrs WHERE rrs.street_id = bs.id) AS route_run_record_count
     FROM barangay_streets bs
     WHERE bs.barangay_id = ?
     ORDER BY bs.name ASC, bs.area ASC`,
    [barangayId],
  );
  return {
    collection_service_available: Boolean(barangay.collection_service_available),
    streets: streets.map((street) => ({
      ...street,
      active_resident_count: Number(street.active_resident_count),
      account_link_count: Number(street.account_link_count),
      route_plan_count: Number(street.route_plan_count),
      route_run_record_count: Number(street.route_run_record_count),
    })),
  };
};

const updateCollectionService = async (barangayId, available) => {
  if (typeof available !== "boolean") {
    throw { statusCode: 400, message: "Collection availability must be true or false" };
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [barangays] = await connection.query(
      "SELECT id, status FROM barangays WHERE id = ? FOR UPDATE",
      [barangayId],
    );
    if (!barangays.length) throw { statusCode: 404, message: "Barangay not found" };
    if (available) {
      if (barangays[0].status !== "ACTIVE") {
        throw { statusCode: 409, message: "Activate this barangay before enabling collection service" };
      }
      const [[{ street_count }]] = await connection.query(
        "SELECT COUNT(*) AS street_count FROM barangay_streets WHERE barangay_id = ?",
        [barangayId],
      );
      if (Number(street_count) === 0) {
        throw { statusCode: 409, message: "Add a street before enabling collection service" };
      }
    } else {
      const [[{ route_count }]] = await connection.query(
        `SELECT COUNT(*) AS route_count
         FROM route_stops rs JOIN routes r ON r.id = rs.route_id
         WHERE rs.barangay_id = ? AND r.status = 'ACTIVE'`,
        [barangayId],
      );
      if (Number(route_count) > 0) {
        throw { statusCode: 409, message: "Pause active routes for this barangay before disabling service" };
      }
      const [[{ run_count }]] = await connection.query(
        `SELECT COUNT(DISTINCT rr.id) AS run_count
         FROM route_run_stops rrs JOIN route_runs rr ON rr.id = rrs.route_run_id
         WHERE rrs.barangay_id = ? AND rr.run_date >= ?
           AND rr.status IN ('SCHEDULED', 'ACTIVE', 'PAUSED')`,
        [barangayId, getLocalDate()],
      );
      if (Number(run_count) > 0) {
        throw { statusCode: 409, message: "Finish or cancel scheduled route runs before disabling collection service" };
      }
    }
    await connection.query(
      "UPDATE barangays SET collection_service_available = ? WHERE id = ?",
      [available ? 1 : 0, barangayId],
    );
    await connection.commit();
    return { id: barangayId, collection_service_available: available };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const createStreet = async (barangayId, data) => {
  const street = normalizeStreet(data);
  const id = generateId();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [barangays] = await connection.query("SELECT id FROM barangays WHERE id = ? FOR UPDATE", [barangayId]);
    if (!barangays.length) throw { statusCode: 404, message: "Barangay not found" };
    await assertUniqueStreet(connection, barangayId, street);
    await connection.query(
      "INSERT INTO barangay_streets (id, barangay_id, name, area) VALUES (?, ?, ?, ?)",
      [id, barangayId, street.name, street.area],
    );
    await connection.commit();
    return { id, barangay_id: barangayId, ...street };
  } catch (err) {
    await connection.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      throw { statusCode: 409, message: "This street and area already exist in the barangay" };
    }
    throw err;
  } finally {
    connection.release();
  }
};

const updateStreet = async (barangayId, streetId, data) => {
  const street = normalizeStreet(data);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [barangays] = await connection.query("SELECT id FROM barangays WHERE id = ? FOR UPDATE", [barangayId]);
    if (!barangays.length) throw { statusCode: 404, message: "Barangay not found" };
    const [existing] = await connection.query(
      "SELECT id FROM barangay_streets WHERE id = ? AND barangay_id = ?",
      [streetId, barangayId],
    );
    if (!existing.length) throw { statusCode: 404, message: "Street not found in this barangay" };
    await assertUniqueStreet(connection, barangayId, street, streetId);
    await connection.query(
      "UPDATE barangay_streets SET name = ?, area = ? WHERE id = ? AND barangay_id = ?",
      [street.name, street.area, streetId, barangayId],
    );
    await connection.query(
      `UPDATE route_run_stops rrs
       JOIN route_runs rr ON rr.id = rrs.route_run_id
       SET rrs.stop_name = ?
       WHERE rrs.street_id = ? AND rr.status = 'SCHEDULED' AND rr.run_date >= ?`,
      [street.area ? `${street.name} (${street.area})` : street.name, streetId, getLocalDate()],
    );
    await connection.commit();
    return { id: streetId, barangay_id: barangayId, ...street };
  } catch (err) {
    await connection.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      throw { statusCode: 409, message: "This street and area already exist in the barangay" };
    }
    throw err;
  } finally {
    connection.release();
  }
};

const normalizeCoveragePath = (value) => {
  if (value === null) return null;
  let points = value;
  if (typeof points === "string") {
    try {
      points = JSON.parse(points);
    } catch {
      throw { statusCode: 400, message: "Coverage path must be valid coordinate data" };
    }
  }
  if (!Array.isArray(points) || points.length < 2 || points.length > 500) {
    throw { statusCode: 400, message: "A street coverage path must contain 2 to 500 points" };
  }
  const normalized = points.map((point) => {
    if (!Array.isArray(point) || point.length !== 2 ||
        typeof point[0] !== "number" || typeof point[1] !== "number") {
      throw { statusCode: 400, message: "Each coverage point must contain latitude and longitude" };
    }
    const latitude = point[0];
    const longitude = point[1];
    if (
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    ) {
      throw { statusCode: 400, message: "Coverage points must use valid latitude and longitude values" };
    }
    return [latitude, longitude];
  });
  if (normalized.every((point) => point[0] === normalized[0][0] && point[1] === normalized[0][1])) {
    throw { statusCode: 400, message: "A coverage path needs at least two different points" };
  }
  return normalized;
};

const updateStreetCoverage = async (barangayId, streetId, coveragePath) => {
  const normalizedPath = normalizeCoveragePath(coveragePath);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [barangays] = await connection.query("SELECT id FROM barangays WHERE id = ? FOR UPDATE", [barangayId]);
    if (!barangays.length) throw { statusCode: 404, message: "Barangay not found" };
    const [streets] = await connection.query(
      "SELECT id FROM barangay_streets WHERE id = ? AND barangay_id = ? FOR UPDATE",
      [streetId, barangayId],
    );
    if (!streets.length) throw { statusCode: 404, message: "Street not found in this barangay" };

    if (normalizedPath === null) {
      const [activeRoutes] = await connection.query(
        `SELECT rs.id FROM route_stops rs JOIN routes r ON r.id = rs.route_id
         WHERE rs.street_id = ? AND r.status = 'ACTIVE' LIMIT 1`,
        [streetId],
      );
      const [liveRuns] = await connection.query(
        `SELECT rrs.id FROM route_run_stops rrs JOIN route_runs rr ON rr.id = rrs.route_run_id
         WHERE rrs.street_id = ? AND rr.run_date >= ?
           AND rr.status IN ('SCHEDULED', 'ACTIVE', 'PAUSED') LIMIT 1`,
        [streetId, getLocalDate()],
      );
      if (activeRoutes.length || liveRuns.length) {
        throw { statusCode: 409, message: "Pause or finish routes using this street before clearing its coverage path" };
      }
    }

    const serializedPath = normalizedPath === null ? null : JSON.stringify(normalizedPath);
    await connection.query(
      "UPDATE barangay_streets SET coverage_path = ? WHERE id = ? AND barangay_id = ?",
      [serializedPath, streetId, barangayId],
    );
    // Only upcoming runs follow edits. Started and completed runs keep their own route snapshot.
    await connection.query(
      `UPDATE route_run_stops rrs
       JOIN route_runs rr ON rr.id = rrs.route_run_id
       SET rrs.coverage_path = ?
       WHERE rrs.street_id = ? AND rr.status = 'SCHEDULED' AND rr.run_date >= ?`,
      [serializedPath, streetId, getLocalDate()],
    );
    await connection.commit();
    return { id: streetId, barangay_id: barangayId, coverage_path: normalizedPath };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const deleteStreet = async (barangayId, streetId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [barangays] = await connection.query(
      "SELECT collection_service_available FROM barangays WHERE id = ? FOR UPDATE",
      [barangayId],
    );
    if (!barangays.length) throw { statusCode: 404, message: "Barangay not found" };
    const [streets] = await connection.query(
      "SELECT id FROM barangay_streets WHERE id = ? AND barangay_id = ? FOR UPDATE",
      [streetId, barangayId],
    );
    if (!streets.length) {
      throw { statusCode: 404, message: "Street not found in this barangay" };
    }
    const [[usage]] = await connection.query(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE street_id = ?) AS residents,
         (SELECT COUNT(*) FROM route_stops WHERE street_id = ?) AS route_stops,
         (SELECT COUNT(*) FROM route_run_stops WHERE street_id = ?) AS route_run_stops`,
      [streetId, streetId, streetId],
    );
    if (Number(usage.residents) + Number(usage.route_stops) + Number(usage.route_run_stops) > 0) {
      throw { statusCode: 409, message: "Street is linked to residents or routes and cannot be deleted" };
    }
    if (barangays[0].collection_service_available) {
      const [[{ street_count }]] = await connection.query(
        "SELECT COUNT(*) AS street_count FROM barangay_streets WHERE barangay_id = ?",
        [barangayId],
      );
      if (Number(street_count) === 1) {
        throw { statusCode: 409, message: "Disable collection service before deleting its last street" };
      }
    }
    await connection.query(
      "DELETE FROM barangay_streets WHERE id = ? AND barangay_id = ?",
      [streetId, barangayId],
    );
    await connection.commit();
    return { id: streetId };
  } catch (err) {
    await connection.rollback();
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      throw { statusCode: 409, message: "Street is linked to a route and cannot be deleted" };
    }
    throw err;
  } finally {
    connection.release();
  }
};

module.exports = {
  getAll,
  getById,
  getStreets,
  getManagerOverview,
  getManagerStreets,
  updateCollectionService,
  createStreet,
  updateStreet,
  updateStreetCoverage,
  deleteStreet,
};
