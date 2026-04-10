const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true },
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  connectTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true,
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "PROTOCOL_CONNECTION_LOST",
  "ETIMEDOUT",
  "EPIPE",
  "ECONNREFUSED",
  "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR",
]);

const isRetryableError = (err) => RETRYABLE_CODES.has(err?.code);

const withRetry = async (operation, label = "DB operation", retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (err) {
      if (!isRetryableError(err) || attempt === retries) {
        throw err;
      }

      console.warn(
        `${label} failed with ${err.code}. Retrying (${attempt + 1}/${retries})...`,
      );
      await delay(500 * attempt);
    }
  }
};

const originalQuery = pool.query.bind(pool);
pool.query = async (...args) => {
  return withRetry(() => originalQuery(...args), "DB query");
};

const originalExecute = pool.execute.bind(pool);
pool.execute = async (...args) =>
  withRetry(() => originalExecute(...args), "DB execute");

const originalGetConnection = pool.getConnection.bind(pool);
pool.getConnection = async () =>
  withRetry(async () => {
    const connection = await originalGetConnection();

    try {
      await connection.ping();
    } catch (err) {
      connection.destroy();
      throw err;
    }

    return connection;
  }, "DB connection checkout");

const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query("SELECT 1");
    console.log("✅ Database connected successfully");
    conn.release();
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = { pool, testConnection };


