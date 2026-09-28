const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { pool } = require("../../config/db");
const service = require("./routes.service");
const audit = require("../audit/audit.service");
after(() => pool.end());
test("route deletion rolls back when its collector notification cannot be saved", async () => {
  const originalQuery = pool.query, originalConnection = pool.getConnection, originalAudit = audit.logInTransaction;
  let rollback = false; let commit = false; let deleted = false;
  pool.query = async (sql) => {
    if (sql.includes("SELECT d.user_id")) return [[{ user_id: "collector" }]];
    if (sql.includes("FROM routes r")) return [[{ id: "template", status: "INACTIVE", name: "North" }]];
    if (sql.includes("REFERENTIAL_CONSTRAINTS")) return [[{ DELETE_RULE: "SET NULL" }]];
    return [[]];
  };
  audit.logInTransaction = async () => {};
  pool.getConnection = async () => ({ beginTransaction: async () => {}, commit: async () => { commit = true; }, rollback: async () => { rollback = true; }, release: () => {}, query: async (sql) => {
    if (sql.includes("DELETE FROM routes")) deleted = true;
    if (sql.includes("INSERT INTO notifications")) throw new Error("notification failed");
    return [{ affectedRows: 1 }];
  } });
  try { await assert.rejects(service.remove("template", "admin"), /notification failed/); assert.equal(deleted, true); assert.equal(rollback, true); assert.equal(commit, false); }
  finally { pool.query = originalQuery; pool.getConnection = originalConnection; audit.logInTransaction = originalAudit; }
});
