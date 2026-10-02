import { describe, expect, it } from "vitest";
import { prepareReportDescription } from "./reportDescription";

describe("report description preparation", () => {
  it("excludes an unanswered suggestion from the minimum length", () => {
    expect(prepareReportDescription("sadsadADA\n\nWhich street or landmark was affected? ")).toBe("sadsadADA");
    expect(prepareReportDescription("sadsadADA\n\nWhich street or landmark was affected? ").length).toBe(9);
  });

  it("keeps answers and questions written by the resident", () => {
    expect(prepareReportDescription("Which street or landmark was affected? Main Street")).toBe("Which street or landmark was affected? Main Street");
    expect(prepareReportDescription("What caused the spill?\n\nWaste blocked the road.")).toBe("What caused the spill?\n\nWaste blocked the road.");
  });
});
