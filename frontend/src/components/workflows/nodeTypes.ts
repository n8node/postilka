export type NodeViewMode = "compact" | "expanded";

export const NODE_VIEW_STORAGE_KEY = "postilka.workflow.nodeView";

export const NODE_CARD_LAYOUT = {
  compact: {
    width: 220,
    height: 128,
    colGap: 280,
    rowGap: 180,
  },
  expanded: {
    width: 288,
    height: 200,
    triggerWidth: 144,
    triggerHeight: 144,
    colGap: 360,
    rowGap: 220,
  },
} as const;

/** Keep stacked ports from overlapping on compact/social nodes. */
export function nodeMinHeightPx(view: NodeViewMode, portCount: number): number {
  const base = NODE_CARD_LAYOUT[view].height;
  const portSize = view === "compact" ? 16 : 28;
  const gap = view === "compact" ? 10 : 12;
  const pad = view === "compact" ? 20 : 32;
  if (portCount <= 1) return base;
  return Math.max(base, pad * 2 + portCount * portSize + (portCount - 1) * gap);
}

export type NodeCategory =
  | "trigger"
  | "ai"
  | "social"
  | "media"
  | "logic"
  | "control";

export type NodePort = {
  id: string;
  label: string;
  type: "string" | "number" | "boolean" | "image" | "video" | "any";
};

/** Universal flow input — every node except trigger must have at least one input port. */
export const NODE_FLOW_INPUT: NodePort = {
  id: "input",
  label: "Поток",
  type: "any",
};

export const SOCIAL_CONTENT_INPUTS: NodePort[] = [
  { id: "text", label: "Текст", type: "string" },
  { id: "imageUrl", label: "Фото", type: "image" },
  { id: "videoUrl", label: "Видео", type: "video" },
];

