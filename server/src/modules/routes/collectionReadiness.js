const hasUsableCoveragePath = (value) => {
  try {
    const path = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(path) && path.length >= 2 && path.length <= 500 &&
      path.every((point) => Array.isArray(point) && point.length === 2 &&
        typeof point[0] === "number" && Number.isFinite(point[0]) && point[0] >= -90 && point[0] <= 90 &&
        typeof point[1] === "number" && Number.isFinite(point[1]) && point[1] >= -180 && point[1] <= 180) &&
      path.some((point) => point[0] !== path[0][0] || point[1] !== path[0][1]);
  } catch {
    return false;
  }
};

// Barangay writes take the same parent-row lock. This makes availability and
// coverage validation atomic with saving an enabled route.
const assertCollectionReadyForStops = async (connection, stops) => {
  const barangayIds = [...new Set(stops.map((stop) => String(stop.barangay_id || "").trim()).filter(Boolean))].sort();
  if (!barangayIds.length) {
    throw { statusCode: 409, message: "Add a collection stop before enabling this route" };
  }
  const [barangays] = await connection.query(
    `SELECT id, collection_service_available FROM barangays
     WHERE id IN (${barangayIds.map(() => "?").join(", ")}) ORDER BY id FOR UPDATE`,
    barangayIds,
  );
  if (barangays.length !== barangayIds.length) {
    throw { statusCode: 404, message: "A route barangay no longer exists" };
  }
  if (barangays.some((barangay) => !barangay.collection_service_available)) {
    throw { statusCode: 409, message: "Enable collection service for every route barangay before scheduling it" };
  }

  const streetIds = [...new Set(stops.map((stop) => String(stop.street_id || "").trim()).filter(Boolean))];
  if (!streetIds.length) return;
  const [streets] = await connection.query(
    `SELECT id, barangay_id, name, area, coverage_path FROM barangay_streets
     WHERE id IN (${streetIds.map(() => "?").join(", ")}) ORDER BY id FOR UPDATE`,
    streetIds,
  );
  const streetById = new Map(streets.map((street) => [street.id, street]));
  for (const stop of stops) {
    if (!stop.street_id) continue;
    const street = streetById.get(String(stop.street_id).trim());
    if (!street || street.barangay_id !== String(stop.barangay_id).trim()) {
      throw { statusCode: 409, message: "A route street no longer belongs to its barangay" };
    }
    if (!hasUsableCoveragePath(street.coverage_path)) {
      throw { statusCode: 409, message: `${street.name} needs a coverage path before it can be scheduled` };
    }
  }
};

module.exports = { assertCollectionReadyForStops, hasUsableCoveragePath };
