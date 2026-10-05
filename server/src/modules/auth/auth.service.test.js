const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../../config/db");
const service = require("./auth.service");
after(() => pool.end());

test("login includes the resident street used by tracking without exposing credentials", async () => {
  const original = { query: pool.query, sign: jwt.sign };
  const resident = { id: "resident", role: "RESIDENT", status: "ACTIVE", password: await bcrypt.hash("Password123!", 4), street_id: "street", street_name: "Main Street", street_area: "North", barangay_id: "barangay" };
  pool.query = async (sql) => sql.includes("FROM users u") ? [[resident]] : [{ affectedRows: 1 }];
  jwt.sign = () => "fixture-token";
  try {
    const { user } = await service.login({ identifier: "resident", password: "Password123!" });
    assert.equal(user.street_id, "street"); assert.equal(user.street_name, "Main Street"); assert.equal(user.street_area, "North");
    assert.equal(Object.hasOwn(user, "password"), false);
  } finally { pool.query = original.query; jwt.sign = original.sign; }
});