function isFilledSocialValue(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

export function socialHasText(data: Record<string, any>): boolean {
  return isFilledSocialValue(data?.text) || isFilledSocialValue(data?.description);
}

export function socialHasImage(data: Record<string, any>): boolean {
  return isFilledSocialValue(data?.imageUrl) || isFilledSocialValue(data?.imageFileId);
}

export function socialHasVideo(data: Record<string, any>): boolean {
  return isFilledSocialValue(data?.videoUrl) || isFilledSocialValue(data?.videoFileId);
}

export function socialHasMedia(data: Record<string, any>): boolean {
  return (
    socialHasImage(data) ||
    socialHasVideo(data) ||
    isFilledSocialValue(data?.mediaUrl) ||
    isFilledSocialValue(data?.fileId)
  );
}

export type SocialFieldNeed = "required" | "one_of" | "optional" | "hidden";

export type SocialFieldNeeds = {
  text: SocialFieldNeed;
  image: SocialFieldNeed;
  video: SocialFieldNeed;
  titleText?: SocialFieldNeed;
  hint: string;
};

export function socialFieldNeeds(
  nodeType: string,
  data: Record<string, any> = {}
): SocialFieldNeeds {
  const format = String(data.format || "");
  if (nodeType === "social_telegram") {
    if (format === "video_note") {
      return {
        text: "optional",
        image: "hidden",
        video: "required",
        hint: "Для кружочка нужно видео. Текст уйдёт отдельным сообщением.",
      };
    }
    if (format === "story") {
      return {
        text: "optional",
        image: "one_of",
        video: "one_of",
        hint: "Для истории нужно фото или видео. Подпись необязательна.",
      };
    }
    return {
      text: "one_of",
      image: "one_of",
      video: "one_of",
      hint: "Укажите хотя бы одно: текст, фото или видео.",
    };
  }
  if (nodeType === "social_vk") {
    if (format === "clip") {
      return {
        text: "optional",
        image: "hidden",
        video: "required",
        hint: "Для клипа нужно видео. Текст необязателен.",
      };
    }
    if (format === "story") {
      return {
        text: "optional",
        image: "one_of",
        video: "one_of",
        hint: "Для истории нужно фото или видео.",
      };
    }
    return {
      text: "one_of",
      image: "one_of",
      video: "one_of",
      hint: "Укажите хотя бы одно: текст, фото или видео.",
    };
  }
  if (nodeType === "social_youtube") {
    return {
      text: "optional",
      image: "optional",
      video: "required",
      titleText: "required",
      hint: "Нужны заголовок и видео. Описание и обложка необязательны.",
    };
  }
  if (nodeType === "draft_approval") {
    return {
      text: "one_of",
      image: "one_of",
      video: "one_of",
      hint: "Укажите хотя бы одно: текст, фото или видео.",
    };
  }
  if (nodeType === "social_dzen") {
    if (format === "video") {
      return {
        text: "optional",
        image: "optional",
        video: "required",
        hint: "Для видео в Дзен нужно видео. Текст необязателен.",
      };
    }
    if (format === "article") {
      return {
        text: "required",
        image: "optional",
        video: "optional",
        hint: "Для статьи нужен текст. Фото и видео необязательны.",
      };
    }
    return {
      text: "one_of",
      image: "one_of",
      video: "one_of",
      hint: "Укажите хотя бы одно: текст, фото или видео.",
    };
  }
  return {
    text: "one_of",
    image: "one_of",
    video: "one_of",
    hint: "Укажите хотя бы одно: текст, фото или видео.",
  };
}

export function validateSocialContent(
  nodeType: string,
  data: Record<string, any> = {}
): string | null {
  if (!nodeType.startsWith("social_") && nodeType !== "draft_approval") {
    return null;
  }
  const needs = socialFieldNeeds(nodeType, data);
  const text = socialHasText(data);
  const image = socialHasImage(data);
  const video = socialHasVideo(data);
  const media = socialHasMedia(data);

  if (needs.titleText === "required" && !isFilledSocialValue(data.titleText)) {
    return "Укажите заголовок видео";
  }
  if (needs.video === "required" && !video && !media) {
    return needs.hint;
  }
  if (needs.image === "required" && !image && !media) {
    return needs.hint;
  }
  if (needs.text === "required" && !text) {
    return needs.hint;
  }
  const oneOf: boolean[] = [];
  if (needs.text === "one_of") oneOf.push(text);
  if (needs.image === "one_of") oneOf.push(image || media);
  if (needs.video === "one_of") oneOf.push(video || media);
  if (oneOf.length > 0 && !oneOf.some(Boolean)) {
    return needs.hint;
  }
  return null;
}

export function validatePromptRequired(
  nodeType: string,
  data: Record<string, any> = {}
): string | null {
  if (nodeType !== "ai_text" && nodeType !== "ai_image" && nodeType !== "ai_video") {
    return null;
  }
  if (!isFilledSocialValue(data.prompt)) {
    return "Укажите промпт";
  }
  return null;
}

function filledSlotCount(urls: unknown, ids: unknown): number {
  const u = Array.isArray(urls) ? urls : [];
  const d = Array.isArray(ids) ? ids : [];
  const n = Math.max(u.length, d.length);
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (isFilledSocialValue(u[i]) || isFilledSocialValue(d[i])) count += 1;
  }
  return count;
}

export function validateAIImageNode(data: Record<string, any> = {}): string | null {
  const promptErr = validatePromptRequired("ai_image", data);
  if (promptErr) return promptErr;
  const mode = String(data.mode || "text-to-image");
  if (mode === "image-to-image") {
    if (
      !isFilledSocialValue(data.sourceImage) &&
      !isFilledSocialValue(data.sourceImageFileId) &&
      !isFilledSocialValue(data.referenceImage)
    ) {
      return "Для режима «Фото → фото» нужно исходное фото";
    }
  }
  if (mode === "combine" && filledSlotCount(data.combineImages, data.combineImageFileIds) < 2) {
    return "Для комбинации нужно минимум 2 фото";
  }
  return null;
}

export function validateAIVideoNode(data: Record<string, any> = {}): string | null {
  const promptErr = validatePromptRequired("ai_video", data);
  if (promptErr) return promptErr;
  const mode = String(data.mode || "text-to-video");
  if (mode === "image-to-video") {
    const hasFrame =
      isFilledSocialValue(data.firstFrame) ||
      isFilledSocialValue(data.firstFrameFileId) ||
      isFilledSocialValue(data.lastFrame) ||
      isFilledSocialValue(data.lastFrameFileId);
    if (!hasFrame) {
      return "Для режима «Фото → видео» нужен первый или последний кадр";
    }
  }
  if (mode === "reference-to-video") {
    const images = filledSlotCount(data.referenceImages, data.referenceImageFileIds);
    const videos = filledSlotCount(data.referenceVideos, data.referenceVideoFileIds);
    if (images === 0 && videos === 0 && !isFilledSocialValue(data.firstFrame)) {
      return "Для режима «Референс → видео» нужно фото или видео";
    }
  }
  return null;
}

