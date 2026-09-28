const DELIVERY_WINDOW_MINUTES = 5;

const toMinutes = (time) => {
  const [hours, minutes] = String(time).split(":").map(Number);
  return hours * 60 + minutes;
};

const formatTime = (time) => String(time).slice(0, 5);

const routeLabel = (route, index) => {
  const name = route.route_name || route.truck_name || `Route ${index + 1}`;
  const truck = route.route_name && route.truck_name ? ` on ${route.truck_name}` : "";
  return `${name}${truck} (${formatTime(route.scheduled_start_time)})`;
};

const buildDueDriverRouteNotifications = (routes, currentTime) => {
  const currentMinute = toMinutes(currentTime);
  const notifications = [];
  const byDriver = new Map();

  for (const route of routes) {
    const assigned = byDriver.get(route.driver_user_id) || [];
    assigned.push(route);
    byDriver.set(route.driver_user_id, assigned);
  }

  if (currentMinute < DELIVERY_WINDOW_MINUTES) {
    for (const [userId, assigned] of byDriver) {
      const count = assigned.length;
      notifications.push({
        userId,
        notificationKind: "DAILY_DIGEST",
        scheduledTime: "",
        title: "Today's collection routes",
        body: `You have ${count} collection route${count === 1 ? "" : "s"} today: ${assigned.map(routeLabel).join(", ")}.`,
        routes: assigned,
      });
    }
  }

  const byDriverAndTime = new Map();
  for (const route of routes) {
    const scheduledTime = formatTime(route.scheduled_start_time);
    const minutesLate = currentMinute - toMinutes(scheduledTime);
    if (minutesLate < 0 || minutesLate >= DELIVERY_WINDOW_MINUTES) continue;

    const key = `${route.driver_user_id}:${scheduledTime}`;
    const simultaneous = byDriverAndTime.get(key) || [];
    simultaneous.push(route);
    byDriverAndTime.set(key, simultaneous);
  }

  for (const simultaneous of byDriverAndTime.values()) {
    const count = simultaneous.length;
    const scheduledTime = formatTime(simultaneous[0].scheduled_start_time);
    notifications.push({
      userId: simultaneous[0].driver_user_id,
      notificationKind: "START_TIME",
      scheduledTime,
      title: "Collection route start time",
      body: `${count === 1 ? "Your route is" : `Your ${count} routes are`} scheduled for ${scheduledTime}: ${simultaneous.map(routeLabel).join(", ")}.`,
      routes: simultaneous,
    });
  }

  return notifications;
};

module.exports = { buildDueDriverRouteNotifications };
