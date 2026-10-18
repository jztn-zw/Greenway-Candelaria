const { pool } = require('../../config/db');
const notifications = require('../notifications/notifications.service');
const residentChanges = require('../../sockets/residentChanges.socket');

// The authenticated user comes from middleware, never from request parameters.
async function initializeResidentAnnouncements(viewer) {
  // An absent column also allows deployment before the additive migration.
  if (viewer?.role !== 'RESIDENT' || !viewer.profile_completed ||
      viewer.announcement_inbox_initialized_at === undefined || viewer.announcement_inbox_initialized_at) return { sent: 0 };

  const connection = await pool.getConnection();
  let sent = 0;
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
    const [settings] = await connection.query(
      'SELECT COALESCE(notif_announcements, TRUE) AS enabled FROM user_settings WHERE user_id = ?', [viewer.id],
    );
    if (settings.length === 0 || Boolean(settings[0].enabled)) {
      // Only notices broadcast before signup were missed by the original delivery.
      // Later missing alerts may have been deliberately deleted and stay deleted.
      const [announcements] = await connection.query(
        `SELECT a.id, a.title, a.body, a.type FROM announcements a
         WHERE a.status = 'ACTIVE' AND (a.expires_at IS NULL OR a.expires_at > NOW())
           AND COALESCE(a.sent_at, a.created_at) < ?
           AND (a.target_all = TRUE OR EXISTS (
             SELECT 1 FROM announcement_barangays ab
             WHERE ab.announcement_id = a.id AND ab.barangay_id = ?))
           AND NOT EXISTS (SELECT 1 FROM notifications n
             WHERE n.user_id = ? AND n.ref_module = 'announcements' AND n.ref_id = a.id)
           AND NOT EXISTS (SELECT 1 FROM announcement_read_receipts r
             WHERE r.user_id = ? AND r.announcement_id = a.id)
         ORDER BY a.id FOR UPDATE`,
        [user.created_at, user.barangay_id, viewer.id, viewer.id],
      );
      for (const announcement of announcements) {
        const result = await notifications.sendToMany({
          user_ids: [viewer.id], type: 'ANNOUNCEMENT', title: announcement.title, body: announcement.body,
          ref_id: announcement.id, ref_module: 'announcements', metadata: { category: announcement.type, catch_up: true },
          db: connection, emit: false,
        });
        sent += result.sent;
      }
    }
    await connection.query('UPDATE users SET announcement_inbox_initialized_at = UTC_TIMESTAMP(3) WHERE id = ?', [viewer.id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
  // Refresh only this owner's inbox; historical notices do not trigger a push burst.
  if (sent) residentChanges.emitResidentDataChanged(['notifications'], viewer.id);
  return { sent };
}

module.exports = { initializeResidentAnnouncements };
