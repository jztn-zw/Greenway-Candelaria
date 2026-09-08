const { pool } = require("../../config/db");

// ─── Helper: date range filter ─────────────────────────────

const dateFilter = (field, from, to) => {
  const conditions = [];
  const params = [];

  if (from) {
    conditions.push(`${field} >= ?`);
    params.push(from);
  }

  if (to) {
    conditions.push(`${field} <= ?`);
    params.push(to);
  }

  return { conditions, params };
};

// ─── Overview ──────────────────────────────────────────────

const getOverview = async () => {
  const [[users]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL",
  );
  const [[residents]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'RESIDENT' AND deleted_at IS NULL",
  );
  const [[drivers]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'DRIVER' AND deleted_at IS NULL",
  );
  const [[admins]] = await pool.query(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL",
  );
  const [[reports]] = await pool.query("SELECT COUNT(*) AS total FROM reports");
  const [[resolved]] = await pool.query(
    "SELECT COUNT(*) AS total FROM reports WHERE status = 'RESOLVED'",
  );
  const [[pending]] = await pool.query(
    "SELECT COUNT(*) AS total FROM reports WHERE status IN ('SUBMITTED','UNDER_REVIEW','DISPATCHED')",
  );
  const [[trucks]] = await pool.query("SELECT COUNT(*) AS total FROM trucks");
  const [[activeTrucks]] = await pool.query(
    "SELECT COUNT(*) AS total FROM trucks WHERE status != 'OFFLINE'",
  );
  const [[posts]] = await pool.query(
    "SELECT COUNT(*) AS total FROM posts WHERE deleted_at IS NULL AND status = 'PUBLISHED'",
  );
  const [[announcements]] = await pool.query(
    "SELECT COUNT(*) AS total FROM announcements WHERE status = 'ACTIVE'",
  );

  return {
    users: {
      total: users.total,
      residents: residents.total,
      drivers: drivers.total,
      admins: admins.total,
    },
    reports: {
      total: reports.total,
      resolved: resolved.total,
      pending: pending.total,
    },
    trucks: {
      total: trucks.total,
      active: activeTrucks.total,
    },
    posts: posts.total,
    announcements: announcements.total,
  };
};

// ─── Reports Analytics ─────────────────────────────────────

