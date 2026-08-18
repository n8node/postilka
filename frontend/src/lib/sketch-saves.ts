import type { AspectRatioId } from "@/lib/generation-data";

export type SavedSketch = {
  id: string;
  workspaceId: string;
  createdAt: string;
  aspectRatio: AspectRatioId;
  dataUrl: string;
};

const STORAGE_PREFIX = "postilka-sketch-saves";
const MAX_SAVES = 20;

function storageKey(workspaceId: string) {
  return `${STORAGE_PREFIX}:${workspaceId}`;
}

export function listSketchSaves(workspaceId: string): SavedSketch[] {
  if (typeof window === "undefined" || !workspaceId) return [];
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedSketch[];
    return Array.isArray(parsed) ? parsed : [];
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
): SavedSketch {
  const item: SavedSketch = {
    id: crypto.randomUUID(),
    workspaceId,
    createdAt: new Date().toISOString(),
    aspectRatio,
    dataUrl,
  };
  const next = [item, ...listSketchSaves(workspaceId)].slice(0, MAX_SAVES);
  writeSketchSaves(workspaceId, next);
  return item;
}

export function deleteSketchSave(workspaceId: string, id: string): void {
  const next = listSketchSaves(workspaceId).filter((item) => item.id !== id);
  writeSketchSaves(workspaceId, next);
}
