import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as roadmapRepo from "../storage/roadmapRepository";
import { getRoadmapProgress, groupRoadmapItems } from "../utils/roadmapProgress";
import type {
  Roadmap,
  RoadmapInput,
  RoadmapItem,
  RoadmapItemInput,
  RoadmapProgress,
  RoadmapSection,
  RoadmapSectionGroup,
  RoadmapSectionInput,
} from "../types";

export type RoadmapStatus = "loading" | "ready" | "error";

function reportRoadmapError(error: unknown): void {
  console.error("Roadmap operation failed", error);
}

interface ReloadOptions {
  selectedRoadmapId?: string | null;
  showLoading?: boolean;
}

export interface RoadmapChecklistStore {
  status: RoadmapStatus;
  roadmaps: Roadmap[];
  selectedRoadmap: Roadmap | null;
  selectedRoadmapId: string | null;
  roadmapSections: RoadmapSection[];
  items: RoadmapItem[];
  sections: RoadmapSectionGroup[];
  progress: RoadmapProgress;
  reload: (options?: ReloadOptions) => Promise<void>;
  selectRoadmap: (id: string) => Promise<void>;
  createRoadmap: (input: RoadmapInput) => Promise<void>;
  updateRoadmap: (id: string, input: RoadmapInput) => Promise<void>;
  deleteRoadmap: (id: string) => Promise<void>;
  createSection: (input: RoadmapSectionInput) => Promise<void>;
  updateSection: (id: string, input: RoadmapSectionInput) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;
  createItem: (input: RoadmapItemInput) => Promise<void>;
  updateItem: (id: string, input: RoadmapItemInput) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleCompleted: (id: string) => Promise<void>;
}

