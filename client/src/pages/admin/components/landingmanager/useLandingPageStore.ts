import { useCallback, useEffect, useMemo, useState } from "react";
import landingService, { buildLandingSnapshot, LandingSectionRecord } from "@/services/landingService";
import {
  ChangeLogEntry,
  DEFAULT_CONTENT,
  DEFAULT_SECTIONS,
  LandingPageState,
  LandingSectionKey,
  SectionContent,
} from "./types";

const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const createEmptyState = (): LandingPageState => ({
  ...buildLandingSnapshot(),
  changeLog: [],
  lastSaved: null,
  isDirty: false,
});

const isSame = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const calculateDirty = (
  sections: LandingPageState["sections"],
  content: LandingPageState["content"],
  baseline: { sections: LandingPageState["sections"]; content: LandingPageState["content"] },
) => !isSame(sections, baseline.sections) || !isSame(content, baseline.content);

const mergeServerRowIntoContent = <K extends LandingSectionKey>(
  current: SectionContent,
  section: K,
  row: LandingSectionRecord,
) => ({
  ...current,
  [section]: buildLandingSnapshot([{ ...row, section }]).content[section],
});

export const useLandingPageStore = () => {
  const [state, setState] = useState<LandingPageState>(createEmptyState);
  const [baseline, setBaseline] = useState(() => ({
    sections: deepClone(DEFAULT_SECTIONS),
    content: deepClone(DEFAULT_CONTENT),
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [isReloading, setIsReloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSectionAction, setActiveSectionAction] = useState<LandingSectionKey | null>(null);

  const addLog = useCallback((section: string, action: string, description: string) => {
    const entry: ChangeLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user: "Admin",
      section,
      action,
      description,
    };

    setState((current) => ({
      ...current,
      changeLog: [entry, ...current.changeLog].slice(0, 50),
    }));
  }, []);

  const applySnapshot = useCallback((snapshot: ReturnType<typeof buildLandingSnapshot>) => {
    const nextBaseline = {
      sections: deepClone(snapshot.sections),
      content: deepClone(snapshot.content),
    };

    setBaseline(nextBaseline);
    setState((current) => ({
      ...current,
      sections: snapshot.sections,
      content: snapshot.content,
      sectionMeta: snapshot.sectionMeta,
      lastSyncedAt: snapshot.lastSyncedAt,
      lastSaved: snapshot.lastSyncedAt,
      isDirty: false,
    }));
  }, []);

  const load = useCallback(async (showReloadState = false) => {
    if (showReloadState) {
      setIsReloading(true);
    } else {
      setIsLoading(true);
    }

    try {
      const snapshot = await landingService.getAll();
      applySnapshot(snapshot);
    } finally {
      setIsLoading(false);
      setIsReloading(false);
    }
  }, [applySnapshot]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const updateContent = useCallback(
    <K extends keyof SectionContent>(sectionKey: K, updates: Partial<SectionContent[K]>) => {
      setState((current) => {
        const nextContent = {
          ...current.content,
          [sectionKey]: { ...current.content[sectionKey], ...updates },
        };

        return {
          ...current,
          content: nextContent,
          isDirty: calculateDirty(current.sections, nextContent, baseline),
        };
      });
    },
    [baseline],
  );

  const setContent = useCallback(
    <K extends keyof SectionContent>(sectionKey: K, newContent: SectionContent[K]) => {
      setState((current) => ({
        ...current,
        content: {
          ...current.content,
          [sectionKey]: newContent,
        },
        isDirty: calculateDirty(current.sections, {
          ...current.content,
          [sectionKey]: newContent,
        }, baseline),
      }));
    },
    [baseline],
  );

  const toggleSection = useCallback(async (sectionId: LandingSectionKey) => {
    const currentSection = state.sections.find((section) => section.id === sectionId);
    if (!currentSection || currentSection.locked) return;

    const nextVisible = !currentSection.visible;

    setActiveSectionAction(sectionId);
    setState((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId ? { ...section, visible: nextVisible } : section,
      ),
    }));

    try {
      const row = await landingService.toggleVisibility(sectionId, nextVisible);
      const snapshot = buildLandingSnapshot([row]);

      setBaseline((currentBaseline) => {
        const nextSections = currentBaseline.sections.map((section) =>
          section.id === sectionId ? { ...section, visible: nextVisible } : section,
        );
        return { ...currentBaseline, sections: nextSections };
      });

      setState((current) => {
        const nextSections = current.sections.map((section) =>
          section.id === sectionId ? { ...section, visible: nextVisible } : section,
        );

        return {
          ...current,
          sections: nextSections,
          sectionMeta: {
            ...current.sectionMeta,
            [sectionId]: snapshot.sectionMeta[sectionId],
          },
          lastSaved: row.updated_at,
          lastSyncedAt: row.updated_at,
          isDirty: calculateDirty(nextSections, current.content, {
            sections: baseline.sections.map((section) =>
              section.id === sectionId ? { ...section, visible: nextVisible } : section,
            ),
            content: baseline.content,
          }),
        };
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId ? { ...section, visible: currentSection.visible } : section,
        ),
      }));
      throw error;
    } finally {
      setActiveSectionAction(null);
    }
  }, [baseline, state.sections]);

  const discardChanges = useCallback((sectionId?: LandingSectionKey | null) => {
    setState((current) => {
      if (!sectionId) {
        return {
          ...current,
          sections: deepClone(baseline.sections),
          content: deepClone(baseline.content),
          isDirty: false,
        };
      }

      const nextContent = {
        ...current.content,
        [sectionId]: deepClone(baseline.content[sectionId]),
      };

      return {
        ...current,
        content: nextContent,
        isDirty: calculateDirty(current.sections, nextContent, baseline),
      };
    });
  }, [baseline]);

  const saveSection = useCallback(async (sectionId: LandingSectionKey) => {
    setIsSaving(true);
    setActiveSectionAction(sectionId);

    try {
      const row = await landingService.updateSection(sectionId, state.content[sectionId]);
      const normalizedContent = mergeServerRowIntoContent(state.content, sectionId, row);
      const normalizedMeta = buildLandingSnapshot([row]).sectionMeta[sectionId];
      const nextBaseline = {
        sections: deepClone(baseline.sections),
        content: {
          ...baseline.content,
          [sectionId]: deepClone(normalizedContent[sectionId]),
        },
      };

      setBaseline(nextBaseline);
      setState((current) => ({
        ...current,
        content: normalizedContent,
        sectionMeta: {
          ...current.sectionMeta,
          [sectionId]: normalizedMeta,
        },
        lastSaved: row.updated_at,
        lastSyncedAt: row.updated_at,
        isDirty: calculateDirty(current.sections, normalizedContent, nextBaseline),
      }));
    } finally {
      setIsSaving(false);
      setActiveSectionAction(null);
    }
  }, [baseline, state.content]);

  const dirtySections = useMemo(
    () =>
      (Object.keys(state.content) as LandingSectionKey[]).filter(
        (sectionId) => !isSame(state.content[sectionId], baseline.content[sectionId]),
      ),
    [baseline.content, state.content],
  );

  const saveAll = useCallback(async () => {
    if (dirtySections.length === 0) return;

    setIsSaving(true);

    try {
      let nextBaseline = {
        sections: deepClone(baseline.sections),
        content: deepClone(baseline.content),
      };
      let nextContent = deepClone(state.content);
      let nextMeta = deepClone(state.sectionMeta);
      let latestSaved: string | null = state.lastSaved;

      for (const sectionId of dirtySections) {
        setActiveSectionAction(sectionId);
        const row = await landingService.updateSection(sectionId, nextContent[sectionId]);
        nextContent = mergeServerRowIntoContent(nextContent, sectionId, row);
        nextMeta[sectionId] = buildLandingSnapshot([row]).sectionMeta[sectionId];
        nextBaseline = {
          ...nextBaseline,
          content: {
            ...nextBaseline.content,
            [sectionId]: deepClone(nextContent[sectionId]),
          },
        };
        latestSaved = row.updated_at;
      }

      setBaseline(nextBaseline);
      setState((current) => ({
        ...current,
        content: nextContent,
        sectionMeta: nextMeta,
        lastSaved: latestSaved,
        lastSyncedAt: latestSaved,
        isDirty: calculateDirty(current.sections, nextContent, nextBaseline),
      }));
    } finally {
      setIsSaving(false);
      setActiveSectionAction(null);
    }
  }, [baseline, dirtySections, state.content, state.lastSaved, state.sectionMeta]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (state.isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.isDirty]);

  return {
    state,
    isLoading,
    isReloading,
    isSaving,
    activeSectionAction,
    dirtySections,
    load,
    updateContent,
    setContent,
    toggleSection,
    discardChanges,
    saveSection,
    saveAll,
    addLog,
  };
};
