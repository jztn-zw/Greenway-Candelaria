// Read-only verification against the configured database. Do not print history payloads.
require("dotenv").config({ quiet: true });
const { pool } = require("../src/config/db");
const { getHistoryForUser } = require("../src/modules/routes/routeHistory.service");
(async () => {
  const [[driver]] = await pool.query("SELECT d.user_id FROM drivers d JOIN route_runs rr ON rr.driver_id=d.id WHERE rr.status IN ('COMPLETED','PARTIAL') LIMIT 1");
  const userId = driver?.user_id || "history-verification-no-user";
  const page = await getHistoryForUser(userId, 15, { view: "collector" });
  let detailVerified = false;
  if (page.items[0]) {
    const detail = await getHistoryForUser(userId, 1, { view: "collector", run_id: page.items[0].id });
    detailVerified = detail.items.length === 1 && detail.items[0].id === page.items[0].id;
    try {
      await getHistoryForUser("history-verification-other-user", 1, { view: "collector", run_id: page.items[0].id });
      throw new Error("History ownership check failed");
    } catch (error) { if (error.statusCode !== 404) throw error; }
  }
  await getHistoryForUser(userId, 15, { view: "collector", status: "no-collection", waste_type: "General" });
  console.log(JSON.stringify({ listVerified: true, detailVerified, returnedItems: page.items.length, ownershipVerified: detailVerified }));
})().catch((error) => { console.error("History verification failed:", error.code || error.message); process.exitCode = 1; }).finally(() => pool.end());
