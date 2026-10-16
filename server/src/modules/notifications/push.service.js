const { pool } = require('../../config/db');
const hashSessionToken = require('../../utils/hashSessionToken');
const validToken = value => typeof value === 'string' && /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{1,200}\]$/.test(value);
const fail = (message, statusCode = 400) => { throw { statusCode, message }; };
const formatScheduleDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric', year: 'numeric' }).format(date);
};

async function sessionId(user, token) {
  if (user.role !== 'DRIVER') fail('Mobile push is available to collectors only', 403);
  const [rows] = await pool.query('SELECT id FROM sessions WHERE user_id = ? AND token IN (?, ?) AND expires_at > NOW()', [user.id, hashSessionToken(token), token]);
  if (!rows.length) fail('Session expired or invalid', 401);
  return rows[0].id;
}
async function register(user, credential, input = {}) {
  if (user.role !== 'DRIVER') fail('Mobile push is available to collectors only', 403);
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
async function removeInvalid(result, token) {
  if (result?.details?.error === 'DeviceNotRegistered') await pool.query('DELETE FROM mobile_push_devices WHERE token = ?', [token]);
}

// Best-effort push supplements the durable inbox. Provider errors must never
// roll back or fail an already committed notification.
async function sendCollectorPushAlert(notification) {
  const isSchedule = notification.ref_module === 'schedule';
  if (process.env.EXPO_PUSH_ENABLED !== 'true' || (!isSchedule && notification.ref_module !== 'driver-messages')) return;
  try {
    const [devices] = await pool.query(`SELECT p.token FROM mobile_push_devices p
      JOIN sessions s ON s.id = p.session_id AND s.user_id = p.user_id AND s.expires_at > NOW()
      JOIN users u ON u.id = p.user_id AND u.role = 'DRIVER' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
      WHERE p.user_id = ? AND p.enabled = TRUE ORDER BY p.updated_at DESC LIMIT 20`, [notification.user_id]);
    if (!devices.length) return;
    const scheduleTitle = String(notification.title || 'MENRO calendar schedule').trim();
    const startDate = isSchedule ? formatScheduleDate(notification.metadata?.event_date) : null;
    const endDate = isSchedule && notification.metadata?.end_date !== notification.metadata?.event_date
      ? formatScheduleDate(notification.metadata?.end_date) : null;
    const eventDate = startDate ? `${startDate}${endDate ? ` through ${endDate}` : ''}` : null;
    const tickets = await expoRequest('send', devices.map(device => ({
      to: device.token,
      title: isSchedule ? 'New MENRO Calendar Schedule' : 'New dispatch message',
      body: isSchedule ? `${scheduleTitle}${eventDate ? ` — ${eventDate}` : ''}` : 'Open GreenWay to read your new message from dispatch.',
      sound: 'default', priority: 'high', channelId: isSchedule ? 'menro-calendar' : 'dispatch-messages', ttl: 3600,
      data: isSchedule ? {
        user_id: notification.user_id, notification_id: notification.id, ref_module: 'schedule',
        destination: 'notifications', notification_title: scheduleTitle, notification_body: notification.body || '',
      } : { user_id: notification.user_id, notification_id: notification.id, destination: 'messages' },
    })));
    const receipts = new Map();
    for (const [index, ticket] of (Array.isArray(tickets) ? tickets : []).entries()) {
      if (!devices[index]) continue;
      await removeInvalid(ticket, devices[index].token);
      if (ticket.status === 'ok' && typeof ticket.id === 'string') receipts.set(ticket.id, devices[index].token);
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
module.exports = { register, unregister, sendCollectorPushAlert };
