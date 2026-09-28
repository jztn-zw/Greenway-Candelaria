const { truckScope } = require("../tracking/trackingAccess");
const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const auditService = require("../audit/audit.service");

// Resolve one current collector per truck, including databases with legacy
// duplicate assignments. A derived table works on MySQL and TiDB; subqueries
// inside JOIN conditions are not supported by every deployment database.
const truckSelect = `SELECT
  t.*,
  assignment.driver_id,
  u.full_name AS driver_name
  FROM trucks t
  LEFT JOIN (
    SELECT d.truck_id, MIN(d.id) AS driver_id
    FROM drivers d
    JOIN users active_user ON active_user.id = d.user_id AND active_user.deleted_at IS NULL
    WHERE d.truck_id IS NOT NULL
    GROUP BY d.truck_id
  ) assignment ON assignment.truck_id = t.id
  LEFT JOIN drivers d ON d.id = assignment.driver_id
  LEFT JOIN users u ON u.id = d.user_id`;

const getAll = async (viewer = { role: "ADMIN" }) => {
  const scope = truckScope(viewer);
  const select = viewer.role === "ADMIN" ? truckSelect : "SELECT t.id, t.name, t.status FROM trucks t";
  const [trucks] = await pool.query(
    `${select} WHERE ${scope.sql} ORDER BY t.created_at ASC`, scope.params,
  );
  return trucks;
};

const getById = async (id, viewer = { role: "ADMIN" }) => {
  const scope = truckScope(viewer);
  const select = viewer.role === "ADMIN" ? truckSelect : "SELECT t.id, t.name, t.status FROM trucks t";
  const [rows] = await pool.query(
    `${select} WHERE t.id = ? AND ${scope.sql}`,
    [id, ...scope.params],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Truck not found" };
  }

  return rows[0];
};

const create = async ({
  name,
  plate_number,
  truck_model,
  availability_status = "ACTIVE",
}, actorUserId, ipAddress = null) => {
  // Check duplicate plate
  const [existing] = await pool.query(
    "SELECT id FROM trucks WHERE plate_number = ?",
    [plate_number],
  );
  if (existing.length > 0) {
    throw { statusCode: 409, message: "Plate number already exists" };
  }

  const id = generateId();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO trucks (id, name, plate_number, truck_model, availability_status)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, plate_number, truck_model, availability_status],
    );
    await auditService.logInTransaction(connection, {
      user_id: actorUserId, action: "CREATE_TRUCK", module: "trucks",
      record_id: id, ip_address: ipAddress,
      new_value: { name, plate_number, truck_model, availability_status },
    });
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    if (error.code === "ER_DUP_ENTRY") throw { statusCode: 409, message: "Plate number already exists" };
    throw error;
  } finally {
    connection.release();
  }
  return getById(id);
};

const update = async (id, data, actorUserId, ipAddress = null) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query("SELECT * FROM trucks WHERE id = ? FOR UPDATE", [id]);
    if (!rows.length) throw { statusCode: 404, message: "Truck not found" };
    const existing = rows[0];
    if (data.status && data.status !== existing.status) {
      throw { statusCode: 409, message: "Truck status is derived from collection runs and GPS. Use route controls to change collection state." };
    }
    if (data.availability_status && data.availability_status !== existing.availability_status) {
      const [runs] = await connection.query("SELECT id FROM route_runs WHERE truck_id = ? AND (status IN ('ACTIVE','PAUSED') OR (status = 'SCHEDULED' AND run_date = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00')))) LIMIT 1 FOR UPDATE", [id]);
      if (runs.length) throw { statusCode: 409, message: "Route status is managed by its run. Finish or cancel the run before changing truck availability or status." };
    }

  const fields = [];
  const params = [];

  if (data.name && data.name !== existing.name) {
    fields.push("name = ?");
    params.push(data.name);
  }

  if (data.plate_number && data.plate_number !== existing.plate_number) {
    // Check duplicate plate excluding current truck
    const [existingPlate] = await connection.query(
      "SELECT id FROM trucks WHERE plate_number = ? AND id != ?",
      [data.plate_number, id],
    );
    if (existingPlate.length > 0) {
      throw { statusCode: 409, message: "Plate number already exists" };
    }
    fields.push("plate_number = ?");
    params.push(data.plate_number);
  }

  if (data.status && data.status !== existing.status) {
    fields.push("status = ?");
    params.push(data.status);
  }

  if (data.truck_model && data.truck_model !== existing.truck_model) {
    fields.push("truck_model = ?");
    params.push(data.truck_model);
  }

  if (data.availability_status && data.availability_status !== existing.availability_status) {
    fields.push("availability_status = ?");
    params.push(data.availability_status);
  }

  if (fields.length === 0) {
    await connection.commit();
    return getById(id);
  }

  params.push(id);

  await connection.query(
    `UPDATE trucks SET ${fields.join(", ")} WHERE id = ?`,
    params,
  );

  const [updatedRows] = await connection.query("SELECT * FROM trucks WHERE id = ?", [id]);
  const updated = updatedRows[0];
  const auditedFields = ["name", "plate_number", "status", "truck_model", "availability_status"];
  await auditService.logInTransaction(connection, {
    user_id: actorUserId, action: "UPDATE_TRUCK", module: "trucks",
    record_id: id, ip_address: ipAddress,
    old_value: Object.fromEntries(auditedFields.map((field) => [field, existing[field]])),
    new_value: Object.fromEntries(auditedFields.map((field) => [field, updated[field]])),
  });
  await connection.commit();
  return getById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const remove = async (id, actorUserId, ipAddress = null) => {
  const existing = await getById(id);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [lockedTrucks] = await connection.query("SELECT id FROM trucks WHERE id = ? FOR UPDATE", [id]);
    if (!lockedTrucks.length) throw { statusCode: 404, message: "Truck not found" };

    const [[usage]] = await connection.query(
      `SELECT
         (SELECT COUNT(*) FROM routes WHERE truck_id = ?) AS routes,
         (SELECT COUNT(*) FROM route_runs WHERE truck_id = ?) AS route_runs,
         (SELECT COUNT(*) FROM tracking_logs WHERE truck_id = ?) AS tracking_logs`,
      [id, id, id],
    );
    if (Number(usage.routes) + Number(usage.route_runs) + Number(usage.tracking_logs) > 0) {
      throw {
        statusCode: 409,
        message:
          "Truck has route or tracking history and cannot be deleted.",
      };
    }

    // Remove direct references so hard-delete can succeed without orphan records.
    await connection.query("UPDATE drivers SET truck_id = NULL WHERE truck_id = ?", [
      id,
    ]);
    await connection.query("DELETE FROM trucks WHERE id = ?", [id]);
    await auditService.logInTransaction(connection, {
      user_id: actorUserId,
      action: "DELETE_TRUCK",
      module: "trucks",
      record_id: id,
      ip_address: ipAddress,
      old_value: {
        name: existing.name, plate_number: existing.plate_number,
        availability_status: existing.availability_status,
        driver: existing.driver_name || null,
      },
    });
    await connection.commit();

    return { message: "Truck deleted successfully" };
  } catch (error) {
    await connection.rollback();

    if (error?.statusCode) throw error;

    // Fallback for DB-level FK restrictions not explicitly checked above.
    if (error?.code === "ER_ROW_IS_REFERENCED_2" || error?.errno === 1451) {
      throw {
        statusCode: 409,
        message:
          "Truck cannot be deleted because it is referenced by other records. Remove related references first.",
      };
    }

    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { getAll, getById, create, update, remove };
