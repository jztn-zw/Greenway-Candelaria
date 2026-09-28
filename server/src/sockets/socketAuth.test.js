const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { authenticateSocketUser } = require("./socketAuth");

test("a previously authorized socket loses access immediately after session revocation", async () => {
  const original = pool.query;
  const secret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-socket-secret";
  const socket = {
    handshake: { auth: { token: jwt.sign({ id: "user" }, process.env.JWT_SECRET, { expiresIn: "1h" }) } },
    data: {},
  };
  let valid = true;
  pool.query = async () => [valid ? [{
    id: "user", role: "RESIDENT", status: "ACTIVE", barangay_id: "brgy", street_id: "street",
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  }] : []];
  try {
    assert.equal((await authenticateSocketUser(socket)).id, "user");
    valid = false;
    assert.equal(await authenticateSocketUser(socket), null);
  } finally {
    pool.query = original;
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
  }
});

// Release the idle database-pool timer after mocked database tests.
after(() => pool.end());
