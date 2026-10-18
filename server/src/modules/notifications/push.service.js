const { pool } = require('../../config/db');
const hashSessionToken = require('../../utils/hashSessionToken');
const validToken = value => typeof value === 'string' && /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{1,200}\]$/.test(value);
const fail = (message, statusCode = 400) => { throw { statusCode, message }; };
const residentPushTypes = new Set(['COLLECTION_REMINDER', 'TRUCK_IS_NEAR', 'COLLECTION_DONE', 'REPORT_UPDATE', 'NEW_POST', 'ANNOUNCEMENT', 'MISSED_COLLECTION', 'SYSTEM']);
const residentPreferences = {
  ANNOUNCEMENT: 'notif_announcements', NEW_POST: 'notif_new_content',
  COLLECTION_REMINDER: 'notif_collection_reminders', TRUCK_IS_NEAR: 'notif_truck_near',
  COLLECTION_DONE: 'notif_collection_done', MISSED_COLLECTION: 'notif_collection_skipped',
  REPORT_UPDATE: 'notif_report_updates',
};
const residentTitles = {
  REPORT_UPDATE: 'Report update', NEW_POST: 'Community update', ANNOUNCEMENT: 'Community announcement',
  COLLECTION_REMINDER: 'Collection reminder', TRUCK_IS_NEAR: 'Collection update',
  COLLECTION_DONE: 'Collection update', MISSED_COLLECTION: 'Collection update', SYSTEM: 'GreenWay update',
};
const formatScheduleDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
};

