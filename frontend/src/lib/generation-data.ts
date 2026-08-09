export type GenerationModeId = "text-to-image" | "image-to-image" | "combine";

export type AspectRatioId = "1:1" | "4:5" | "9:16" | "16:9";

export const COMBINE_PHOTO_SLOTS = 6;

export type GenerationUpload = {
  uploadId: string;
  previewUrl: string;
};

export const generationModes = [
  {
    id: "text-to-image" as GenerationModeId,
    label: "Текст → фото",
    desc: "Создание из описания",
  },
  {
    id: "image-to-image" as GenerationModeId,
    label: "Фото → фото",
    desc: "Загрузите фото и опишите, как его изменить или дополнить",
  },
  {
    id: "combine" as GenerationModeId,
    label: "Комбинация фото",
    desc: "Объедините 2–6 изображений в одну композицию",
  },
];

export const generationModeLabels: Record<GenerationModeId, string> = {
  "text-to-image": "Текст → фото",
  "image-to-image": "Фото → фото",
  combine: "Комбинация фото",
};

export const promptPlaceholders: Record<GenerationModeId, string> = {
  "text-to-image":
    "Золотой час над городом, мягкий свет, кинематографичная атмосфера…",
  "image-to-image":
    "Как изменить фото: «добавь снег», «сделай ночь», «в стиле акварели»…",
  combine:
    "Как объединить: «человек на фоне гор», «объекты в одной сцене»…",
};

export const aspectRatios: {
  id: AspectRatioId;
  label: string;
  iconW: number;
  iconH: number;
}[] = [
  { id: "1:1", label: "1:1", iconW: 22, iconH: 22 },
  { id: "4:5", label: "4:5", iconW: 18, iconH: 22 },
  { id: "9:16", label: "9:16", iconW: 14, iconH: 24 },
  { id: "16:9", label: "16:9", iconW: 28, iconH: 16 },
];

export type GenerationHistoryItem = {
  id: string;
  prompt: string;
  mode: string;
  createdAt: string;
  imageUrl: string;
  thumbUrl?: string;
  usedInPost: boolean;
};

export const defaultPrompt =
  "Золотой час над городом, мягкий свет, кинематографичная атмосфера, высокая детализация";

export function emptyCombinePhotos(): (GenerationUpload | null)[] {
  return Array.from({ length: COMBINE_PHOTO_SLOTS }, () => null);
}

export function formatGenerationTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function toHistoryItem(item: {
  id: string;
  prompt: string;
  mode: string;
  image_url: string;
  thumb_url?: string;
  created_at: string;
  used_in_post?: boolean;
}): GenerationHistoryItem {
  const modeKey = item.mode as GenerationModeId;
  const modeLabel = generationModeLabels[modeKey] ?? item.mode;
  return {
    id: item.id,
    prompt: item.prompt,
    mode: modeLabel,
    createdAt: formatGenerationTime(item.created_at),
    imageUrl: item.image_url,
    thumbUrl: item.thumb_url,
    usedInPost: Boolean(item.used_in_post),
  };
}
