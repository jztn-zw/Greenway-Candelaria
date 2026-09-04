const { pool } = require("../../config/db");

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

module.exports = { getAll, getById };