const getReportsAnalytics = async (filters = {}) => {
  const { conditions, params } = dateFilter(
    "created_at",
    filters.from,
    filters.to,
  );
  const where =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  // By status
  const [byStatus] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM reports ${where} GROUP BY status`,
    params,
  );

  // By violation type
  const [byType] = await pool.query(
    `SELECT violation_type, COUNT(*) AS count FROM reports ${where} GROUP BY violation_type ORDER BY count DESC`,
    params,
  );

  // By priority
  const [byPriority] = await pool.query(
    `SELECT priority, COUNT(*) AS count FROM reports ${where} GROUP BY priority`,
    params,
  );

  // By barangay (top 10)
  const [byBarangay] = await pool.query(
    `SELECT
       b.name AS barangay_name,
       COUNT(r.id) AS count
     FROM reports r
     JOIN barangays b ON b.id = r.barangay_id
     ${where}
     GROUP BY r.barangay_id, b.name
     ORDER BY count DESC
     LIMIT 10`,
    params,
  );

  // Monthly trend (last 6 months)
  const [monthly] = await pool.query(
    `SELECT
       DATE_FORMAT(created_at, '%Y-%m') AS month,
       COUNT(*) AS count
     FROM reports
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
     GROUP BY month
     ORDER BY month ASC`,
  );

  // Resolution rate
  const [[total]] = await pool.query(
    `SELECT COUNT(*) AS count FROM reports ${where}`,
    params,
  );
  const [[resolved]] = await pool.query(
    `SELECT COUNT(*) AS count FROM reports ${where ? where + " AND" : "WHERE"} status = 'RESOLVED'`,
    params,
  );

  const resolutionRate =
    total.count > 0
      ? ((resolved.count / total.count) * 100).toFixed(2)
      : "0.00";

  return {
    by_status: byStatus,
    by_type: byType,
    by_priority: byPriority,
    by_barangay: byBarangay,
    monthly_trend: monthly,
    total: total.count,
    resolved: resolved.count,
    resolution_rate: `${resolutionRate}%`,
  };
};

// ─── Trucks Analytics ──────────────────────────────────────

const getTrucksAnalytics = async () => {
  // Status breakdown
  const [byStatus] = await pool.query(
    "SELECT status, COUNT(*) AS count FROM trucks GROUP BY status",
  );

  // Trucks with most tracking pings (most active)
  const [mostActive] = await pool.query(
    `SELECT
       t.id,
       t.name,
       t.plate_number,
       t.status,
       COUNT(tl.id) AS ping_count
     FROM trucks t
     LEFT JOIN tracking_logs tl ON tl.truck_id = t.id
     GROUP BY t.id, t.name, t.plate_number, t.status
     ORDER BY ping_count DESC`,
  );

  // Routes per truck
  const [routesPerTruck] = await pool.query(
    `SELECT
       t.name,
       t.plate_number,
       COUNT(r.id) AS route_count
     FROM trucks t
     LEFT JOIN routes r ON r.truck_id = t.id
     GROUP BY t.id, t.name, t.plate_number
     ORDER BY route_count DESC`,
  );

  return {
    by_status: byStatus,
    most_active: mostActive,
    routes_per_truck: routesPerTruck,
  };
};

// ─── Users Analytics ───────────────────────────────────────

const getUsersAnalytics = async () => {
  // Role breakdown
  const [byRole] = await pool.query(
    `SELECT role, COUNT(*) AS count
     FROM users
     WHERE deleted_at IS NULL
     GROUP BY role`,
  );

  // Status breakdown
  const [byStatus] = await pool.query(
    `SELECT status, COUNT(*) AS count
     FROM users
     WHERE deleted_at IS NULL
     GROUP BY status`,
  );

  // Monthly signups (last 6 months)
  const [monthlySignups] = await pool.query(
    `SELECT
       DATE_FORMAT(created_at, '%Y-%m') AS month,
       COUNT(*) AS count
     FROM users
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       AND deleted_at IS NULL
     GROUP BY month
     ORDER BY month ASC`,
  );

  // Users per barangay (top 10)
  const [perBarangay] = await pool.query(
    `SELECT
       b.name AS barangay_name,
       COUNT(u.id) AS user_count
     FROM users u
     JOIN barangays b ON b.id = u.barangay_id
     WHERE u.deleted_at IS NULL
     GROUP BY u.barangay_id, b.name
     ORDER BY user_count DESC
     LIMIT 10`,
  );

  return {
    by_role: byRole,
    by_status: byStatus,
    monthly_signups: monthlySignups,
    per_barangay: perBarangay,
  };
};

// ─── Posts Analytics ───────────────────────────────────────

const getPostsAnalytics = async () => {
  // By category
  const [byCategory] = await pool.query(
    `SELECT category, COUNT(*) AS count
     FROM posts
     WHERE deleted_at IS NULL
     GROUP BY category`,
  );

  // By status
  const [byStatus] = await pool.query(
    `SELECT status, COUNT(*) AS count
     FROM posts
     WHERE deleted_at IS NULL
     GROUP BY status`,
  );

  // Top 5 most viewed
  const [mostViewed] = await pool.query(
    `SELECT id, title, category, view_count, published_at
     FROM posts
     WHERE deleted_at IS NULL AND status = 'PUBLISHED'
     ORDER BY view_count DESC
     LIMIT 5`,
  );

  // Top 5 most liked
  const [mostLiked] = await pool.query(
    `SELECT
       p.id,
       p.title,
       p.category,
       COUNT(pl.id) AS like_count
     FROM posts p
     LEFT JOIN post_likes pl ON pl.post_id = p.id
     WHERE p.deleted_at IS NULL AND p.status = 'PUBLISHED'
     GROUP BY p.id, p.title, p.category
     ORDER BY like_count DESC
     LIMIT 5`,
  );

  // Total engagement
  const [[totalViews]] = await pool.query(
    "SELECT SUM(view_count) AS total FROM posts WHERE deleted_at IS NULL AND status = 'PUBLISHED'",
  );
  const [[totalLikes]] = await pool.query(
    "SELECT COUNT(*) AS total FROM post_likes",
  );
  return {
    by_category: byCategory,
    by_status: byStatus,
    most_viewed: mostViewed,
    most_liked: mostLiked,
    engagement: {
      total_views: totalViews.total || 0,
      total_likes: totalLikes.total || 0,
    },
  };
};

// ─── Barangays Analytics ───────────────────────────────────

const getBarangaysAnalytics = async () => {
  // Most reports submitted per barangay
  const [byReports] = await pool.query(
    `SELECT
       b.id,
       b.name,
       COUNT(r.id) AS report_count
     FROM barangays b
     LEFT JOIN reports r ON r.barangay_id = b.id
     GROUP BY b.id, b.name
     ORDER BY report_count DESC`,
  );

  // Most users per barangay
  const [byUsers] = await pool.query(
    `SELECT
       b.id,
       b.name,
       COUNT(u.id) AS user_count
     FROM barangays b
     LEFT JOIN users u ON u.barangay_id = b.id AND u.deleted_at IS NULL
     GROUP BY b.id, b.name
     ORDER BY user_count DESC`,
  );

  // Barangays with most unresolved reports
  const [unresolved] = await pool.query(
    `SELECT
       b.name,
       COUNT(r.id) AS unresolved_count
     FROM reports r
     JOIN barangays b ON b.id = r.barangay_id
     WHERE r.status != 'RESOLVED'
     GROUP BY r.barangay_id, b.name
     ORDER BY unresolved_count DESC
     LIMIT 10`,
  );

  return {
    by_reports: byReports,
    by_users: byUsers,
    unresolved: unresolved,
  };
};

module.exports = {
  getOverview,
  getReportsAnalytics,
  getTrucksAnalytics,
  getUsersAnalytics,
  getPostsAnalytics,
  getBarangaysAnalytics,
};
