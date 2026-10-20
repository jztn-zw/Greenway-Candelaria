const { pool } = require('../../config/db');
const hashSessionToken = require('../../utils/hashSessionToken');
const { randomUUID, createHash } = require('node:crypto');
const { mobileNotificationPresentation } = require('./mobileNotificationPresentation');
const { withPushSlot, expoRequest, waitForPushRetry } = require('./push.transport');
const preview = (value, limit) => {
  const characters = Array.from(value);
  return characters.slice(0, limit).join('') + (characters.length > limit ? '…' : '');
};
const validToken = value => typeof value === 'string' && /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]{1,200}\]$/.test(value);
const fail = (message, statusCode = 400) => { throw { statusCode, message }; };
const residentPushTypes = new Set(['COLLECTION_REMINDER', 'TRUCK_IS_NEAR', 'COLLECTION_DONE', 'REPORT_UPDATE', 'NEW_POST', 'ANNOUNCEMENT', 'MISSED_COLLECTION', 'SYSTEM']);
const residentPreferences = {
  ANNOUNCEMENT: 'notif_announcements', NEW_POST: 'notif_new_content',
  COLLECTION_REMINDER: 'notif_collection_reminders', TRUCK_IS_NEAR: 'notif_truck_near',
  COLLECTION_DONE: 'notif_collection_done', MISSED_COLLECTION: 'notif_collection_skipped',
  REPORT_UPDATE: 'notif_report_updates',
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
  if (input.native_token !== undefined && (typeof input.native_token !== 'string' || !input.native_token.length || input.native_token.length > 4096)) fail('Invalid native notification registration');
  const session = await sessionId(user, credential);
  const nativeHash = input.native_token ? createHash('sha256').update(input.native_token).digest('hex') : null;
  if (input.enabled && input.supports_token_recovery === true) {
    const [rejected] = await pool.query('SELECT registration_version, native_token_hash FROM mobile_push_devices WHERE token = ? AND last_error = ?', [input.token, 'DeviceNotRegistered']);
    const invalid = rejected[0];
    const changedNativeToken = invalid?.native_token_hash && nativeHash && invalid.native_token_hash !== nativeHash;
    if (invalid && !changedNativeToken) {
      const refresh = { registered: false, refresh_token: true, recovery_version: invalid.registration_version, service_enabled: process.env.EXPO_PUSH_ENABLED === 'true' };
      if (!invalid.registration_version || input.renewed_token_version !== invalid.registration_version) return refresh;
      // Expo tokens identify installations and may stay the same after native renewal.
      const [updated] = await pool.query(`UPDATE mobile_push_devices SET user_id = ?, session_id = ?, platform = ?, enabled = TRUE,
        registration_version = ?, native_token_hash = ?, last_error = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE token = ? AND registration_version = ? AND last_error = ?`,
      [user.id, session, input.platform, randomUUID(), nativeHash, input.token, invalid.registration_version, 'DeviceNotRegistered']);
      return updated.affectedRows ? { registered: true, service_enabled: process.env.EXPO_PUSH_ENABLED === 'true' } : refresh;
    }
  }
  await pool.query(`INSERT INTO mobile_push_devices (token, user_id, session_id, platform, enabled, registration_version, native_token_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE
      last_error = IF(VALUES(enabled) = TRUE AND (? = 0 OR user_id <> VALUES(user_id) OR session_id <> VALUES(session_id)
        OR NOT (native_token_hash <=> VALUES(native_token_hash))), NULL, last_error),
      registration_version = IF(user_id = VALUES(user_id) AND session_id = VALUES(session_id)
        AND native_token_hash <=> VALUES(native_token_hash), COALESCE(registration_version, VALUES(registration_version)), VALUES(registration_version)),
      user_id = VALUES(user_id), session_id = VALUES(session_id), native_token_hash = VALUES(native_token_hash),
      platform = VALUES(platform), enabled = VALUES(enabled),
      updated_at = CURRENT_TIMESTAMP`,
    [input.token, user.id, session, input.platform, input.enabled, randomUUID(), nativeHash, Number(input.supports_token_recovery === true)]);
  if (input.enabled && input.supports_token_recovery === true) {
    // A receipt may have arrived between the initial check and the upsert.
    const [invalid] = await pool.query('SELECT registration_version FROM mobile_push_devices WHERE token = ? AND user_id = ? AND session_id = ? AND last_error = ?', [input.token, user.id, session, 'DeviceNotRegistered']);
    if (invalid.length) return { registered: false, refresh_token: true, recovery_version: invalid[0].registration_version, service_enabled: process.env.EXPO_PUSH_ENABLED === 'true' };
  }
  return { registered: true, service_enabled: process.env.EXPO_PUSH_ENABLED === 'true' };
}
async function unregister(user, credential, input = {}) {
  if (!validToken(input.token)) fail('Invalid push token');
  const session = await sessionId(user, credential);
  await pool.query('DELETE FROM mobile_push_devices WHERE token = ? AND user_id = ? AND session_id = ?', [input.token, user.id, session]);
  return { registered: false };
}
const providerErrorCodes = new Set(['DeviceNotRegistered', 'MessageTooBig', 'MessageRateExceeded', 'MismatchSenderId', 'InvalidCredentials']);
async function removeInvalid(result, device, stage = 'ticket') {
  if (result?.status === 'error') {
    // Provider messages can contain tokens or private payloads. Log only known codes.
    const code = providerErrorCodes.has(result.details?.error) ? result.details.error : 'UnknownProviderError';
    console.warn(`Mobile push ${stage} rejected (${code}); notification remains in inbox.`);
  }
  if (result?.details?.error === 'DeviceNotRegistered') {
    // Versioning also protects enrollments renewed within the same second.
    // Preserve the rejection so a modern app can renew its native FCM/APNs token.
    await pool.query('UPDATE mobile_push_devices SET last_error = ?, registration_version = COALESCE(registration_version, ?) WHERE token = ? AND user_id = ? AND session_id = ? AND registration_version <=> ?', ['DeviceNotRegistered', randomUUID(), device.token, device.user_id, device.session_id, device.registration_version]);
  }
}

