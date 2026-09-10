const test = require("node:test");
const assert = require("node:assert/strict");
const { createReportSchema } = require("./reports.schema");

const validReport = {
  barangay_id: "barangay-1",
  violation_type: "ILLEGAL_DUMPING",
  description: "Waste has been blocking the roadside since this morning.",
  photos: ["https://res.cloudinary.com/example/image/upload/report.jpg"],
};

test("report submissions require one to five photos", () => {
  assert.equal(createReportSchema.safeParse({ ...validReport, photos: [] }).success, false);
  assert.equal(createReportSchema.safeParse({ ...validReport, photos: Array(6).fill(validReport.photos[0]) }).success, false);
  assert.equal(createReportSchema.safeParse(validReport).success, true);
});

test("report submissions reject blank text and invalid coordinates", () => {
  assert.equal(createReportSchema.safeParse({ ...validReport, description: "          " }).success, false);
  assert.equal(createReportSchema.safeParse({ ...validReport, pin_lat: 91 }).success, false);
  assert.equal(createReportSchema.safeParse({ ...validReport, pin_lng: -181 }).success, false);
});