async function sessionId(user, token) {
  if (!['DRIVER', 'RESIDENT'].includes(user.role)) fail('Mobile push is unavailable for this account', 403);
  const [rows] = await pool.query('SELECT id FROM sessions WHERE user_id = ? AND token IN (?, ?) AND expires_at > NOW()', [user.id, hashSessionToken(token), token]);
  if (!rows.length) fail('Session expired or invalid', 401);
  return rows[0].id;
}
async function register(user, credential, input = {}) {
  if (!['DRIVER', 'RESIDENT'].includes(user.role)) fail('Mobile push is unavailable for this account', 403);
  if (!validToken(input.token) || !['android', 'ios'].includes(input.platform) || typeof input.enabled !== 'boolean') fail('Invalid mobile notification settings');
  const session = await sessionId(user, credential);
  await pool.query(`INSERT INTO mobile_push_devices (token, user_id, session_id, platform, enabled)
    VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), session_id = VALUES(session_id),
      platform = VALUES(platform), enabled = VALUES(enabled), updated_at = CURRENT_TIMESTAMP`,
    [input.token, user.id, session, input.platform, input.enabled]);
  return { registered: true, service_enabled: process.env.EXPO_PUSH_ENABLED === 'true' };
}
async function unregister(user, credential, input = {}) {
  if (!validToken(input.token)) fail('Invalid push token');
  const session = await sessionId(user, credential);
  await pool.query('DELETE FROM mobile_push_devices WHERE token = ? AND user_id = ? AND session_id = ?', [input.token, user.id, session]);
  return { registered: false };
}
async function expoRequest(path, payload) {
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.EXPO_PUSH_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}` } : {}) },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Push provider unavailable');
  return (await response.json()).data;
}
async function removeInvalid(result, device) {
  if (result?.details?.error === 'DeviceNotRegistered') {
    await pool.query('DELETE FROM mobile_push_devices WHERE token = ? AND user_id = ? AND session_id = ?', [device.token, device.user_id, device.session_id]);
  }
}

// Best-effort push supplements the durable inbox. Provider errors must never
// roll back or fail an already committed notification.
async function sendMobilePushAlert(notification) {
  const isSchedule = notification.ref_module === 'schedule';
  const isDriverMessage = notification.ref_module === 'driver-messages';
  const driverEligible = isSchedule || isDriverMessage;
  const residentEligible = residentPushTypes.has(notification.type);
  if (process.env.EXPO_PUSH_ENABLED !== 'true' || (!driverEligible && !residentEligible)) return;
  try {
    const preferenceColumn = Object.hasOwn(residentPreferences, notification.type) ? residentPreferences[notification.type] : null;
    const preferenceFilter = preferenceColumn
      ? ` AND (u.role <> 'RESIDENT' OR COALESCE(settings.${preferenceColumn}, TRUE) = TRUE${notification.type === 'COLLECTION_REMINDER' ? ' AND COALESCE(settings.reminder_on, TRUE) = TRUE' : ''})`
      : '';
    const [devices] = await pool.query(`SELECT p.token, p.user_id, p.session_id, u.role FROM mobile_push_devices p
      JOIN sessions s ON s.id = p.session_id AND s.user_id = p.user_id AND s.expires_at > NOW()
      JOIN users u ON u.id = p.user_id AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
      LEFT JOIN user_settings settings ON settings.user_id = u.id
      WHERE p.user_id = ? AND p.enabled = TRUE
        AND ((u.role = 'DRIVER' AND ? = 1) OR (u.role = 'RESIDENT' AND ? = 1))${preferenceFilter}
      ORDER BY p.updated_at DESC LIMIT 20`, [notification.user_id, Number(driverEligible), Number(residentEligible)]);
    if (!devices.length) return;
    const scheduleTitle = String(notification.title || 'MENRO calendar schedule').trim();
    const startDate = isSchedule ? formatScheduleDate(notification.metadata?.event_date) : null;
    const endDate = isSchedule && notification.metadata?.end_date !== notification.metadata?.event_date
      ? formatScheduleDate(notification.metadata?.end_date) : null;
    const eventDate = startDate ? `${startDate}${endDate ? ` through ${endDate}` : ''}` : null;
    const tickets = await expoRequest('send', devices.map(device => {
      const resident = device.role === 'RESIDENT';
      const title = resident
        ? (Object.hasOwn(residentTitles, notification.type) ? residentTitles[notification.type] : 'GreenWay update')
        : isSchedule ? 'New MENRO Calendar Schedule' : 'New dispatch message';
      const body = resident
        ? 'Open GreenWay Resident to view this update.'
        : isSchedule ? `${scheduleTitle}${eventDate ? ` — ${eventDate}` : ''}` : 'Open GreenWay to read your new message from dispatch.';
      return {
        to: device.token, title, body, sound: 'default', priority: 'high',
        channelId: resident ? 'resident-alerts' : isSchedule ? 'menro-calendar' : 'dispatch-messages', ttl: 3600,
        data: resident
          ? { notification_id: notification.id, destination: 'notifications' }
          : isSchedule ? {
            user_id: notification.user_id, notification_id: notification.id, ref_module: 'schedule',
            destination: 'notifications', notification_title: scheduleTitle, notification_body: notification.body || '',
          } : { user_id: notification.user_id, notification_id: notification.id, destination: 'messages' },
      };
    }));
    const receipts = new Map();
    for (const [index, ticket] of (Array.isArray(tickets) ? tickets : []).entries()) {
      if (!devices[index]) continue;
      await removeInvalid(ticket, devices[index]);
      if (ticket.status === 'ok' && typeof ticket.id === 'string') receipts.set(ticket.id, devices[index]);
    }
    if (receipts.size) {
      const timer = setTimeout(async () => {
        try {
          const results = await expoRequest('getReceipts', { ids: [...receipts.keys()] });
          for (const [id, result] of Object.entries(results || {})) if (receipts.has(id)) await removeInvalid(result, receipts.get(id));
        } catch { console.warn('Mobile push receipt check failed; notification remains in inbox.'); }
      }, 15 * 60 * 1000);
      timer.unref();
    }
  } catch { console.warn('Mobile push delivery failed; notification remains in inbox.'); }
}
module.exports = { register, unregister, sendCollectorPushAlert: sendMobilePushAlert, sendMobilePushAlert };