async function eligibleDevices(notification) {
  const isSchedule = notification.ref_module === 'schedule';
  const isDriverMessage = notification.ref_module === 'driver-messages';
  const driverEligible = isSchedule || isDriverMessage;
  const residentEligible = residentPushTypes.has(notification.type);
  if (process.env.EXPO_PUSH_ENABLED !== 'true' || (!driverEligible && !residentEligible)) return [];
  const preferenceColumn = Object.hasOwn(residentPreferences, notification.type) ? residentPreferences[notification.type] : null;
  // General system pushes also stop when the resident turns every phone alert off.
  const anyResidentAlert = Object.values(residentPreferences).map(column => column === 'notif_collection_reminders'
    ? '(COALESCE(settings.notif_collection_reminders, TRUE) = TRUE AND COALESCE(settings.reminder_on, TRUE) = TRUE)'
    : `COALESCE(settings.${column}, TRUE) = TRUE`).join(' OR ');
  const preferenceFilter = preferenceColumn
    ? ` AND (u.role <> 'RESIDENT' OR COALESCE(settings.${preferenceColumn}, TRUE) = TRUE${notification.type === 'COLLECTION_REMINDER' ? ' AND COALESCE(settings.reminder_on, TRUE) = TRUE' : ''})`
    : ` AND (u.role <> 'RESIDENT' OR (${anyResidentAlert}))`;
  const [devices] = await pool.query(`SELECT p.token, p.user_id, p.session_id, p.registration_version, u.role FROM mobile_push_devices p
      JOIN sessions s ON s.id = p.session_id AND s.user_id = p.user_id AND s.expires_at > NOW()
      JOIN users u ON u.id = p.user_id AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
      LEFT JOIN user_settings settings ON settings.user_id = u.id
      WHERE p.user_id = ? AND p.enabled = TRUE AND p.last_error IS NULL
        AND ((u.role = 'DRIVER' AND ? = 1) OR (u.role = 'RESIDENT' AND ? = 1))${preferenceFilter}
      ORDER BY p.updated_at DESC LIMIT 20`, [notification.user_id, Number(driverEligible), Number(residentEligible)]);
  return devices;
}

