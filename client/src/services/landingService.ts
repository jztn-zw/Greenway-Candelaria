import api from "../lib/api";
import {
  DEFAULT_CONTENT,
  DEFAULT_SECTION_META,
  DEFAULT_SECTIONS,
  LandingSection,
  LandingSectionKey,
  LandingSectionMeta,
  SectionContent,
} from "@/pages/admin/components/landingmanager/types";

export interface LandingSectionRecord {
  id: string;
  section: LandingSectionKey;
  content: unknown;
  is_visible: boolean;
  updated_at: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
}

export interface LandingHistoryEntry {
  id: string;
  section: LandingSectionKey;
  snapshot: unknown;
  created_at: string;
  saved_by: string | null;
  saved_by_name: string | null;
}

export interface LandingContentSnapshot {
  sections: LandingSection[];
  content: SectionContent;
  sectionMeta: Record<LandingSectionKey, LandingSectionMeta>;
  lastSyncedAt: string | null;
}

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseJson = (value: unknown) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value ?? null;
};

const parseTimestamp = (value: string | null) => {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(value.replace(" ", "T") + "Z");
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const deepMerge = <T,>(defaults: T, incoming: unknown): T => {
  if (Array.isArray(defaults)) {
    return (Array.isArray(incoming) ? incoming : defaults) as T;
  }

  if (isObject(defaults)) {
    const source = isObject(incoming) ? incoming : {};
    const merged = Object.entries(defaults).reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[key] = deepMerge(value, source[key]);
      return acc;
    }, {});

    for (const [key, value] of Object.entries(source)) {
      if (!(key in merged)) {
        merged[key] = value;
      }
    }

    return merged as T;
  }

  return (incoming ?? defaults) as T;
};

const mergeSectionContent = <K extends LandingSectionKey>(
  content: SectionContent,
  sectionKey: K,
  incoming: unknown,
): SectionContent[K] => {
  const defaultSectionContent = content[sectionKey];
  return deepMerge(defaultSectionContent, incoming);
};

const updateSectionContent = <K extends LandingSectionKey>(
  content: SectionContent,
  sectionKey: K,
  nextValue: SectionContent[K],
): SectionContent => ({
  ...content,
  [sectionKey]: nextValue,
});

const buildSectionMeta = (
  section: LandingSectionKey,
  existing: Record<LandingSectionKey, LandingSectionMeta>,
  row: LandingSectionRecord,
): Record<LandingSectionKey, LandingSectionMeta> => ({
  ...existing,
  [section]: {
    updatedAt: row.updated_at,
    updatedByName: row.updated_by_name,
  },
});

export const buildLandingSnapshot = (
  rows: LandingSectionRecord[] = [],
): LandingContentSnapshot => {
  const sections = deepClone(DEFAULT_SECTIONS);
  let content: SectionContent = deepClone(DEFAULT_CONTENT);
  let sectionMeta: Record<LandingSectionKey, LandingSectionMeta> = deepClone(DEFAULT_SECTION_META);
  let lastSyncedAt: string | null = null;

  for (const row of rows) {
    const sectionKey = row.section;
    const parsedContent = parseJson(row.content);

    const targetSection = sections.find((section) => section.id === sectionKey);
    if (targetSection) {
      targetSection.visible = Boolean(row.is_visible);
    }

    const mergedSection = mergeSectionContent(content, sectionKey, parsedContent);
    content = updateSectionContent(content, sectionKey, mergedSection);
    sectionMeta = buildSectionMeta(sectionKey, sectionMeta, row);

    const rowUpdatedAt = parseTimestamp(row.updated_at);
    const currentLastSyncedAt = parseTimestamp(lastSyncedAt);

    if (rowUpdatedAt && (!currentLastSyncedAt || rowUpdatedAt.getTime() > currentLastSyncedAt.getTime())) {
      lastSyncedAt = row.updated_at;
    }
  }

  return { sections, content, sectionMeta, lastSyncedAt };
};

const unwrap = async <T,>(request: Promise<{ data: { data: T } }>) => {
  const response = await request;
  return response.data.data;
};

const landingService = {
  getAll: async (): Promise<LandingContentSnapshot> => {
    const rows = await unwrap<LandingSectionRecord[]>(api.get("/landing"));
    return buildLandingSnapshot(rows);
  },

  updateSection: async (section: LandingSectionKey, content: SectionContent[LandingSectionKey]) => {
    return unwrap<LandingSectionRecord>(api.put(`/landing/${section}`, { content }));
  },

  toggleVisibility: async (section: LandingSectionKey, isVisible: boolean) => {
    return unwrap<LandingSectionRecord>(api.patch(`/landing/${section}/visibility`, { is_visible: isVisible }));
  },

  getHistory: async (section: LandingSectionKey) => {
    return unwrap<LandingHistoryEntry[]>(api.get(`/landing/${section}/history`));
  },
};

export default landingService;
