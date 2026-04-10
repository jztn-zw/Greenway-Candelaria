import type { RouteStop, RouteInfo } from "../types";

export const mockRouteInfo: RouteInfo = {
  routeId: "route-mock-1",
  truckId: "truck-mock-1",
  routeName: "Route B-7 · Barangay Loop South",
  wasteType: "Biodegradable",
  totalStops: 12,
  startedAt: new Date(Date.now() - 83 * 60 * 1000),
};

export const mockRouteStops: RouteStop[] = [
  { id: "s1", stopNumber: 1, barangay: "Brgy. Malabanban Norte", status: "done", completedAt: "6:12 AM", coords: [14.0480, 121.4180], distanceKm: 0 },
  { id: "s2", stopNumber: 2, barangay: "Brgy. Malabanban Sur", status: "done", completedAt: "6:28 AM", coords: [14.0465, 121.4200], distanceKm: 0 },
  { id: "s3", stopNumber: 3, barangay: "Brgy. Mangilag Norte", status: "done", completedAt: "6:45 AM", coords: [14.0445, 121.4225], distanceKm: 0 },
  { id: "s4", stopNumber: 4, barangay: "Brgy. Mangilag Sur", status: "done", completedAt: "7:02 AM", coords: [14.0430, 121.4240], distanceKm: 0 },
  { id: "s5", stopNumber: 5, barangay: "Brgy. Masin Norte", status: "done", completedAt: "7:18 AM", coords: [14.0415, 121.4260], distanceKm: 0 },
  { id: "s6", stopNumber: 6, barangay: "Brgy. Masin Sur", status: "skipped", skippedReason: "Inaccessible Road", coords: [14.0400, 121.4275], distanceKm: 0 },
  { id: "s7", stopNumber: 7, barangay: "Brgy. Pahinga Norte", status: "in-progress", coords: [14.0385, 121.4290], distanceKm: 0.3 },
  { id: "s8", stopNumber: 8, barangay: "Brgy. Pahinga Sur", status: "not-yet", coords: [14.0370, 121.4310], distanceKm: 1.8 },
  { id: "s9", stopNumber: 9, barangay: "Brgy. Mahal Na Pangalan", status: "not-yet", coords: [14.0355, 121.4330], distanceKm: 3.2 },
  { id: "s10", stopNumber: 10, barangay: "Brgy. San Andres", status: "not-yet", coords: [14.0340, 121.4350], distanceKm: 4.5 },
  { id: "s11", stopNumber: 11, barangay: "Brgy. Kinatihan I", status: "not-yet", coords: [14.0325, 121.4370], distanceKm: 5.8 },
  { id: "s12", stopNumber: 12, barangay: "Brgy. Kinatihan II", status: "not-yet", coords: [14.0310, 121.4390], distanceKm: 7.1 },
];

export const mockTruckCoords: [number, number] = [14.0388, 121.4285];