export function useRoadmapChecklist(): RoadmapChecklistStore {
  const [status, setStatus] = useState<RoadmapStatus>("loading");
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(
    null,
  );
  const [roadmapSections, setRoadmapSections] = useState<RoadmapSection[]>([]);
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const selectedRoadmapIdRef = useRef<string | null>(null);

  const loadDetails = useCallback(async (roadmapId: string | null) => {
    if (roadmapId === null) {
      setRoadmapSections([]);
      setItems([]);
      return;
    }

    const [storedSections, storedItems] = await Promise.all([
      roadmapRepo.listRoadmapSections(roadmapId),
      roadmapRepo.listRoadmapItems(roadmapId),
    ]);
    setRoadmapSections(storedSections);
    setItems(storedItems);
  }, []);

  const reload = useCallback(
    async (options: ReloadOptions = {}) => {
      try {
        const { selectedRoadmapId: preferredId, showLoading = true } = options;
        if (showLoading) setStatus("loading");

        await roadmapRepo.seedDefaultRoadmapIfNeeded();
        const storedRoadmaps = await roadmapRepo.listRoadmaps();
        const currentId = preferredId ?? selectedRoadmapIdRef.current;
        const nextSelectedId =
          storedRoadmaps.find((roadmap) => roadmap.id === currentId)?.id ??
          storedRoadmaps[0]?.id ??
          null;

        selectedRoadmapIdRef.current = nextSelectedId;
        setRoadmaps(storedRoadmaps);
        setSelectedRoadmapId(nextSelectedId);
        await loadDetails(nextSelectedId);
        setStatus("ready");
      } catch (error) {
        reportRoadmapError(error);
        setStatus("error");
      }
    },
    [loadDetails],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const refreshCurrent = useCallback(async () => {
    await reload({
      selectedRoadmapId: selectedRoadmapIdRef.current,
      showLoading: false,
    });
  }, [reload]);

  const selectRoadmap = useCallback(
    async (id: string) => {
      try {
        selectedRoadmapIdRef.current = id;
        setSelectedRoadmapId(id);
        await loadDetails(id);
      } catch (error) {
        reportRoadmapError(error);
        setStatus("error");
      }
    },
    [loadDetails],
  );

  const createRoadmap = useCallback(
    async (input: RoadmapInput) => {
      try {
        const roadmap = await roadmapRepo.insertRoadmap(input);
        selectedRoadmapIdRef.current = roadmap.id;
        await reload({ selectedRoadmapId: roadmap.id, showLoading: false });
      } catch (error) {
        reportRoadmapError(error);
        setStatus("error");
      }
    },
    [reload],
  );

  const updateRoadmap = useCallback(
    async (id: string, input: RoadmapInput) => {
      try {
        await roadmapRepo.updateRoadmap(id, input);
        await refreshCurrent();
      } catch (error) {
        reportRoadmapError(error);
        setStatus("error");
      }
    },
    [refreshCurrent],
  );

  const deleteRoadmap = useCallback(
    async (id: string) => {
      try {
        await roadmapRepo.deleteRoadmap(id);
        if (selectedRoadmapIdRef.current === id) {
          selectedRoadmapIdRef.current = null;
        }
        await refreshCurrent();
      } catch (error) {
        reportRoadmapError(error);
        await refreshCurrent().catch(reportRoadmapError);
      }
    },
    [refreshCurrent],
  );

  const createSection = useCallback(
    async (input: RoadmapSectionInput) => {
      if (selectedRoadmapIdRef.current === null) return;

      try {
        await roadmapRepo.insertRoadmapSection(
          selectedRoadmapIdRef.current,
          input,
        );
        await refreshCurrent();
      } catch (error) {
        reportRoadmapError(error);
        setStatus("error");
      }
    },
    [refreshCurrent],
  );

  const updateSection = useCallback(
    async (id: string, input: RoadmapSectionInput) => {
      try {
        await roadmapRepo.updateRoadmapSection(id, input);
        await refreshCurrent();
      } catch (error) {
        reportRoadmapError(error);
        setStatus("error");
      }
    },
    [refreshCurrent],
  );

  const deleteSection = useCallback(
    async (id: string) => {
      try {
        await roadmapRepo.deleteRoadmapSection(id);
        await refreshCurrent();
      } catch (error) {
        reportRoadmapError(error);
        await refreshCurrent().catch(reportRoadmapError);
      }
    },
    [refreshCurrent],
  );

  const createItem = useCallback(
    async (input: RoadmapItemInput) => {
      try {
        await roadmapRepo.insertRoadmapItem(input);
        await refreshCurrent();
      } catch (error) {
        reportRoadmapError(error);
        setStatus("error");
      }
    },
    [refreshCurrent],
  );

  const updateItem = useCallback(
    async (id: string, input: RoadmapItemInput) => {
      try {
        await roadmapRepo.updateRoadmapItem(id, input);
        await refreshCurrent();
      } catch (error) {
        reportRoadmapError(error);
        setStatus("error");
      }
    },
    [refreshCurrent],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      try {
        await roadmapRepo.deleteRoadmapItem(id);
        await refreshCurrent();
      } catch (error) {
        reportRoadmapError(error);
        setStatus("error");
      }
    },
    [refreshCurrent],
  );

  const toggleCompleted = useCallback(
    async (id: string) => {
      const item = items.find((current) => current.id === id);
      if (!item) return;

      try {
        await roadmapRepo.setRoadmapItemCompleted(id, !item.completed);
        await refreshCurrent();
      } catch (error) {
        reportRoadmapError(error);
        setStatus("error");
      }
    },
    [items, refreshCurrent],
  );

  const sections = useMemo(
    () => groupRoadmapItems(roadmapSections, items),
    [roadmapSections, items],
  );
  const progress = useMemo(() => getRoadmapProgress(items), [items]);
  const selectedRoadmap = useMemo(
    () =>
      roadmaps.find((roadmap) => roadmap.id === selectedRoadmapId) ?? null,
    [roadmaps, selectedRoadmapId],
  );

  return {
    status,
    roadmaps,
    selectedRoadmap,
    selectedRoadmapId,
    roadmapSections,
    items,
    sections,
    progress,
    reload,
    selectRoadmap,
    createRoadmap,
    updateRoadmap,
    deleteRoadmap,
    createSection,
    updateSection,
    deleteSection,
    createItem,
    updateItem,
    deleteItem,
    toggleCompleted,
  };
}
