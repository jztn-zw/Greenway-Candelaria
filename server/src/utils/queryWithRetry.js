const { pool } = require("../config/db");

const queryWithRetry = async (sql, params = [], retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      if (err.code === "ECONNRESET" && i < retries - 1) {
        console.log(`🔄 Retrying query... attempt ${i + 2}`);
        await new Promise((res) => setTimeout(res, 1000));
        continue;
      }
      throw err;
    }
  }
};

module.exports = queryWithRetry;
