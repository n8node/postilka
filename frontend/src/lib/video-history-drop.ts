import { ApiError } from "@/lib/api";
import { probeMediaDuration } from "@/lib/file-media";
import { mediaUrl } from "@/lib/media-display";
import {
  uploadVideoGenerationMedia,
} from "@/lib/video-generation-api";
import type {
  VideoGenerationHistoryItem,
  VideoGenerationUpload,
} from "@/lib/video-generation-data";
import {
  isReferenceVideoDurationValid,
  REFERENCE_VIDEO_MAX_BYTES,
  REFERENCE_VIDEO_MAX_SECONDS,
  REFERENCE_VIDEO_MIN_SECONDS,
} from "@/lib/video-generation-data";

export const VIDEO_HISTORY_DRAG_MIME =
  "application/x-postilka-video-generation";

let activeVideoHistoryDragItem: VideoGenerationHistoryItem | null = null;

export function setActiveVideoHistoryDragItem(
  item: VideoGenerationHistoryItem | null,
): void {
  activeVideoHistoryDragItem = item;
}

export function getActiveVideoHistoryDragItem(): VideoGenerationHistoryItem | null {
  return activeVideoHistoryDragItem;
}

const videoSizeCache = new Map<string, number | null>();

export function serializeVideoHistoryDragItem(
  item: VideoGenerationHistoryItem,
): string {
  return JSON.stringify(item);
}

export function parseVideoHistoryDragItem(
  raw: string,
): VideoGenerationHistoryItem | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as VideoGenerationHistoryItem;
    if (!parsed?.id || !parsed?.videoUrl) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function prefetchVideoHistorySize(
  item: VideoGenerationHistoryItem,
): Promise<void> {
  if (videoSizeCache.has(item.id)) return;
  try {
    const size = await fetchVideoContentLength(item.id);
    videoSizeCache.set(item.id, size);
  } catch {
    videoSizeCache.set(item.id, null);
  }
}

export function getCachedVideoHistorySize(
  id: string,
): number | null | undefined {
  return videoSizeCache.get(id);
}

export type ReferenceVideoDropValidation = {
  valid: boolean;
  durationInvalid: boolean;
  sizeInvalid: boolean;
  message: string | null;
};

export function referenceVideoDurationError(
  seconds: number | undefined,
): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return "Не удалось определить длительность";
  }
  if (!isReferenceVideoDurationValid(seconds)) {
    return `Длительность ${seconds.toFixed(1)} сек — нужно ${REFERENCE_VIDEO_MIN_SECONDS}–${REFERENCE_VIDEO_MAX_SECONDS} сек`;
  }
  return null;
}

export function referenceVideoSizeError(sizeBytes: number | null | undefined): string | null {
  if (sizeBytes == null || !Number.isFinite(sizeBytes)) return null;
  if (sizeBytes > REFERENCE_VIDEO_MAX_BYTES) {
    const mb = (sizeBytes / (1024 * 1024)).toFixed(1);
    return `Размер ${mb} МБ — максимум 50 МБ`;
  }
  return null;
}

export function validateReferenceVideoHistoryDrop(
  item: VideoGenerationHistoryItem,
  sizeBytes?: number | null,
): ReferenceVideoDropValidation {
  const durationInvalid = Boolean(
    referenceVideoDurationError(item.videoDurationSeconds),
  );
  const sizeInvalid = Boolean(referenceVideoSizeError(sizeBytes));

  if (!durationInvalid && !sizeInvalid) {
    return {
      valid: true,
      durationInvalid: false,
      sizeInvalid: false,
      message: null,
    };
  }

  const parts: string[] = [];
  const durationMsg = referenceVideoDurationError(item.videoDurationSeconds);
  if (durationMsg) parts.push(durationMsg);
  const sizeMsg = referenceVideoSizeError(sizeBytes);
  if (sizeMsg) parts.push(sizeMsg);

  return {
    valid: false,
    durationInvalid,
    sizeInvalid,
    message: parts.join(" · "),
  };
}

export async function fetchVideoContentLength(
  generationId: string,
): Promise<number | null> {
  const res = await fetch(
    mediaUrl(`/media/ai-generations/${encodeURIComponent(generationId)}`),
    { method: "HEAD", credentials: "include" },
  );
  if (!res.ok) return null;
  const header = res.headers.get("content-length");
  if (!header) return null;
  const n = Number(header);
  return Number.isFinite(n) ? n : null;
}

export async function fetchVideoGenerationBlob(
  generationId: string,
): Promise<Blob> {
  const res = await fetch(
    mediaUrl(`/media/ai-generations/${encodeURIComponent(generationId)}`),
    { credentials: "include" },
  );
  if (!res.ok) {
    throw new ApiError(res.status, "Не удалось загрузить видео из истории");
  }
  return res.blob();
}

export async function historyVideoItemToUpload(
  item: VideoGenerationHistoryItem,
): Promise<VideoGenerationUpload> {
  const blob = await fetchVideoGenerationBlob(item.id);
  const sizeError = referenceVideoSizeError(blob.size);
  if (sizeError) {
    throw new Error(sizeError);
  }

  const previewUrl = URL.createObjectURL(blob);
  const type = blob.type || "video/mp4";
  const ext = type.includes("quicktime") ? "mov" : "mp4";
  const file = new File([blob], `video-${item.id}.${ext}`, { type });

  const duration = await probeMediaDuration(file, type);
  const durationError = referenceVideoDurationError(duration);
  if (durationError) {
    URL.revokeObjectURL(previewUrl);
    throw new Error(durationError);
  }

  const upload = await uploadVideoGenerationMedia(file);
  return {
    uploadId: upload.id,
    previewUrl,
    mediaKind: "video",
    fileName: file.name,
    mimeType: upload.content_type || type,
    durationSeconds: duration ?? item.videoDurationSeconds,
  };
}

export function videoHistoryDropErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Не удалось использовать видео из истории";
}