const deviceKey = device => `${device.token}:${device.session_id}`;

function checkReceipts(receipts) {
  if (!receipts.size) return;
  const timer = setTimeout(() => withPushSlot(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const results = await expoRequest('getReceipts', { ids: [...receipts.keys()] });
        for (const [id, result] of Object.entries(results || {})) {
          if (receipts.has(id)) { await removeInvalid(result, receipts.get(id), 'receipt'); receipts.delete(id); }
        }
        if (!receipts.size) return;
      } catch (error) {
        if (!error.retryable) break;
      }
      if (attempt < 2) await waitForPushRetry(attempt);
    }
    console.warn('Mobile push receipt check incomplete; notification remains in inbox.');
  }).catch(() => { console.warn('Mobile push receipt check failed; notification remains in inbox.'); }), 15 * 60 * 1000);
  timer.unref();
}

// Push failures never roll back the committed inbox. Retries are process-local;
// a durable outbox is required to survive a server restart during delivery.
async function deliverMobilePush(notification) {
  const receipts = new Map();
  let pending;
  const isSchedule = notification.ref_module === 'schedule';
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const devices = (await eligibleDevices(notification)).filter(device => !pending || pending.has(deviceKey(device)));
      if (!devices.length) break;
      let tickets;
      try {
        tickets = await expoRequest('send', devices.map(device => {
          const resident = device.role === 'RESIDENT';
          const copy = mobileNotificationPresentation(notification, resident ? 'RESIDENT' : 'DRIVER');
          // Bound Unicode previews so long inbox messages fit the provider payload.
          const title = preview(copy.title, 160), body = preview(copy.message, 240);
          return {
            to: device.token, title, body, sound: 'default', priority: 'high',
            channelId: resident ? 'resident-alerts' : isSchedule ? 'menro-calendar' : 'dispatch-messages', ttl: 3600,
            data: resident
              ? { notification_id: notification.id, destination: 'notifications' }
              : isSchedule ? {
                user_id: notification.user_id, notification_id: notification.id, ref_module: 'schedule',
                destination: 'notifications', notification_title: preview(String(notification.title || '').trim(), 160),
                notification_body: preview(String(notification.body || '').trim(), 240),
              } : { user_id: notification.user_id, notification_id: notification.id, destination: 'messages' },
          };
        }));
      } catch (error) {
        if (!error.retryable || attempt === 2) throw error;
        pending = new Set(devices.map(deviceKey));
        await waitForPushRetry(attempt, error);
        continue;
      }
      pending = new Set();
      for (const [index, ticket] of (Array.isArray(tickets) ? tickets : []).entries()) {
        if (!devices[index]) continue;
        await removeInvalid(ticket, devices[index]);
        if (ticket.status === 'ok' && typeof ticket.id === 'string') receipts.set(ticket.id, devices[index]);
        if (ticket.details?.error === 'MessageRateExceeded') pending.add(deviceKey(devices[index]));
      }
      if (!pending.size) break;
      if (attempt < 2) await waitForPushRetry(attempt);
    }
  } catch { console.warn('Mobile push delivery failed; notification remains in inbox.'); }
  checkReceipts(receipts);
}
function sendMobilePushAlert(notification) {
  return withPushSlot(() => deliverMobilePush(notification));
}
module.exports = { register, unregister, sendCollectorPushAlert: sendMobilePushAlert, sendMobilePushAlert };
