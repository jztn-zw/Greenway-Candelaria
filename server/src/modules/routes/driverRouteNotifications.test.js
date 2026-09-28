const test = require("node:test");
const assert = require("node:assert/strict");
const { buildDueDriverRouteNotifications } = require("./driverRouteNotifications");

const routes = [
  { driver_user_id: "driver-a", template_route_id: "route-1", route_name: "North", truck_name: "Truck 1", scheduled_start_time: "06:00:00" },
  { driver_user_id: "driver-a", template_route_id: "route-2", route_name: "South", truck_name: "Truck 2", scheduled_start_time: "06:00" },
  { driver_user_id: "driver-a", template_route_id: "route-3", route_name: "East", truck_name: "Truck 3", scheduled_start_time: "08:00" },
  { driver_user_id: "driver-b", template_route_id: "route-4", route_name: "West", truck_name: "Truck 4", scheduled_start_time: "06:00" },
];

test("midnight sends one digest per driver with every assigned route", () => {
  const due = buildDueDriverRouteNotifications(routes, "00:01:00");
  assert.equal(due.length, 2);
  assert.deepEqual(due.map(({ userId, notificationKind, routes: assigned }) => [userId, notificationKind, assigned.length]), [
    ["driver-a", "DAILY_DIGEST", 3],
    ["driver-b", "DAILY_DIGEST", 1],
  ]);
});

test("start reminders group routes sharing a time, but separate drivers", () => {
  const due = buildDueDriverRouteNotifications(routes, "06:01:00");
  assert.deepEqual(due.map(({ userId, scheduledTime, routes: assigned }) => [userId, scheduledTime, assigned.length]), [
    ["driver-a", "06:00", 2],
    ["driver-b", "06:00", 1],
  ]);
  assert.match(due[0].body, /North/);
  assert.match(due[0].body, /South/);
});

test("different start times get separate reminders and stale times are skipped", () => {
  const due = buildDueDriverRouteNotifications(routes, "08:02:00");
  assert.deepEqual(due.map(({ scheduledTime, routes: assigned }) => [scheduledTime, assigned.length]), [["08:00", 1]]);
  assert.deepEqual(buildDueDriverRouteNotifications(routes, "08:06:00"), []);
});
