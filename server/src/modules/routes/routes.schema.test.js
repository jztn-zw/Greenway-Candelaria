const test = require("node:test");
const assert = require("node:assert/strict");
const { createRouteSchema, updateRouteSchema, updateStopStatusSchema } = require("./routes.schema");

const validRoute = {
  truck_id: "truck-1",
  driver_id: "driver-1",
  day_of_week: "MONDAY",
  start_time: "06:00",
  stops: [{ barangay_id: "barangay-1", stop_order: 1 }],
};

test("route schedules require valid times and at least one stop", () => {
  assert.equal(createRouteSchema.safeParse(validRoute).success, true);
  assert.equal(createRouteSchema.safeParse({ ...validRoute, start_time: "not-a-time" }).success, false);
  assert.equal(updateRouteSchema.safeParse({ stops: [] }).success, false);
});

test("route stop order must be unique", () => {
  const result = createRouteSchema.safeParse({
    ...validRoute,
    stops: [
      { barangay_id: "barangay-1", stop_order: 1 },
      { barangay_id: "barangay-2", stop_order: 1 },
    ],
  });
  assert.equal(result.success, false);
});

test("missed stops require a reason", () => {
  assert.equal(updateStopStatusSchema.safeParse({ status: "MISSED" }).success, false);
  assert.equal(updateStopStatusSchema.safeParse({ status: "MISSED", skipped_reason: "Road blocked" }).success, true);
});
