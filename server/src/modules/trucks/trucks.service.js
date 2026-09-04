const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");
const auditService = require("../audit/audit.service");

const getAll = async () => {
  const [trucks] = await pool.query(
    `SELECT 
       t.*,
       d.id       AS driver_id,
       u.full_name AS driver_name
     FROM trucks t
     LEFT JOIN drivers d ON d.truck_id = t.id
     LEFT JOIN users u   ON u.id = d.user_id
     ORDER BY t.created_at ASC`,
  );
  return trucks;
};

const getById = async (id) => {
  const [rows] = await pool.query(
    `SELECT 
       t.*,
       d.id        AS driver_id,
       u.full_name AS driver_name
     FROM trucks t
     LEFT JOIN drivers d ON d.truck_id = t.id
     LEFT JOIN users u   ON u.id = d.user_id
     WHERE t.id = ?`,
    [id],
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
}) => {
  // Check duplicate plate
  const [existing] = await pool.query(
    "SELECT id FROM trucks WHERE plate_number = ?",
    [plate_number],
  );
  if (existing.length > 0) {
    throw { statusCode: 409, message: "Plate number already exists" };
  }

  const id = generateId();

  await pool.query(
    `INSERT INTO trucks (id, name, plate_number, truck_model, availability_status)
     VALUES (?, ?, ?, ?, ?)`,
    [id, name, plate_number, truck_model, availability_status],
  );

  const created = await getById(id);

  auditService.log({
    user_id: "admin",
    action: "CREATE_TRUCK",
    module: "trucks",
    record_id: id,
    new_value: { name, plate_number, truck_model, availability_status },
  }).catch(() => {});

  return created;
};

const update = async (id, data, actorUserId = "admin") => {
  const existing = await getById(id);

  const fields = [];
  const params = [];

  if (data.name) {
    fields.push("name = ?");
    params.push(data.name);
  }

  if (data.plate_number) {
    // Check duplicate plate excluding current truck
    const [existingPlate] = await pool.query(
      "SELECT id FROM trucks WHERE plate_number = ? AND id != ?",
      [data.plate_number, id],
    );
    if (existingPlate.length > 0) {
      throw { statusCode: 409, message: "Plate number already exists" };
    }
    fields.push("plate_number = ?");
    params.push(data.plate_number);
  }

  if (data.status) {
    fields.push("status = ?");
    params.push(data.status);
  }

  if (data.truck_model) {
    fields.push("truck_model = ?");
    params.push(data.truck_model);
  }

  if (data.availability_status) {
    fields.push("availability_status = ?");
    params.push(data.availability_status);
  }

  if (fields.length === 0) return getById(id);

  params.push(id);

  await pool.query(
    `UPDATE trucks SET ${fields.join(", ")} WHERE id = ?`,
    params,
  );

  const updated = await getById(id);

  auditService.log({
    user_id: actorUserId,
    action: "UPDATE_TRUCK",
    module: "trucks",
    record_id: id,
    old_value: { name: existing.name, plate_number: existing.plate_number, status: existing.status },
    new_value: { name: updated.name, plate_number: updated.plate_number, status: updated.status },
  }).catch(() => {});

  return updated;
};

const remove = async (id) => {
  const existing = await getById(id);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [routeRefs] = await connection.query(
      "SELECT COUNT(*) AS total FROM routes WHERE truck_id = ?",
      [id],
    );
    const routeCount = Number(routeRefs?.[0]?.total || 0);
    if (routeCount > 0) {
      throw {
        statusCode: 409,
        message:
          "Truck cannot be deleted because it is already used by route records. Remove/archive related routes first.",
      };
    }

    // Remove direct references so hard-delete can succeed without orphan records.
    await connection.query("UPDATE drivers SET truck_id = NULL WHERE truck_id = ?", [
      id,
    ]);
    await connection.query("DELETE FROM tracking_logs WHERE truck_id = ?", [id]);
    await connection.query("DELETE FROM trucks WHERE id = ?", [id]);

    await connection.commit();

    auditService.log({
      user_id: "admin",
      action: "DELETE_TRUCK",
      module: "trucks",
      record_id: id,
      old_value: { name: existing.name, plate_number: existing.plate_number },
    }).catch(() => {});

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
