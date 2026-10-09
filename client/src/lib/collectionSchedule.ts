export type CollectionDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

// Fixed weekly waste assignments used by Route Manager and the public guide.
export const COLLECTION_WASTE_MAP: Record<
  CollectionDay,
  { type: "biodegradable" | "non-biodegradable"; label: string; local: string }
> = {
  Monday: { type: "biodegradable", label: "Biodegradable", local: "Nabubulok" },
  Tuesday: { type: "non-biodegradable", label: "Non-Biodegradable", local: "Di-Nabubulok" },
  Wednesday: { type: "biodegradable", label: "Biodegradable", local: "Nabubulok" },
  Thursday: { type: "non-biodegradable", label: "Non-Biodegradable", local: "Di-Nabubulok" },
  Friday: { type: "biodegradable", label: "Biodegradable", local: "Nabubulok" },
  Saturday: { type: "non-biodegradable", label: "Non-Biodegradable", local: "Di-Nabubulok" },
  Sunday: { type: "biodegradable", label: "Biodegradable", local: "Nabubulok" },
};
