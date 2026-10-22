export type ResidentSetupLocation = {
  method: "CURRENT_LOCATION";
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
} | {
  method: "MANUAL_PIN";
  latitude: number;
  longitude: number;
} | {
  method: "STREET_POINT";
  latitude: number;
  longitude: number;
  pointIndex: number;
};
