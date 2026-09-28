const todaySql = "DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '+08:00'))";
// Fixed SQL fragments; all viewer values are bound parameters.
const truckScope = (viewer, truck = "t") => {
  if (viewer?.role === "ADMIN") return { sql: "1=1", params: [] };
  if (viewer?.role === "DRIVER") return {
    sql: `EXISTS (SELECT 1 FROM drivers vd WHERE vd.truck_id = ${truck}.id AND vd.user_id = ?)`,
    params: [viewer.id],
  };
  if (viewer?.role === "RESIDENT") return {
    sql: `EXISTS (SELECT 1 FROM route_runs vr
      JOIN route_run_stops vs ON vs.route_run_id = vr.id
      JOIN users vu ON vu.id = ?
      WHERE vr.truck_id = ${truck}.id AND vr.run_date = ${todaySql}
        AND vr.status <> 'CANCELLED' AND vs.barangay_id = vu.barangay_id
        AND (vs.street_id IS NULL OR vs.street_id = vu.street_id))`,
    params: [viewer.id],
  };
  throw { statusCode: 403, message: "Tracking access is not permitted" };
};
module.exports = { truckScope, todaySql };
