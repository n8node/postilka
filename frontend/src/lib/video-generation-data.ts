import type { KieVideoExample } from "@/lib/api";
import { KIE_VIDEO_ASPECT_RATIOS } from "@/lib/api";
import { Film, ImageIcon, Layers } from "lucide-react";

export type VideoGenerationModeId =
  | "text-to-video"
  | "image-to-video"
  | "reference-to-video";

export type VideoAspectRatioId = (typeof KIE_VIDEO_ASPECT_RATIOS)[number];

export type VideoAspectRatioOption = {
  id: VideoAspectRatioId;
  label: string;
  iconW: number;
  iconH: number;
};

function ratioIconSize(ratio: string, max = 28): { iconW: number; iconH: number } {
  const parts = ratio.split(":");
  if (parts.length !== 2) return { iconW: max, iconH: max };
  const w = Number(parts[0]);
  const h = Number(parts[1]);
  if (!w || !h) return { iconW: max, iconH: max };
  if (w >= h) {
    return { iconW: max, iconH: Math.max(12, Math.round((max * h) / w)) };
  }
  return { iconW: Math.max(12, Math.round((max * w) / h)), iconH: max };
}

export const videoAspectRatios: VideoAspectRatioOption[] =
  KIE_VIDEO_ASPECT_RATIOS.map((ratio) => {
    const { iconW, iconH } = ratioIconSize(ratio);
    return { id: ratio, label: ratio, iconW, iconH };
  });

export type VideoMediaKind = "image" | "video" | "audio";

export type VideoGenerationUpload = {
  uploadId: string;
  previewUrl: string;
  mediaKind: VideoMediaKind;
  fileName?: string;
  workspaceFileId?: string;
  mimeType?: string;
  /** Probed duration for reference videos (seconds). */
  durationSeconds?: number;
};

export type VideoGenerationHistoryItem = {
  id: string;
  mode: string;
  prompt: string;
  aspectRatio?: string;
  videoDurationSeconds?: number;
  videoUrl: string;
  thumbUrl?: string;
  createdAt: string;
  usedInPost?: boolean;
};

export const VIDEO_DURATION_MIN = 4;
export const VIDEO_DURATION_MAX = 15;

export const REFERENCE_IMAGE_MAX = 9;
export const REFERENCE_VIDEO_MIN_SECONDS = 2;
export const REFERENCE_VIDEO_MAX_SECONDS = 15;
/** MP4/ffprobe often reports slightly over nominal length (e.g. 15.04s for a 15s clip). */
export const REFERENCE_VIDEO_DURATION_TOLERANCE = 0.5;
export const REFERENCE_VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export function referenceVideoMaxAllowedSeconds(): number {
  return REFERENCE_VIDEO_MAX_SECONDS + REFERENCE_VIDEO_DURATION_TOLERANCE;
}

export function isReferenceVideoDurationValid(
  seconds: number | undefined | null,
): boolean {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return false;
  }
  return (
    seconds >= REFERENCE_VIDEO_MIN_SECONDS &&
    seconds <= referenceVideoMaxAllowedSeconds()
  );
}
export const REFERENCE_AUDIO_MAX = 3;
export const REFERENCE_VIDEO_MAX = 3;
export const KIE_VIDEO_FREE_REFERENCE_IMAGES = 5;

export function emptyReferenceImageSlots(): (VideoGenerationUpload | null)[] {
  return Array.from({ length: REFERENCE_IMAGE_MAX }, () => null);
}

export function emptyReferenceVideoSlots(): (VideoGenerationUpload | null)[] {
  return Array.from({ length: REFERENCE_VIDEO_MAX }, () => null);
}

export function filledReferenceCount(
  slots: (VideoGenerationUpload | null)[],
): number {
  return slots.filter(Boolean).length;
}

export const videoGenerationModes: {
  id: VideoGenerationModeId;
  label: string;
  desc: string;
}[] = [
  {
    id: "text-to-video",
    label: "Текст → видео",
    desc: "Сцена и движение по описанию",
  },
  {
    id: "image-to-video",
    label: "Фото → видео",
    desc: "Анимация между первым и последним кадром",
  },
  {
    id: "reference-to-video",
    label: "Референс → видео",
    desc: "Стиль и объекты по референсам",
  },
];

export const videoModeIcons = {
  "text-to-video": Film,
  "image-to-video": ImageIcon,
  "reference-to-video": Layers,
} as const;

export const videoModeLabels: Record<VideoGenerationModeId, string> = {
  "text-to-video": "Текст → видео",
  "image-to-video": "Фото → видео",
  "reference-to-video": "Референс → видео",
};

export const videoPromptPlaceholders: Record<VideoGenerationModeId, string> = {
  "text-to-video":
    "Опишите сцену, движение камеры, атмосферу и стиль видео…",
  "image-to-video":
    "Опишите, как должно двигаться изображение: камера, объекты, эффекты…",
  "reference-to-video":
    "Опишите сцену с учётом загруженных референсов…",
};

export const defaultVideoPrompt =
  "Кинематографичная сцена, плавное движение камеры, мягкий свет";

export function toVideoHistoryItem(item: {
  id: string;
  mode: string;
  prompt: string;
  aspect_ratio?: string;
  video_duration_seconds?: number;
  video_url?: string;
  image_url?: string;
  thumb_url?: string;
  media_type?: string;
  created_at: string;
  used_in_post?: boolean;
}): VideoGenerationHistoryItem {
  const isVideo =
    item.media_type === "video" ||
    Boolean(item.video_url) ||
    item.mode.includes("video");
  return {
    id: item.id,
    mode: item.mode,
    prompt: item.prompt,
    aspectRatio: item.aspect_ratio,
    videoDurationSeconds: item.video_duration_seconds,
    videoUrl: item.video_url || item.image_url || "",
    thumbUrl:
      item.thumb_url ||
      (isVideo ? videoGenerationPreviewPath(item.id) : undefined),
    createdAt: item.created_at,
    usedInPost: item.used_in_post,
  };
}

export function videoGenerationPreviewPath(id: string): string {
  return `/api/v1/media/ai-generations/${encodeURIComponent(id)}/preview`;
}

export function videoHistoryThumbSrc(item: VideoGenerationHistoryItem): string {
  if (item.thumbUrl) return item.thumbUrl;
  return videoGenerationPreviewPath(item.id);
}

export function exampleToPreset(example: KieVideoExample): {
  mode: VideoGenerationModeId;
  prompt: string;
  aspectRatio: VideoAspectRatioId;
  duration: number;
} {
  const mode = (example.mode || "text-to-video") as VideoGenerationModeId;
  return {
    mode,
    prompt: example.prompt,
    aspectRatio: (example.aspect_ratio || "16:9") as VideoAspectRatioId,
    duration: example.duration || 5,
  };
}

export function aspectBoxSize(ratio: string, max = 56): { w: number; h: number } {
  const parts = ratio.split(":");
  if (parts.length !== 2) return { w: max, h: max };
  const w = Number(parts[0]);
  const h = Number(parts[1]);
  if (!w || !h) return { w: max, h: max };
  if (w >= h) {
    return { w: max, h: Math.round((max * h) / w) };
  }
  return { w: Math.round((max * w) / h), h: max };
}
