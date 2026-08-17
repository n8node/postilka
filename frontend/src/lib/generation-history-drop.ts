import { ApiError } from "@/lib/api";
import type {
  GenerationHistoryItem,
  GenerationUpload,
} from "@/lib/generation-data";
import { formatGenerationTime } from "@/lib/generation-data";
import {
  fetchGenerationImageBlob,
  uploadGenerationMedia,
} from "@/lib/generation-api";

export const GENERATION_HISTORY_DRAG_MIME =
  "application/x-postilka-generation";

export function serializeHistoryDragItem(item: GenerationHistoryItem): string {
  return JSON.stringify(item);
}

export function parseHistoryDragItem(raw: string): GenerationHistoryItem | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GenerationHistoryItem;
    if (!parsed?.id || !parsed?.imageUrl) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isUploadHistoryId(id: string): boolean {
  return id.startsWith("upload:");
}

export function uploadHistoryItem(
  upload: GenerationUpload,
  prompt: string,
  modeLabel: string,
): GenerationHistoryItem {
  return {
    id: `upload:${upload.uploadId}`,
    prompt: prompt.trim().slice(0, 120) || "Исходное фото",
    mode: modeLabel,
    createdAt: formatGenerationTime(new Date().toISOString()),
    imageUrl: upload.previewUrl,
    usedInPost: false,
  };
}

export function historyItemFromGenerationId(
  generationId: string,
): GenerationHistoryItem {
  return {
    id: generationId,
    prompt: "",
    mode: "",
    createdAt: "",
    imageUrl: "",
    usedInPost: false,
  };
}

export async function historyItemToUpload(
  item: GenerationHistoryItem,
): Promise<GenerationUpload> {
  if (isUploadHistoryId(item.id)) {
    const uploadId = item.id.slice("upload:".length);
    return { uploadId, previewUrl: item.imageUrl };
  }

  const blob = await fetchGenerationImageBlob(item.id);
  const previewUrl = URL.createObjectURL(blob);
  const type = blob.type || "image/jpeg";
  const ext =
    type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  const file = new File([blob], `generation-${item.id}.${ext}`, { type });
  const res = await uploadGenerationMedia(file);
  return {
    uploadId: res.id,
    previewUrl,
  };
}

export function historyDropErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Не удалось использовать фото из истории";
}
