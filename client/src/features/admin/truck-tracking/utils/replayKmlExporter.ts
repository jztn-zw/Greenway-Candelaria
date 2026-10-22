import type { ReplayTrip } from "./replayTrip";

interface ExportGpsOptions {
  truckName: string;
  plateNumber: string;
  dateStr: string;
  trip: ReplayTrip;
  signal?: AbortSignal;
}

// XML 1.0 forbids these control characters even in escaped text.
// eslint-disable-next-line no-control-regex
const xml = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/[<>&"']/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);
const validPoint = ([lat, lng]: [number, number]) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

const replaySegments = (trip: ReplayTrip): number[][] => {
  if (!trip.path.length || trip.path.length !== trip.times.length || trip.path.some((point, index) => !validPoint(point) || !Number.isFinite(trip.times[index]) || Math.abs(trip.times[index]) > 8.64e15 || (index > 0 && trip.times[index] < trip.times[index - 1]))) {
    throw new Error("Valid GPS records and timestamps are required to export this replay.");
  }
  const segments: number[][] = [];
  trip.path.forEach((_, index) => {
    if (!index || trip.breakBefore?.[index]) segments.push([]);
    segments[segments.length - 1].push(index);
  });
  return segments;
};

export const buildReplayKml = ({ truckName, plateNumber, dateStr, trip }: ExportGpsOptions): string => {
  const segments = replaySegments(trip);
  const track = segments.map(indices => `<gx:Track><altitudeMode>clampToGround</altitudeMode>${indices.map(index => `<when>${new Date(trip.times[index]).toISOString()}</when>`).join("")}${indices.map(index => `<gx:coord>${trip.path[index][1]} ${trip.path[index][0]} 0</gx:coord>`).join("")}</gx:Track>`).join("");
  // A static trail also supports viewers that do not implement gx:Track.
  const trail = segments.map(indices => indices.length === 1
    ? `<Point><coordinates>${trip.path[indices[0]][1]},${trip.path[indices[0]][0]},0</coordinates></Point>`
    : `<LineString><tessellate>1</tessellate><coordinates>${indices.map(index => `${trip.path[index][1]},${trip.path[index][0]},0`).join(" ")}</coordinates></LineString>`).join("");
  const targets = (trip.stops ?? []).flatMap(stop => {
    if (!stop.location || !validPoint(stop.location.coords)) return [];
    const [lat, lng] = stop.location.coords;
    return [`<Placemark><name>${xml(stop.targetName)}</name><ExtendedData><Data name="status"><value>${xml(stop.status)}</value></Data></ExtendedData><Point><coordinates>${lng},${lat},0</coordinates></Point></Placemark>`];
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2"><Document>
<name>${xml(`${truckName} — ${dateStr}`)}</name>
<ExtendedData><Data name="plateNumber"><value>${xml(plateNumber)}</value></Data></ExtendedData>
<Style id="route"><LineStyle><color>ff99b214</color><width>4</width></LineStyle></Style>
<Placemark><name>Recorded Route</name><styleUrl>#route</styleUrl><MultiGeometry>${trail}</MultiGeometry></Placemark>
<Placemark><name>Timed Replay</name><styleUrl>#route</styleUrl><gx:MultiTrack><altitudeMode>clampToGround</altitudeMode><gx:interpolate>0</gx:interpolate>${track}</gx:MultiTrack></Placemark>
<Folder><name>Target Streets</name>${targets}</Folder>
</Document></kml>`;
};

export const buildReplayGpx = ({ truckName, plateNumber, dateStr, trip }: ExportGpsOptions): string => {
  const segments = replaySegments(trip);
  const waypoints = (trip.stops ?? []).flatMap(stop => {
    if (!stop.location || !validPoint(stop.location.coords)) return [];
    const [lat, lng] = stop.location.coords;
    return [`<wpt lat="${lat}" lon="${lng}"><name>${xml(stop.targetName)}</name><desc>${xml(stop.status)}</desc></wpt>`];
  }).join("");
  const tracks = segments.map(indices => `<trkseg>${indices.map(index => `<trkpt lat="${trip.path[index][0]}" lon="${trip.path[index][1]}"><time>${new Date(trip.times[index]).toISOString()}</time></trkpt>`).join("")}</trkseg>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GreenWay" xmlns="http://www.topografix.com/GPX/1/1">
<metadata><name>${xml(`${truckName} — ${dateStr}`)}</name><desc>${xml(plateNumber)}</desc></metadata>
${waypoints}<trk><name>Recorded Route</name>${tracks}</trk></gpx>`;
};

const exportGpsFile = async (options: ExportGpsOptions, extension: "kml" | "gpx"): Promise<void> => {

  options.signal?.throwIfAborted();
  const content = extension === "kml" ? buildReplayKml(options) : buildReplayGpx(options);
  options.signal?.throwIfAborted();
  const url = URL.createObjectURL(new Blob([content], { type: extension === "kml" ? "application/vnd.google-earth.kml+xml;charset=utf-8" : "application/gpx+xml;charset=utf-8" }));
  const link = document.createElement("a");
  try {
    link.href = url;
    const name = options.truckName.replace(/[^a-zA-Z0-9_-]+/g, "_") || "Truck";
    link.download = `${name}_${options.dateStr.replace(/[^0-9-]/g, "")}_Route_Replay.${extension}`;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

export const exportReplayKml = (options: ExportGpsOptions) => exportGpsFile(options, "kml");
export const exportReplayGpx = (options: ExportGpsOptions) => exportGpsFile(options, "gpx");
