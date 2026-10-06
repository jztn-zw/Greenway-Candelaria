import notificationsService,{ type NotificationFilters } from "@/services/notificationsService";

// Fetch only what the current page/menu asks to display. Extra pages are
// requested when the user expands the menu, rather than on every refresh.
export const fetchNotificationWindow = async (filters: NotificationFilters) => {
  const wanted = Math.max(1, filters.limit ?? 30);
  const first = await notificationsService.fetchMyNotifications({ ...filters, limit: Math.min(wanted, 100) });
  const notifications = [...first.notifications];
  for (let offset = first.offset + first.limit; wanted > 100 && notifications.length < wanted && offset < first.total;) {
    const limit = Math.min(100, wanted - notifications.length);
    const page = await notificationsService.fetchMyNotifications({ ...filters, limit, offset });
    if (!page.notifications.length || page.offset < offset) break;
    notifications.push(...page.notifications);
    offset += limit;
  }
  return { ...first, notifications: [...new Map(notifications.map((item) => [item.id, item])).values()] };
};
