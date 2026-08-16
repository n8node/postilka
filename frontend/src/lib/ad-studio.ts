import { ApiError, apiFetch } from "@/lib/api";
import { postGenerationMultipart } from "@/lib/generation-upload";
import type { GenerationJob } from "@/lib/generation-api";
import type { VideoGenerationJob } from "@/lib/video-generation-api";
import {
  REFERENCE_VIDEO_MAX_BYTES,
  isReferenceVideoDurationValid,
  referenceVideoMaxAllowedSeconds,
} from "@/lib/video-generation-data";

export const AD_STUDIO_CATEGORIES = [
  { id: "product_shot", label: "Съёмка товара" },
  { id: "motion", label: "Движение" },
  { id: "ugc", label: "UGC" },
  { id: "ads", label: "Реклама" },
  { id: "posters", label: "Постеры" },
  { id: "marketplace", label: "Маркетплейс" },
] as const;

export type AdStudioCategoryId = (typeof AD_STUDIO_CATEGORIES)[number]["id"];
export type AdStudioMediaKind = "image" | "video";
export type AdStudioGenerationMode =
  | "text-to-image"
  | "image-to-image"
  | "combine"
  | "text-to-video"
  | "image-to-video"
  | "reference-to-video";

export const AD_STUDIO_GENERATION_MODES: {
  id: AdStudioGenerationMode;
  label: string;
  desc: string;
  mediaKind: AdStudioMediaKind;
}[] = [
  {
    id: "text-to-image",
    label: "Текст → фото",
    desc: "Только описание. Превью шаблона не уходит в модель.",
    mediaKind: "image",
  },
  {
    id: "image-to-image",
    label: "Фото → фото",
    desc: "На входе фото товара. Стиль берётся из промпта шаблона.",
    mediaKind: "image",
  },
  {
    id: "combine",
    label: "Комбинация фото",
    desc: "Превью шаблона + фото товара. Товар встаёт в сцену шаблона.",
    mediaKind: "image",
  },
  {
    id: "text-to-video",
    label: "Текст → видео",
    desc: "Только описание. Превью шаблона не уходит в модель.",
    mediaKind: "video",
  },
  {
    id: "image-to-video",
    label: "Фото → видео",
    desc: "На входе фото товара. Из него собирается ролик.",
    mediaKind: "video",
  },
  {
    id: "reference-to-video",
    label: "Референс → видео",
    desc: "Превью шаблона + фото товара как референсы сцены.",
    mediaKind: "video",
  },
];

export type AdStudioTemplate = {
  id: string;
  title: string;
  description: string;
  category: AdStudioCategoryId;
  media_kind: AdStudioMediaKind;
  generation_mode: AdStudioGenerationMode;
  aspect_ratio: string;
  duration: number;
  requires_product: boolean;
  requires_avatar: boolean;
  preview_kind?: AdStudioMediaKind;
  preview_url?: string;
  preview_source_url?: string;
  sort_order: number;
};

export type AdStudioTemplateAdmin = AdStudioTemplate & {
  system_prompt: string;
  is_published: boolean;
  has_preview: boolean;
  created_at: string;
  updated_at: string;
};

export type AdStudioWritePayload = {
  title: string;
  description: string;
  category: AdStudioCategoryId;
  media_kind: AdStudioMediaKind;
  generation_mode: AdStudioGenerationMode;
  aspect_ratio: string;
  duration: number;
  system_prompt: string;
  requires_product: boolean;
  requires_avatar: boolean;
  sort_order: number;
  is_published: boolean;
};

