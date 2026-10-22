import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AxiosError } from "axios";
import api from "./api";
import { GENERIC_ACTION_ERROR } from "./feedbackMessages";

const adapter = api.defaults.adapter;
beforeEach(() => { vi.spyOn(console, "error").mockImplementation(() => {}); });
afterEach(() => { api.defaults.adapter = adapter; vi.restoreAllMocks(); });
const fail = (status: number, data: unknown) => {
  api.defaults.adapter = async config => {
    throw new AxiosError("Request failed with status code " + status, "ERR_BAD_REQUEST", config, {}, { config, data, status, statusText: "Error", headers: {} });
  };
};
it("preserves domain rejection messages for existing callers", async () => {
  fail(409, { message: "This truck is assigned to another route." });
  await expect(api.patch("/routes/fixture", {})).rejects.toMatchObject({ message: "This truck is assigned to another route.", response: { data: { message: "This truck is assigned to another route." } } });
});
it("preserves field validation for forms and toasts", async () => {
  fail(400, { message: "Validation failed", errors: [{ field: "username", message: "Username already taken" }] });
  await expect(api.patch("/users/fixture", {})).rejects.toMatchObject({ message: "Username already taken", response: { data: { errors: [{ field: "username", message: "Username already taken" }] } } });
});
it("keeps server diagnostics out of both error access patterns", async () => {
  fail(500, { message: "SQL failure", errors: [{ field: "query", message: "SELECT private FROM fixture" }] });
  await expect(api.patch("/routes/fixture", {})).rejects.toMatchObject({ message: GENERIC_ACTION_ERROR, response: { data: { message: GENERIC_ACTION_ERROR, errors: [] } } });
});
it.each(["<html>Bad gateway</html>", "Service unavailable", "", null])("normalizes non-JSON failure bodies without replacing the Axios error: %s", async body => {
  fail(502, body);
  await expect(api.patch("/routes/fixture", {})).rejects.toMatchObject({ isAxiosError: true, message: GENERIC_ACTION_ERROR, config: { url: "/routes/fixture" }, response: { status: 502, data: { message: GENERIC_ACTION_ERROR } } });
});