export function validatePlainText(
  nodeType: string,
  data: Record<string, any> = {}
): string | null {
  if (nodeType !== "plain_text") return null;
  if (!isFilledSocialValue(data.text)) {
    return "Укажите текст";
  }
  return null;
}

export function validateFormatterTemplate(
  nodeType: string,
  data: Record<string, any> = {}
): string | null {
  if (nodeType !== "formatter") return null;
  if (!isFilledSocialValue(data.template) && !isFilledSocialValue(data.text)) {
    return "Укажите шаблон текста";
  }
  return null;
}

export type NodeTypeDefinition = {
  type: string;
  title: string;
  description: string;
  category: NodeCategory;
  icon: string;
  color: {
    bg: string;
    border: string;
    badge: string;
    text: string;
  };
  inputs: NodePort[];
  outputs: NodePort[];
  defaultData: Record<string, any>;
};

export const NODE_DEFINITIONS: Record<string, NodeTypeDefinition> = {
  trigger: {
    type: "trigger",
    title: "Триггер (Запуск)",
    description: "Начало сценария: ручной запуск, расписание или событие",
    category: "trigger",
    icon: "play-circle",
    color: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      border: "border-emerald-500/40",
      badge: "bg-emerald-500 text-white",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    inputs: [],
    outputs: [
      { id: "timestamp", label: "Время запуска", type: "string" },
    ],
    defaultData: {
      title: "Запуск процесса",
      triggerType: "manual",
      scheduleDateTime: "",
      scheduleCron: "",
      rssFeedUrl: "",
      rssPollIntervalMinutes: 15,
      rssMaxItemsPerRun: 1,
    },
  },
  ai_text: {
    type: "ai_text",
    title: "AI Генерация текста",
    description: "Генерация постов, рерайт, сценарии и хештеги (Нейросеть)",
    category: "ai",
    icon: "sparkles",
    color: {
      bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
      border: "border-indigo-500/40",
      badge: "bg-indigo-600 text-white",
      text: "text-indigo-600 dark:text-indigo-400",
    },
    inputs: [
      NODE_FLOW_INPUT,
      { id: "prompt", label: "Промпт / Тема", type: "string" },
    ],
    outputs: [
      { id: "text", label: "Сгенерированный текст", type: "string" },
      { id: "tokens", label: "Токены", type: "number" },
    ],
    defaultData: {
      title: "AI Генерация текста",
      prompt: "Напиши вовлекающий пост для соцсетей на тему трендов 2026 года.",
      role: "Опытный SMM-копирайтер",
      temperature: 0.7,
    },
  },
  plain_text: {
    type: "plain_text",
    title: "Текст",
    description: "Готовый текст поста без AI — пишете сами или через переменные",
    category: "logic",
    icon: "align-left",
    color: {
      bg: "bg-slate-500/10 dark:bg-slate-500/20",
      border: "border-slate-500/40",
      badge: "bg-slate-600 text-white",
      text: "text-slate-600 dark:text-slate-400",
    },
    inputs: [{ ...NODE_FLOW_INPUT, label: "Вход / Триггер" }],
    outputs: [
      { id: "text", label: "Текст", type: "string" },
    ],
    defaultData: {
      title: "Текст",
      text: "",
    },
  },
  ai_image: {
    type: "ai_image",
    title: "AI Изображение",
    description: "Генерация фотореалистичных иллюстраций и обложек (Нейросеть)",
    category: "ai",
    icon: "image",
    color: {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      border: "border-purple-500/40",
      badge: "bg-purple-600 text-white",
      text: "text-purple-600 dark:text-purple-400",
    },
    inputs: [
      NODE_FLOW_INPUT,
      { id: "prompt", label: "Промпт / Описание", type: "string" },
      { id: "sourceImage", label: "Исходное фото", type: "image" },
    ],
    outputs: [
      { id: "image_url", label: "Изображение", type: "image" },
    ],
    defaultData: {
      title: "AI Изображение",
      mode: "text-to-image",
      prompt: "Золотой час над городом, мягкий свет, кинематографичная атмосфера, высокая детализация",
      sourceImage: "",
      sourceImageFileId: "",
      combineImages: ["", "", "", "", "", ""],
      combineImageFileIds: ["", "", "", "", "", ""],
      aspectRatio: "1:1",
    },
  },
  ai_video: {
    type: "ai_video",
    title: "AI Видео / Shorts",
    description: "Генерация динамических видеороликов и анимаций (Нейросеть)",
    category: "ai",
    icon: "video",
    color: {
      bg: "bg-pink-500/10 dark:bg-pink-500/20",
      border: "border-pink-500/40",
      badge: "bg-pink-600 text-white",
      text: "text-pink-600 dark:text-pink-400",
    },
    inputs: [
      NODE_FLOW_INPUT,
      { id: "prompt", label: "Сценарий / Промпт", type: "string" },
      { id: "firstFrame", label: "Первый кадр", type: "image" },
      { id: "lastFrame", label: "Последний кадр", type: "image" },
    ],
    outputs: [
      { id: "video_url", label: "Видео (MP4)", type: "video" },
    ],
    defaultData: {
      title: "AI Видеоролик",
      mode: "text-to-video",
      prompt: "Кинематографичная сцена, плавное движение камеры, мягкий свет",
      firstFrame: "",
      lastFrame: "",
      firstFrameFileId: "",
      lastFrameFileId: "",
      referenceImages: ["", "", "", "", "", "", "", "", ""],
      referenceImageFileIds: ["", "", "", "", "", "", "", "", ""],
      referenceVideos: ["", "", ""],
      referenceVideoFileIds: ["", "", ""],
      referenceAudios: ["", "", ""],
      referenceAudioFileIds: ["", "", ""],
      aspectRatio: "16:9",
      durationSeconds: 5,
    },
  },
  social_telegram: {
    type: "social_telegram",
    title: "Telegram Канал",
    description: "Публикация постов, инлайн-кнопок, Stories и кружочков",
    category: "social",
    icon: "send",
    color: {
      bg: "bg-sky-500/10 dark:bg-sky-500/20",
      border: "border-sky-500/40",
      badge: "bg-sky-500 text-white",
      text: "text-sky-600 dark:text-sky-400",
    },
    inputs: [NODE_FLOW_INPUT, ...SOCIAL_CONTENT_INPUTS],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
      { id: "channel_name", label: "Канал", type: "string" },
    ],
    defaultData: {
      title: "Telegram Пост",
      channelId: "",
      channelName: "",
      text: "{{ ai_text_1.text }}",
      imageUrl: "",
      videoUrl: "",
      format: "message",
      mediaLayout: "separate",
      mediaPosition: "below",
      mediaOrder: "media_first",
      silent: false,
      pin: false,
      protectContent: false,
      disableLinkPreview: false,
      buttons: [],
      telegramStory: {
        active_period: 86400,
        areas: [],
      },
    },
  },
  social_vk: {
    type: "social_vk",
    title: "ВКонтакте Сообщество",
    description: "Публикация записей на стену, клипов и первых комментариев",
    category: "social",
    icon: "share-2",
    color: {
      bg: "bg-blue-600/10 dark:bg-blue-600/20",
      border: "border-blue-600/40",
      badge: "bg-blue-600 text-white",
      text: "text-blue-600 dark:text-blue-400",
    },
    inputs: [NODE_FLOW_INPUT, ...SOCIAL_CONTENT_INPUTS],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
      { id: "channel_name", label: "Сообщество", type: "string" },
    ],
    defaultData: {
      title: "ВКонтакте Стена",
      text: "{{ ai_text_1.text }}",
      imageUrl: "",
      videoUrl: "",
      fromGroup: true,
      signed: false,
      firstComment: "",
    },
  },
  social_youtube: {
    type: "social_youtube",
    title: "YouTube Видео / Shorts",
    description: "Публикация вертикальных Shorts или стандартных видео",
    category: "social",
    icon: "youtube",
    color: {
      bg: "bg-red-500/10 dark:bg-red-500/20",
      border: "border-red-500/40",
      badge: "bg-red-600 text-white",
      text: "text-red-600 dark:text-red-400",
    },
    inputs: [NODE_FLOW_INPUT, ...SOCIAL_CONTENT_INPUTS],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
      { id: "channel_name", label: "Канал", type: "string" },
    ],
    defaultData: {
      title: "YouTube Shorts",
      titleText: "Новое видео #shorts",
      text: "{{ ai_text_1.text }}",
      description: "{{ ai_text_1.text }}",
      imageUrl: "",
      videoUrl: "",
      format: "shorts",
      privacyStatus: "public",
      tags: "shorts, ai, marketing",
    },
  },
  social_max: {
    type: "social_max",
    title: "MAX Канал",
    description: "Публикация постов, медиафайлов и инлайн-кнопок в мессенджер MAX",
    category: "social",
    icon: "message-square",
    color: {
      bg: "bg-violet-500/10 dark:bg-violet-500/20",
      border: "border-violet-500/40",
      badge: "bg-violet-600 text-white",
      text: "text-violet-600 dark:text-violet-400",
    },
    inputs: [NODE_FLOW_INPUT, ...SOCIAL_CONTENT_INPUTS],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
      { id: "channel_name", label: "Канал MAX", type: "string" },
    ],
    defaultData: {
      title: "MAX Пост",
      channelId: "",
      channelName: "",
      text: "{{ ai_text_1.text }}",
      imageUrl: "",
      videoUrl: "",
      silent: false,
      pin: false,
      disableLinkPreview: false,
      buttons: [],
    },
  },
  social_dzen: {
    type: "social_dzen",
    title: "Дзен Канал",
    description: "Публикация постов и лонгрид-статей в Дзен",
    category: "social",
    icon: "file-text",
    color: {
      bg: "bg-orange-500/10 dark:bg-orange-500/20",
      border: "border-orange-500/40",
      badge: "bg-orange-600 text-white",
      text: "text-orange-600 dark:text-orange-400",
    },
    inputs: [NODE_FLOW_INPUT, ...SOCIAL_CONTENT_INPUTS],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
    ],
    defaultData: {
      title: "Дзен Пост",
      text: "{{ ai_text_1.text }}",
      imageUrl: "",
      videoUrl: "",
      format: "brief",
    },
  },
  social_photochka: {
    type: "social_photochka",
    title: "Photochka",
    description: "Публикация поста с текстом и медиа в Photochka",
    category: "social",
    icon: "camera",
    color: {
      bg: "bg-violet-700/10 dark:bg-violet-700/20",
      border: "border-violet-700/40",
      badge: "bg-violet-700 text-white",
      text: "text-violet-700 dark:text-violet-300",
    },
    inputs: [NODE_FLOW_INPUT, ...SOCIAL_CONTENT_INPUTS],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
      { id: "channel_name", label: "Канал Photochka", type: "string" },
    ],
    defaultData: {
      title: "Photochka Пост",
      channelId: "",
      channelName: "",
      text: "{{ ai_text_1.text }}",
      imageUrl: "",
      videoUrl: "",
      imageFileId: "",
      videoFileId: "",
    },
  },
  files_media: {
    type: "files_media",
    title: "Image / Media",
    description: "Загрузка изображения с диска/ПК или выбор из медиатеки S3",
    category: "media",
    icon: "image",
    color: {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      border: "border-purple-500/40",
      badge: "bg-purple-600 text-white",
      text: "text-purple-600 dark:text-purple-400",
    },
    inputs: [NODE_FLOW_INPUT],
    outputs: [
      { id: "image_url", label: "Изображение", type: "image" },
      { id: "video_url", label: "Видео", type: "video" },
      { id: "file_url", label: "Файл", type: "any" },
      { id: "file_id", label: "ID файла", type: "any" },
    ],
    defaultData: {
      title: "Image",
      fileUrl: "",
      fileId: "",
      fileName: "",
      mediaKind: "image",
    },
  },
  draft_approval: {
    type: "draft_approval",
    title: "Согласование",
    description: "Отправляет публикацию на согласование и ставит процесс на паузу",
    category: "control",
    icon: "check-circle-2",
    color: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      border: "border-amber-500/40",
      badge: "bg-amber-500 text-white",
      text: "text-amber-600 dark:text-amber-400",
    },
    inputs: [NODE_FLOW_INPUT, ...SOCIAL_CONTENT_INPUTS],
    outputs: [
      { id: "post_id", label: "ID публикации", type: "string" },
      { id: "status", label: "Статус", type: "string" },
    ],
    defaultData: {
      title: "Согласование",
      text: "{{ ai_text_1.text }}",
      imageUrl: "",
      videoUrl: "",
      imageFileId: "",
      videoFileId: "",
      channelId: "",
      channelName: "",
      approverUserIds: [],
      dueAt: "",
      fileId: "",
    },
  },
  logic_condition: {
    type: "logic_condition",
    title: "Условие (If / Else)",
    description: "Ветвление логики на основе проверки значений",
    category: "logic",
    icon: "git-branch",
    color: {
      bg: "bg-zinc-500/10 dark:bg-zinc-500/20",
      border: "border-zinc-500/40",
      badge: "bg-zinc-600 text-white",
      text: "text-zinc-600 dark:text-zinc-400",
    },
    inputs: [
      NODE_FLOW_INPUT,
      { id: "leftValue", label: "Значение", type: "any" },
    ],
    outputs: [
      { id: "output_0", label: "Да (True)", type: "any" },
      { id: "output_1", label: "Нет (False)", type: "any" },
      { id: "result", label: "Результат (boolean)", type: "boolean" },
    ],
    defaultData: {
      title: "Проверка условия",
      leftValue: "{{ ai_text_1.text }}",
      operator: "not_empty",
      rightValue: "",
    },
  },
  switch: {
    type: "switch",
    title: "Разветвление (Switch)",
    description: "Маршрутизация по условиям на разные ветки сценария",
    category: "logic",
    icon: "split",
    color: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      border: "border-emerald-500/40",
      badge: "bg-emerald-600 text-white",
      text: "text-emerald-600 dark:text-emerald-400",
    },
    inputs: [{ ...NODE_FLOW_INPUT, label: "Входной поток" }],
    outputs: [
      { id: "output_0", label: "Ветка 1 (True / Маршрут 1)", type: "any" },
      { id: "output_1", label: "Ветка 2 (False / Маршрут 2)", type: "any" },
      { id: "fallback", label: "Иначе (Fallback)", type: "any" },
    ],
    defaultData: {
      title: "Разветвление (Switch)",
      mode: "rules",
      rule0_label: "Ветка 1",
      rule0_value1: "{{ ai_text_1.text }}",
      rule0_operator: "not_empty",
      rule0_value2: "",
      rule1_label: "Ветка 2",
      rule1_value1: "{{ ai_text_1.text }}",
      rule1_operator: "is_empty",
      rule1_value2: "",
      enableFallback: true,
    },
  },
  formatter: {
    type: "formatter",
    title: "Форматирование & UTM",
    description: "Сборка шаблонов, хештегов и отслеживаемых ссылок",
    category: "logic",
    icon: "type",
    color: {
      bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
      border: "border-cyan-500/40",
      badge: "bg-cyan-600 text-white",
      text: "text-cyan-600 dark:text-cyan-400",
    },
    inputs: [
      NODE_FLOW_INPUT,
      { id: "text", label: "Текст", type: "string" },
    ],
    outputs: [
      { id: "text", label: "Текст", type: "string" },
    ],
    defaultData: {
      title: "Форматирование текста",
      template: "{{ ai_text_1.text }}\n\n🔥 Узнать подробнее: https://postilka.ru/go/promo",
    },
  },
  merge: {
    type: "merge",
    title: "Merge",
    description: "Две ветки (Input 1 + Input 2) собираются в один результат",
    category: "logic",
    icon: "git-merge",
    color: {
      bg: "bg-teal-500/10 dark:bg-teal-500/20",
      border: "border-teal-500/40",
      badge: "bg-teal-600 text-white",
      text: "text-teal-600 dark:text-teal-400",
    },
    inputs: [
      { id: "input_1", label: "Input 1", type: "any" },
      { id: "input_2", label: "Input 2", type: "any" },
    ],
    outputs: [{ id: "output", label: "Output", type: "any" }],
    defaultData: {
      title: "Merge",
      mode: "combine",
      waitForAll: true,
    },
  },
  set_fields: {
    type: "set_fields",
    title: "Сборка полей",
    description: "Задаёт именованные поля из переменных предыдущих нод",
    category: "logic",
    icon: "list",
    color: {
      bg: "bg-blue-500/10 dark:bg-blue-500/20",
      border: "border-blue-500/40",
      badge: "bg-blue-600 text-white",
      text: "text-blue-600 dark:text-blue-400",
    },
    inputs: [NODE_FLOW_INPUT],
    outputs: [
      { id: "payload", label: "Собранные поля", type: "any" },
    ],
    defaultData: {
      title: "Сборка полей",
      fields: [
        { key: "text", value: "{{ merge_1.text }}" },
        { key: "imageUrl", value: "{{ merge_1.image_url }}" },
        { key: "videoUrl", value: "{{ merge_1.video_url }}" },
      ],
    },
  },
  loop_items: {
    type: "loop_items",
    title: "Цикл по списку",
    description: "Повторяет следующие ноды для каждого канала или элемента",
    category: "logic",
    icon: "repeat",
    color: {
      bg: "bg-orange-500/10 dark:bg-orange-500/20",
      border: "border-orange-500/40",
      badge: "bg-orange-600 text-white",
      text: "text-orange-600 dark:text-orange-400",
    },
    inputs: [NODE_FLOW_INPUT],
    outputs: [
      { id: "output", label: "Результат итерации", type: "any" },
    ],
    defaultData: {
      title: "Цикл по каналам",
      itemsSource: "channels",
      staticItems: [],
      upstreamField: "items",
      channelProviders: ["telegram", "vk"],
      batchSize: 1,
      stopOnError: false,
      maxIterations: 20,
    },
  },
  http_request: {
    type: "http_request",
    title: "HTTP запрос",
    description: "GET/POST к внешнему API или вашему сайту",
    category: "logic",
    icon: "globe",
    color: {
      bg: "bg-sky-600/10 dark:bg-sky-600/20",
      border: "border-sky-600/40",
      badge: "bg-sky-700 text-white",
      text: "text-sky-700 dark:text-sky-300",
    },
    inputs: [
      NODE_FLOW_INPUT,
      { id: "url", label: "URL", type: "string" },
    ],
    outputs: [
      { id: "body", label: "Ответ API", type: "any" },
    ],
    defaultData: {
      title: "HTTP запрос",
      method: "GET",
      url: "",
      headers: {},
      bodyType: "json",
      body: "",
      responseFormat: "json",
      timeoutSeconds: 15,
      failOnNon2xx: true,
    },
  },
};

