const { pool } = require("../../config/db");
const generateId = require("../../utils/generateId");

// Strip sensitive fields from audit payload
const sanitize = (data) => {
  if (!data || typeof data !== "object") return data;
  const clone = Array.isArray(data) ? [...data] : { ...data };
  const sensitiveKeys = [
    "password",
    "token",
    "refreshToken",
    "secret",
    "two_factor_secret",
    "apiKey",
  ];
  for (const key of Object.keys(clone)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      clone[key] = "[REDACTED]";
    } else if (typeof clone[key] === "object" && clone[key] !== null) {
      clone[key] = sanitize(clone[key]);
    }
  }
  return clone;
};

// ─── Centralized Audit Logger ──────────────────────────────

const log = async ({
  user_id,
  action,
  module,
  record_id = null,
  old_value = null,
  new_value = null,
  ip_address = null,
}) => {
  if (!user_id || !action || !module) return null;

  const id = generateId();

  try {
    await pool.query(
      `INSERT INTO audit_logs
         (id, user_id, action, module, record_id, old_value, new_value, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        user_id,
        action,
        module,
        record_id,
        old_value ? JSON.stringify(sanitize(old_value)) : null,
        new_value ? JSON.stringify(sanitize(new_value)) : null,
        ip_address,
      ],
    );
    return id;
  } catch (err) {
    // Non-blocking: fail-safe so business operations are not aborted
    console.error("[AuditLog] ❌ Failed to record audit log:", err.message);
    return null;
  }
};

// ─── Get All (with filters, search, & pagination) ───────────

const getAll = async (filters = {}) => {
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 50));
  const offset = (page - 1) * limit;

  const where = ["1=1"];
  const params = [];

  // Search filter
  if (filters.search && filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    where.push(
      "(u.full_name LIKE ? OR u.email LIKE ? OR al.action LIKE ? OR al.module LIKE ? OR al.record_id LIKE ?)",
    );
    params.push(term, term, term, term, term);
  }

  // Module filter
  if (filters.module && filters.module !== "all") {
    where.push("al.module = ?");
    params.push(filters.module);
  }

  // Action filter
  if (filters.action && filters.action !== "all") {
    where.push("al.action = ?");
    params.push(filters.action);
  }

  // User filter
  if (filters.user_id && filters.user_id !== "all") {
    where.push("al.user_id = ?");
    params.push(filters.user_id);
  }

  // Date range filter
  if (filters.from) {
    where.push("al.created_at >= ?");
    params.push(filters.from);
  }
  if (filters.to) {
    where.push("al.created_at <= ?");
    params.push(filters.to.includes(" ") ? filters.to : `${filters.to} 23:59:59`);
  }

  const whereClause = `WHERE ${where.join(" AND ")}`;
  const orderDir = filters.sort === "oldest" ? "ASC" : "DESC";

  // Total count
  const [countResult] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${whereClause}`,
    params,
  );
  const total = countResult[0].total;
  const totalPages = Math.ceil(total / limit);

  // Paginated records
  const [logs] = await pool.query(
    `SELECT
       al.*,
       COALESCE(u.full_name, 'System / Unknown') AS user_name,
       COALESCE(u.email, 'system@greenway.local') AS user_email,
       COALESCE(u.role, 'ADMIN') AS user_role,
       u.avatar_url AS user_avatar
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${whereClause}
     ORDER BY al.created_at ${orderDir}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  // Parse JSON values safely
  const formattedLogs = logs.map((l) => ({
    ...l,
    old_value: typeof l.old_value === "string" ? JSON.parse(l.old_value) : l.old_value,
    new_value: typeof l.new_value === "string" ? JSON.parse(l.new_value) : l.new_value,
  }));

  // Overall KPIs
  const [kpiRows] = await pool.query(
    `SELECT
       COUNT(*) AS total_actions,
       SUM(CASE WHEN action LIKE '%DELETE%' OR action LIKE '%DEACTIVATE%' OR action LIKE '%BAN%' THEN 1 ELSE 0 END) AS deletions,
       SUM(CASE WHEN action LIKE '%FAILED_LOGIN%' OR action LIKE '%BAN%' OR action LIKE '%DELETE%' THEN 1 ELSE 0 END) AS critical_actions,
       SUM(CASE WHEN action LIKE '%FAILED_LOGIN%' THEN 1 ELSE 0 END) AS failed_logins
     FROM audit_logs`,
  );

  const kpis = {
    totalActions: Number(kpiRows[0]?.total_actions || 0),
    deletions: Number(kpiRows[0]?.deletions || 0),
    criticalActions: Number(kpiRows[0]?.critical_actions || 0),
    failedLogins: Number(kpiRows[0]?.failed_logins || 0),
  };

  return {
    logs: formattedLogs,
    total,
    page,
    limit,
    totalPages,
    kpis,
  };
};

// ─── Get One by ID ─────────────────────────────────────────

const getById = async (id) => {
  const [rows] = await pool.query(
    `SELECT
       al.*,
       COALESCE(u.full_name, 'System / Unknown') AS user_name,
       COALESCE(u.email, 'system@greenway.local') AS user_email,
       COALESCE(u.role, 'ADMIN') AS user_role,
       u.avatar_url AS user_avatar
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.id = ?`,
    [id],
  );

  if (rows.length === 0) {
    throw { statusCode: 404, message: "Audit log not found" };
  }

  const log = rows[0];
  return {
    ...log,
    old_value: typeof log.old_value === "string" ? JSON.parse(log.old_value) : log.old_value,
    new_value: typeof log.new_value === "string" ? JSON.parse(log.new_value) : log.new_value,
  };
};

// ─── Get Distinct Filter Options ───────────────────────────

const getFilterOptions = async () => {
  const [modules] = await pool.query(
    "SELECT DISTINCT module FROM audit_logs WHERE module IS NOT NULL ORDER BY module ASC",
  );
  const [actions] = await pool.query(
    "SELECT DISTINCT action FROM audit_logs WHERE action IS NOT NULL ORDER BY action ASC",
  );
  const [admins] = await pool.query(
    `SELECT DISTINCT u.id, u.full_name, u.role
     FROM audit_logs al
     JOIN users u ON u.id = al.user_id
     ORDER BY u.full_name ASC`,
  );

  return {
    modules: modules.map((m) => m.module),
    actions: actions.map((a) => a.action),
    admins: admins.map((a) => ({ id: a.id, name: a.full_name, role: a.role })),
  };
};

// ─── Clear All (Admin only) ───────────────────────────────

const clearAll = async () => {
  await pool.query("DELETE FROM audit_logs");
  return { message: "Audit logs cleared successfully" };
};

module.exports = {
  log,
  getAll,
  getById,
  getFilterOptions,
  clearAll,
};
