const { pool } = require("../config/db");

// Retry behavior is centralized in config/db.js. Keeping this compatibility
// wrapper prevents auth queries from accidentally multiplying retry attempts.
const queryWithRetry = (sql, params = []) => pool.query(sql, params);

module.exports = queryWithRetry;
