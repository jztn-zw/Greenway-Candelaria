const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");

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

  return getById(id);
};

const update = async (id, data) => {
  await getById(id);

  const fields = [];
  const params = [];

  if (data.name) {
    fields.push("name = ?");
    params.push(data.name);
  }

  if (data.plate_number) {
    // Check duplicate plate excluding current truck
    const [existing] = await pool.query(
      "SELECT id FROM trucks WHERE plate_number = ? AND id != ?",
      [data.plate_number, id],
    );
    if (existing.length > 0) {
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

  return getById(id);
};

const remove = async (id) => {
  await getById(id);

  await pool.query("DELETE FROM trucks WHERE id = ?", [id]);

  return { message: "Truck deleted successfully" };
};

module.exports = { getAll, getById, create, update, remove };
