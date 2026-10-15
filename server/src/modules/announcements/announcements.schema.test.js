const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createAnnouncementSchema } = require("./announcements.schema");

const baseAnnouncement = {
  title: "Notice title",
  body: "Notice details",
  status: "DRAFT",
  target_all: true,
};

test("new announcements accept only announcement notice types", () => {
  for (const type of ["GENERAL_NOTICE", "EMERGENCY_ADVISORY", "SYSTEM_MAINTENANCE"]) {
    assert.equal(createAnnouncementSchema.safeParse({ ...baseAnnouncement, type }).success, true);
  }

  for (const type of ["SCHEDULE_CHANGE", "HOLIDAY_REMINDER", "COMMUNITY_EVENT"]) {
    assert.equal(createAnnouncementSchema.safeParse({ ...baseAnnouncement, type }).success, false);
  }
});
