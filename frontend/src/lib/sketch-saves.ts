import type { AspectRatioId } from "@/lib/generation-data";

export type SketchGenerationItem = {
  id: string;
  url: string;
  thumbUrl?: string;
  isVideo: boolean;
  createdAt: string;
};

export type SavedSketch = {
  id: string;
  workspaceId: string;
  createdAt: string;
  aspectRatio: AspectRatioId;
  dataUrl: string;
  generations: SketchGenerationItem[];
};

const STORAGE_PREFIX = "postilka-sketch-saves";
const MAX_SAVES = 20;
const MAX_GENERATIONS = 20;

function storageKey(workspaceId: string) {
  return `${STORAGE_PREFIX}:${workspaceId}`;
}

function normalizeGeneration(raw: unknown): SketchGenerationItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<SketchGenerationItem>;
  if (!item.id || !item.url) return null;
  return {
    id: item.id,
    url: item.url,
    thumbUrl: item.thumbUrl,
    isVideo: Boolean(item.isVideo),
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

function normalizeSketch(raw: unknown, workspaceId: string): SavedSketch | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<SavedSketch>;
  if (!item.id || !item.dataUrl) return null;
  const generations = Array.isArray(item.generations)
    ? item.generations.map(normalizeGeneration).filter((g): g is SketchGenerationItem => g != null)
    : [];
  return {
    id: item.id,
    workspaceId: item.workspaceId || workspaceId,
    createdAt: item.createdAt || new Date().toISOString(),
    aspectRatio: (item.aspectRatio || "1:1") as AspectRatioId,
    dataUrl: item.dataUrl,
    generations,
  };
}

export function listSketchSaves(workspaceId: string): SavedSketch[] {
  if (typeof window === "undefined" || !workspaceId) return [];
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeSketch(item, workspaceId))
      .filter((item): item is SavedSketch => item != null);
  } catch {
    return [];
  }
}

function writeSketchSaves(workspaceId: string, items: SavedSketch[]) {
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(items));
}

export function saveSketch(
  workspaceId: string,
  aspectRatio: AspectRatioId,
  dataUrl: string,
  existingId?: string | null,
): SavedSketch {
  const items = listSketchSaves(workspaceId);
  if (existingId) {
    const idx = items.findIndex((item) => item.id === existingId);
    if (idx >= 0) {
      const updated: SavedSketch = {
        ...items[idx],
        aspectRatio,
        dataUrl,
      };
      const next = [...items];
      next[idx] = updated;
      writeSketchSaves(workspaceId, next);
      return updated;
    }
  }
  const item: SavedSketch = {
    id: crypto.randomUUID(),
    workspaceId,
    createdAt: new Date().toISOString(),
    aspectRatio,
    dataUrl,
    generations: [],
  };
  const next = [item, ...items].slice(0, MAX_SAVES);
  writeSketchSaves(workspaceId, next);
  return item;
}

export function deleteSketchSave(workspaceId: string, id: string): void {
  const next = listSketchSaves(workspaceId).filter((item) => item.id !== id);
  writeSketchSaves(workspaceId, next);
}

export function addSketchGeneration(
  workspaceId: string,
  sketchId: string,
  generation: SketchGenerationItem,
): SavedSketch | null {
  const items = listSketchSaves(workspaceId);
  const idx = items.findIndex((item) => item.id === sketchId);
  if (idx < 0) return null;
  const nextGenerations = [
    generation,
    ...items[idx].generations.filter((item) => item.id !== generation.id),
  ].slice(0, MAX_GENERATIONS);
  const updated: SavedSketch = { ...items[idx], generations: nextGenerations };
  const next = [...items];
  next[idx] = updated;
  writeSketchSaves(workspaceId, next);
  return updated;
}

export function removeSketchGeneration(
  workspaceId: string,
  sketchId: string,
  generationId: string,
): SavedSketch | null {
  const items = listSketchSaves(workspaceId);
  const idx = items.findIndex((item) => item.id === sketchId);
  if (idx < 0) return null;
  const updated: SavedSketch = {
    ...items[idx],
    generations: items[idx].generations.filter((item) => item.id !== generationId),
  };
  const next = [...items];
  next[idx] = updated;
  writeSketchSaves(workspaceId, next);
  return updated;
}
