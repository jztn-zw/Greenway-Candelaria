const { z } = require('zod');

const coordinates = { latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180) };
const residentLocationSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('MANUAL_PIN'), ...coordinates }).strict(),
  z.object({ method: z.literal('CURRENT_LOCATION'), ...coordinates,
    accuracyMeters: z.number().finite().min(0).max(100000), capturedAt: z.string().datetime() }).strict(),
  z.object({ method: z.literal('STREET_POINT'), ...coordinates, pointIndex: z.number().int().min(0).max(99) }).strict(),
]).nullable();
const decoded = value => { try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return null; } };
const validPoint = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)
  && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180;
const streetPath = value => {
  const path = decoded(value);
  return Array.isArray(path) && path.length >= 2 && path.length <= 500 && path.every(validPoint)
    && path.some(point => point[0] !== path[0][0] || point[1] !== path[0][1]) ? path : [];
};
const savedStreetPoints = value => {
  const edit = decoded(value);
  const points = edit?.mode === 'ROAD' ? streetPath(edit.points) : [];
  return points.length <= 100 ? points : [];
};

// Local metre projection for the short municipal street segments. The same
// distance is previewed by the setup picker; the server always rechecks it.
const distanceToStreet = (latitude, longitude, path) => {
  const scaleX = 111320 * Math.cos(latitude * Math.PI / 180), scaleY = 110574;
  let nearest = Infinity;
  for (let index = 1; index < path.length; index++) {
    const [a, b] = [path[index - 1], path[index]];
    const x = (a[1] - longitude) * scaleX, y = (a[0] - latitude) * scaleY;
    const dx = (b[1] - a[1]) * scaleX, dy = (b[0] - a[0]) * scaleY;
    const t = dx * dx + dy * dy ? Math.max(0, Math.min(1, -(x * dx + y * dy) / (dx * dx + dy * dy))) : 0;
    nearest = Math.min(nearest, Math.hypot(x + t * dx, y + t * dy));
  }
  return nearest;
};
const invalid = message => { throw { statusCode: 400, field: 'resident_location', message }; };
const validateResidentLocation = (input, street) => {
  const result = residentLocationSchema.safeParse(input);
  if (!result.success) invalid('Choose a valid location using one of the available options.');
  const location = result.data;
  if (!location) return null;
  if (location.method === 'CURRENT_LOCATION' && location.accuracyMeters > 50) {
    invalid('Your device location is not accurate enough. Choose Pin on Map or Street Point instead.');
  }
  if (!street) invalid('Select a street from your barangay.');
  const path = streetPath(street.coverage_path);
  if (!path.length || distanceToStreet(location.latitude, location.longitude, path) > 100) {
    invalid('This pin is not near your selected street coverage. Move it or choose the correct street.');
  }
  if (location.method === 'STREET_POINT') {
    const point = savedStreetPoints(street.coverage_edit)[location.pointIndex];
    if (!point || Math.abs(point[0] - location.latitude) > 0.000001 || Math.abs(point[1] - location.longitude) > 0.000001) {
      invalid('This street point has changed. Select a current point or use Pin on Map.');
    }
    location.latitude = point[0]; location.longitude = point[1];
  }
  return { ...location, barangayId: street.barangay_id, streetId: street.id };
};

module.exports = { residentLocationSchema, validateResidentLocation, savedStreetPoints };
