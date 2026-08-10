import type { KieVideoExample } from "@/lib/api";
import { KIE_VIDEO_ASPECT_RATIOS } from "@/lib/api";
import { Film, ImageIcon, Layers } from "lucide-react";

export type VideoGenerationModeId =
  | "text-to-video"
  | "image-to-video"
  | "reference-to-video";

export type VideoAspectRatioId = (typeof KIE_VIDEO_ASPECT_RATIOS)[number];

export type VideoMediaKind = "image" | "video" | "audio";

export type VideoGenerationUpload = {
  uploadId: string;
  previewUrl: string;
  mediaKind: VideoMediaKind;
  fileName?: string;
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
export const REFERENCE_VIDEO_MAX = 3;
export const REFERENCE_AUDIO_MAX = 3;

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
  created_at: string;
  used_in_post?: boolean;
}): VideoGenerationHistoryItem {
  return {
    id: item.id,
    mode: item.mode,
    prompt: item.prompt,
    aspectRatio: item.aspect_ratio,
    videoDurationSeconds: item.video_duration_seconds,
    videoUrl: item.video_url || item.image_url || "",
    thumbUrl: item.thumb_url,
    createdAt: item.created_at,
    usedInPost: item.used_in_post,
  };
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
