const { pool } = require('../../config/db');

// The authenticated user comes from middleware, never from request parameters.
async function initializeResidentAnnouncements(viewer) {
  // An absent column also allows deployment before the additive migration.
  if (viewer?.role !== 'RESIDENT' || !viewer.profile_completed ||
      viewer.announcement_inbox_initialized_at === undefined || viewer.announcement_inbox_initialized_at) return { sent: 0 };

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.query(
      `SELECT role, status, deleted_at, profile_completed, barangay_id, created_at,
              announcement_inbox_initialized_at FROM users WHERE id = ? FOR UPDATE`, [viewer.id],
    );
    const user = users[0];
    if (!user || user.role !== 'RESIDENT' || user.status !== 'ACTIVE' || user.deleted_at ||
        !user.profile_completed || user.announcement_inbox_initialized_at) {
      await connection.rollback();
      return { sent: 0 };
    }
    // A new resident starts with an empty inbox. Do not replay pre-signup notices.
    await connection.query('UPDATE users SET announcement_inbox_initialized_at = UTC_TIMESTAMP(3) WHERE id = ?', [viewer.id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
  return { sent: 0 };
}

module.exports = { initializeResidentAnnouncements };