export const PORT_TYPE_COLORS: Record<string, {
  dot: string;
  dotBorder: string;
  badge: string;
  text: string;
  stroke: string;
  label: string;
}> = {
  string: {
    dot: "bg-sky-500",
    dotBorder: "border-sky-300 dark:border-sky-600",
    badge: "bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800",
    text: "text-sky-600 dark:text-sky-400",
    stroke: "#0ea5e9",
    label: "Текст",
  },
  number: {
    dot: "bg-amber-500",
    dotBorder: "border-amber-300 dark:border-amber-600",
    badge: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    text: "text-amber-600 dark:text-amber-400",
    stroke: "#f59e0b",
    label: "Число",
  },
  boolean: {
    dot: "bg-emerald-500",
    dotBorder: "border-emerald-300 dark:border-emerald-600",
    badge: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-600 dark:text-emerald-400",
    stroke: "#10b981",
    label: "Логический",
  },
  image: {
    dot: "bg-purple-500",
    dotBorder: "border-purple-300 dark:border-purple-600",
    badge: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800",
    text: "text-purple-600 dark:text-purple-400",
    stroke: "#a855f7",
    label: "Изображение",
  },
  video: {
    dot: "bg-pink-500",
    dotBorder: "border-pink-300 dark:border-pink-600",
    badge: "bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800",
    text: "text-pink-600 dark:text-pink-400",
    stroke: "#ec4899",
    label: "Видео",
  },
  any: {
    dot: "bg-indigo-500",
    dotBorder: "border-indigo-300 dark:border-indigo-600",
    badge: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800",
    text: "text-indigo-600 dark:text-indigo-400",
    stroke: "#6366f1",
    label: "Поток",
  },
};

