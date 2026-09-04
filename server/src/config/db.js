const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT, 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
  waitForConnections: true,
  connectionLimit: 5,
  maxIdle: 2,
  idleTimeout: 30000,
  queueLimit: 0,
  connectTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true,
  supportBigNumbers: true,
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

const isReadOnlyQuery = (query) => {
  const sql = typeof query === "string" ? query : query?.sql;
  if (typeof sql !== "string") return false;

  return /^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i.test(sql.trimStart());
};

let retryWarningCount = 0;
let retryWarningTimer = null;

const recordRetryWarning = (code) => {
  retryWarningCount += 1;
  if (retryWarningTimer) return;

  retryWarningTimer = setTimeout(() => {
    console.warn(
      `[Database] Recovered from ${retryWarningCount} transient connection ${retryWarningCount === 1 ? "error" : "errors"} (latest: ${code}).`,
    );
    retryWarningCount = 0;
    retryWarningTimer = null;
  }, 1000);
  retryWarningTimer.unref?.();
};

const withRetry = async (operation, label = "DB operation", maxAttempts = 3) => {
  let lastErrorCode = "unknown";

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await operation();
      if (attempt > 1) recordRetryWarning(lastErrorCode);
      return result;
    } catch (err) {
      lastErrorCode = err?.code || "unknown";
      if (!isRetryableError(err) || attempt === maxAttempts) {
        if (isRetryableError(err)) {
          console.error(
            `[Database] ${label} failed after ${maxAttempts} attempts (${err.code}).`,
          );
        }
        throw err;
      }
      const backoffMs = 250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 200);
      await delay(backoffMs);
    }
  }
};

const originalQuery = pool.query.bind(pool);
pool.query = async (...args) => {
  // Retrying a write after a dropped response can apply it twice. Only
  // idempotent reads are safe to replay automatically.
  if (!isReadOnlyQuery(args[0])) return originalQuery(...args);
  return withRetry(() => originalQuery(...args), "DB query");
};

const originalExecute = pool.execute.bind(pool);
pool.execute = async (...args) => {
  if (!isReadOnlyQuery(args[0])) return originalExecute(...args);
  return withRetry(() => originalExecute(...args), "DB execute");
};

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

module.exports = { pool, testConnection, withRetry, isRetryableError };