export function adStudioCategoryLabel(id: string): string {
  return AD_STUDIO_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function defaultAdStudioKind(category: AdStudioCategoryId): AdStudioMediaKind {
  return adStudioMediaKindForMode(defaultAdStudioMode(category));
}

export function defaultAdStudioMode(category: AdStudioCategoryId): AdStudioGenerationMode {
  return category === "motion" || category === "ugc" ? "reference-to-video" : "combine";
}

export function adStudioMediaKindForMode(mode: AdStudioGenerationMode): AdStudioMediaKind {
  return AD_STUDIO_GENERATION_MODES.find((item) => item.id === mode)?.mediaKind ?? "image";
}

export function adStudioModeLabel(mode: string): string {
  return AD_STUDIO_GENERATION_MODES.find((item) => item.id === mode)?.label ?? mode;
}

export function adStudioModeNeedsProduct(mode: AdStudioGenerationMode): boolean {
  return (
    mode === "image-to-image" ||
    mode === "combine" ||
    mode === "image-to-video" ||
    mode === "reference-to-video"
  );
}

export function adStudioModeUsesTemplateInput(mode: AdStudioGenerationMode): boolean {
  return mode === "combine" || mode === "reference-to-video";
}

export function resolveAdStudioMode(item: {
  generation_mode?: string;
  media_kind?: string;
}): AdStudioGenerationMode {
  const mode = AD_STUDIO_GENERATION_MODES.find((m) => m.id === item.generation_mode)?.id;
  if (mode) return mode;
  return item.media_kind === "video" ? "reference-to-video" : "combine";
}

export function defaultAdStudioRatio(
  category: AdStudioCategoryId,
  kind: AdStudioMediaKind,
): string {
  if (kind === "video") return "9:16";
  if (category === "posters" || category === "product_shot") return "4:5";
  return "1:1";
}

export function visibleAdStudioCategories(hidden: string[] | undefined) {
  const blocked = new Set(hidden ?? []);
  return AD_STUDIO_CATEGORIES.filter((item) => !blocked.has(item.id));
}

export function fetchAdStudioTemplates(category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch<{ items: AdStudioTemplate[]; hidden_categories?: string[] }>(
    `/ad-studio/templates${qs}`,
  );
}

export function fetchAdminAdStudioCategories() {
  return apiFetch<{ hidden_categories: string[]; shuffle_templates?: boolean }>(
    "/admin/ad-studio/categories",
  );
}

export function updateAdminAdStudioCategories(hidden: string[], shuffleTemplates: boolean) {
  return apiFetch<{ hidden_categories: string[]; shuffle_templates: boolean }>(
    "/admin/ad-studio/categories",
    {
      method: "PUT",
      body: JSON.stringify({
        hidden_categories: hidden,
        shuffle_templates: shuffleTemplates,
      }),
    },
  );
}

export function generateFromAdStudioTemplate(
  id: string,
  body: { product_upload_id?: string; avatar_upload_id?: string; edit?: string },
) {
  return apiFetch<{
    job: GenerationJob | VideoGenerationJob;
    media_kind: AdStudioMediaKind;
  }>(`/ad-studio/templates/${encodeURIComponent(id)}/generate`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchAdminAdStudioTemplates(category?: string) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch<{ items: AdStudioTemplateAdmin[] }>(
    `/admin/ad-studio/templates${qs}`,
  );
}

export function createAdminAdStudioTemplate(payload: AdStudioWritePayload) {
  return apiFetch<{ item: AdStudioTemplateAdmin }>("/admin/ad-studio/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminAdStudioTemplate(
  id: string,
  payload: AdStudioWritePayload,
) {
  return apiFetch<{ item: AdStudioTemplateAdmin }>(
    `/admin/ad-studio/templates/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminAdStudioTemplate(id: string) {
  return apiFetch<{ ok: boolean }>(
    `/admin/ad-studio/templates/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export async function uploadAdminAdStudioPreview(id: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  try {
    return await postGenerationMultipart<{ item: AdStudioTemplateAdmin }>(
      `/admin/ad-studio/templates/${encodeURIComponent(id)}/preview`,
      form,
    );
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "Не удалось загрузить превью");
  }
}

export function adminAdStudioPreviewUrl(item: AdStudioTemplateAdmin): string {
  if (!item.has_preview) return "";
  return `/admin/ad-studio/templates/${encodeURIComponent(item.id)}/preview?t=${encodeURIComponent(item.updated_at)}`;
}

export function adminAdStudioPreviewSourceUrl(item: AdStudioTemplateAdmin): string {
  if (!item.has_preview || item.preview_kind !== "video") return "";
  return `/admin/ad-studio/templates/${encodeURIComponent(item.id)}/preview/source?t=${encodeURIComponent(item.updated_at)}`;
}

export function validateAdStudioPreviewFile(
  file: File,
  mediaKind: AdStudioMediaKind,
): string | null {
  if (file.type.startsWith("video/")) {
    if (mediaKind !== "video") {
      return "Видео-превью доступно только для видео-шаблонов";
    }
    if (file.size > REFERENCE_VIDEO_MAX_BYTES) {
      return "Видео должно быть не больше 50 МБ";
    }
    return null;
  }
  if (file.type.startsWith("image/")) {
    if (file.size > 15 * 1024 * 1024) {
      return "Изображение должно быть не больше 15 МБ";
    }
    return null;
  }
  return "Поддерживаются фото (JPEG, PNG, WebP) или видео (MP4, MOV, WebM)";
}

export async function probeAdStudioVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}

export async function validateAdStudioPreviewVideoDuration(file: File): Promise<string | null> {
  const seconds = await probeAdStudioVideoDuration(file);
  if (seconds == null) {
    return "Не удалось определить длительность видео";
  }
  if (!isReferenceVideoDurationValid(seconds)) {
    return `Видео должно быть от 2 до ${referenceVideoMaxAllowedSeconds()} сек (сейчас ${seconds.toFixed(1)} сек)`;
  }
  return null;
}
