import { expect, it } from "vitest";
import { GENERIC_ACTION_ERROR, getActionErrorMessage, safeFeedbackMessage } from "./feedbackMessages";

it.each([
  "Username already taken", "Current password is incorrect", "This truck is assigned to another route.",
  "Please select a barangay and street.", "A post can contain up to 5 images.",
])("keeps the actionable business reason: %s", message => {
  expect(safeFeedbackMessage(message)).toBe(message);
});
it.each(["SQL failed: SELECT name FROM users", "TypeError: cannot read properties of null", "ER_DUP_ENTRY", "password=fixture", "Bearer fixture", "<html>server error</html>"])("hides implementation details: %s", message => {
  expect(safeFeedbackMessage(message)).toBe(GENERIC_ACTION_ERROR);
});
it("gives network and timeout recovery steps", () => {
  expect(getActionErrorMessage({ code: "ERR_NETWORK" })).toContain("Check your internet connection");
  expect(getActionErrorMessage({ code: "ECONNABORTED" })).toContain("timed out");
});
it("retains the normalized rate-limit retry delay", () => {
  expect(getActionErrorMessage({ message: "Too many requests. Try again in 45 seconds.", response: { status: 429, data: { message: "Too many requests." } } })).toBe("Too many requests. Try again in 45 seconds.");
});
it("uses server business reasons for rejected actions and hides internal server failures", () => {
  expect(getActionErrorMessage({ response: { status: 409, data: { message: "This truck is already assigned." } } })).toBe("This truck is already assigned.");
  expect(getActionErrorMessage({ response: { status: 500, data: { message: "Database connection failed" } } }, "Could not save truck. Please retry.")).toBe("Could not save truck. Please retry.");
});
it("explains why an active collection route cannot be changed", () => {
  expect(safeFeedbackMessage("Today's route run has already started. Finish it before changing this route.")).toContain("Collection is already in progress");
  expect(safeFeedbackMessage("Pause this route before deleting it")).toBe("Disable this route before deleting it.");
});
