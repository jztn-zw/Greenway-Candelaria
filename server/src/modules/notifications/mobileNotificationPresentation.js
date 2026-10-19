function notificationMetadata(row) {
  try {
    const value = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

const formatLegacyScheduleMessage = (message) => {
  const match = message.match(/^Scheduled for (\d{4}-\d{2}-\d{2})(?: to (\d{4}-\d{2}-\d{2}))?(?:\s+—\s+([\s\S]*))?$/i);
  if (!match) return message.replace(/\r?\n\s*Details:\s*/i, '\n');
  const formatDate = (value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "";
    return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }).format(date);
  };
  const start = formatDate(match[1]);
  const end = match[2] ? formatDate(match[2]) : "";
  if (!start || (match[2] && !end)) return message;
  const details = match[3]?.trim();
  return `Scheduled for ${start}${end ? ` through ${end}` : ""}.${details ? `\n${details}` : ""}`;
};

/** Match mobile inbox copy; cross-app contract tests cover both role formatters. */
function mobileNotificationPresentation(row, role) {
  const cleanTitle = (row.title || '').replace(/(?:🚨|⚠️|⚠)/gu, '').trim();
  const title = cleanTitle || (role === 'RESIDENT' ? 'System Notification' : 'System update');
  const message = row.body?.trim() || '';
  if (row.ref_module === 'schedule')
    return { title: `MENRO Candelaria added a new calendar event: ${cleanTitle || 'Calendar Schedule'}`, message: formatLegacyScheduleMessage(message) };
  if (row.ref_module === 'announcements' || row.type === 'ANNOUNCEMENT')
    return { title: `MENRO Candelaria posted an announcement: ${cleanTitle || 'Official Notice'}`, message };
  if (row.ref_module === 'posts' || row.type === 'NEW_POST') {
    const metadata = notificationMetadata(row);
    const legacy = message.match(/^["“]([\s\S]+)["”]\s+is now available in Community (?:Posts|Updates)\.$/i);
    const specific = !/^new community (?:post|update)$/i.test(cleanTitle) ? cleanTitle : '';
    const subjectTitle = (typeof metadata.post_title === 'string' ? metadata.post_title.trim() : '') || legacy?.[1] || specific;
    const category = String(metadata.category || '').toUpperCase();
    const subject = category === 'WASTE_TIP' ? 'waste tip' : category === 'EVENT' ? 'event update' : 'community update';
    return { title: `MENRO Candelaria ${subjectTitle ? `posted a community update: ${subjectTitle}` : 'posted a new community update'}`,
      message: legacy || !message ? `Read the latest ${subject} in Community Updates.` : message };
  }
  if (row.ref_module === 'driver-messages' && /^New Dispatch Message$/i.test(title))
    return { title: 'Dispatch sent a message', message };
  return { title, message };
}

exports.mobileNotificationPresentation = mobileNotificationPresentation;