export function isPortCompatible(sourceType: string, targetType: string): boolean {
  if (!sourceType || !targetType) return true;
  if (sourceType === "any" || targetType === "any") return true;
  if (sourceType === targetType) return true;
  if (sourceType === "number" && targetType === "string") return true;
  if (sourceType === "image" && (targetType === "image" || targetType === "any")) return true;
  if (sourceType === "video" && (targetType === "video" || targetType === "any")) return true;
  return false;
}

export function getPortDefinition(nodeType: string, portId: string, isOutput: boolean): NodePort | undefined {
  const def = NODE_DEFINITIONS[nodeType];
  if (!def) return undefined;
  const list = isOutput ? def.outputs : def.inputs;
  return list.find((p) => p.id === portId);
}

export interface WorkflowEconomicsItem {
  id: string;
  nodeTitle: string;
  category: string;
  unit: string;
  quotaLabel: string;
  walletRubles: number;
}

export interface WorkflowEconomicsSummary {
  textCount: number;
  imageCount: number;
  videoCount: number;
  socialCount: number;
  totalNodes: number;
  estimatedTokens: number;
  estimatedImageCredits: number;
  estimatedVideoCredits: number;
  totalWalletRubles: number;
  items: WorkflowEconomicsItem[];
}

export function calculateWorkflowCost(
  nodes: Array<{ id: string; type: string; data: Record<string, any> }>
): WorkflowEconomicsSummary {
  let textCount = 0;
  let imageCount = 0;
  let videoCount = 0;
  let socialCount = 0;
  let estimatedTokens = 0;
  let estimatedImageCredits = 0;
  let estimatedVideoCredits = 0;
  let totalWalletRubles = 0;
  const items: WorkflowEconomicsItem[] = [];

  nodes.forEach((n) => {
    const title = (n.data?.title as string) || n.type;
    if (n.type === "ai_text") {
      textCount++;
      estimatedTokens += 500;
      const rubles = 0.5; // ~0.50 ₽ за генерацию текста при исчерпании квоты
      totalWalletRubles += rubles;
      items.push({
        id: n.id,
        nodeTitle: title,
        category: "Текст AI",
        unit: "1 генерация (~500 токенов)",
        quotaLabel: "1 генерация из квоты тарифа",
        walletRubles: rubles,
      });
    } else if (n.type === "ai_image") {
      imageCount++;
      estimatedImageCredits += 1;
      const rubles = 5.0; // ~5.00 ₽ за изображение при исчерпании квоты
      totalWalletRubles += rubles;
      items.push({
        id: n.id,
        nodeTitle: title,
        category: "Изображение AI",
        unit: "1 изображение (2k)",
        quotaLabel: "1 кредит из квоты тарифа",
        walletRubles: rubles,
      });
    } else if (n.type === "ai_video") {
      videoCount++;
      const duration = (n.data?.durationSeconds as number) || 5;
      const credits = duration <= 5 ? 5 : 10;
      estimatedVideoCredits += credits;
      const rubles = duration <= 5 ? 25.0 : 50.0;
      totalWalletRubles += rubles;
      items.push({
        id: n.id,
        nodeTitle: title,
        category: "Видео AI",
        unit: `${duration} сек видео (${credits} кредитов)`,
        quotaLabel: `${credits} кредитов из квоты тарифа`,
        walletRubles: rubles,
      });
    } else if (
      n.type === "social_telegram" ||
      n.type === "social_vk" ||
      n.type === "social_youtube" ||
      n.type === "social_max" ||
      n.type === "social_dzen" ||
      n.type === "social_photochka"
    ) {
      socialCount++;
      items.push({
        id: n.id,
        nodeTitle: title,
        category: "Публикация",
        unit: "1 публикация",
        quotaLabel: "Лимит постов тарифа",
        walletRubles: 0,
      });
    }
  });

  return {
    textCount,
    imageCount,
    videoCount,
    socialCount,
    totalNodes: nodes.length,
    estimatedTokens,
    estimatedImageCredits,
    estimatedVideoCredits,
    totalWalletRubles: Math.round(totalWalletRubles * 100) / 100,
    items,
  };
}

