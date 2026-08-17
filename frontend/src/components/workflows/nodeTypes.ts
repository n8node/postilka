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
      { id: "prompt", label: "Промпт / Описание", type: "string" },
      { id: "referenceImage", label: "Референс (Image)", type: "image" },
    ],
    outputs: [
      { id: "image_url", label: "Изображение", type: "image" },
    ],
    defaultData: {
      title: "AI Изображение",
      prompt: "Modern aesthetic digital portrait, cinematic lighting, 4k",
      aspectRatio: "1:1",
      model: "AI Studio Pro",
      resolution: "2k",
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
      { id: "prompt", label: "Сценарий / Промпт", type: "string" },
      { id: "firstFrame", label: "Первый кадр", type: "image" },
    ],
    outputs: [
      { id: "video_url", label: "Видео (MP4)", type: "video" },
    ],
    defaultData: {
      title: "AI Видеоролик",
      prompt: "Cinematic drone shot flying through modern futuristic skyscraper city",
      aspectRatio: "9:16",
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
    inputs: [
      { id: "text", label: "Текст сообщения", type: "string" },
      { id: "mediaUrl", label: "Медиафайл (опционально)", type: "any" },
    ],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
      { id: "channel_name", label: "Канал", type: "string" },
    ],
    defaultData: {
      title: "Telegram Пост",
      text: "{{ ai_text_1.text }}",
      format: "message",
      silent: false,
      pin: false,
      buttons: [],
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
    inputs: [
      { id: "text", label: "Текст записи", type: "string" },
      { id: "mediaUrl", label: "Вложения", type: "any" },
    ],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
      { id: "channel_name", label: "Сообщество", type: "string" },
    ],
    defaultData: {
      title: "ВКонтакте Стена",
      text: "{{ ai_text_1.text }}",
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
    inputs: [
      { id: "videoUrl", label: "Видеофайл (MP4)", type: "video" },
      { id: "titleText", label: "Заголовок видео", type: "string" },
      { id: "description", label: "Описание", type: "string" },
    ],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
      { id: "channel_name", label: "Канал", type: "string" },
    ],
    defaultData: {
      title: "YouTube Shorts",
      titleText: "Новое видео #shorts",
      description: "{{ ai_text_1.text }}",
      format: "shorts",
      privacyStatus: "public",
      tags: "shorts, ai, marketing",
    },
  },
  social_rutube: {
    type: "social_rutube",
    title: "Rutube Канал",
    description: "Публикация видео и постов в ленту Rutube",
    category: "social",
    icon: "film",
    color: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      border: "border-amber-500/40",
      badge: "bg-amber-600 text-white",
      text: "text-amber-600 dark:text-amber-400",
    },
    inputs: [
      { id: "text", label: "Текст / Описание", type: "string" },
      { id: "videoUrl", label: "Видео", type: "video" },
    ],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
    ],
    defaultData: {
      title: "Rutube Публикация",
      text: "{{ ai_text_1.text }}",
      category: "Бизнес и стартапы",
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
    inputs: [
      { id: "text", label: "Текст статьи / поста", type: "string" },
    ],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
    ],
    defaultData: {
      title: "Дзен Пост",
      text: "{{ ai_text_1.text }}",
      format: "brief",
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
    inputs: [],
    outputs: [
      { id: "image_url", label: "Изображение", type: "image" },
      { id: "video_url", label: "Видео", type: "video" },
      { id: "file_url", label: "Файл", type: "any" },
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
    title: "Утверждение человеком",
    description: "Создает черновик в календаре и ждет проверки",
    category: "control",
    icon: "check-circle-2",
    color: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      border: "border-amber-500/40",
      badge: "bg-amber-500 text-white",
      text: "text-amber-600 dark:text-amber-400",
    },
    inputs: [
      { id: "text", label: "Контент черновика", type: "string" },
    ],
    outputs: [
      { id: "post_id", label: "ID черновика", type: "string" },
      { id: "status", label: "Статус", type: "string" },
    ],
    defaultData: {
      title: "Модерация черновика",
      text: "{{ ai_text_1.text }}",
      notifyOwner: true,
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
      { id: "leftValue", label: "Значение", type: "any" },
    ],
    outputs: [
      { id: "result", label: "Результат (true/false)", type: "boolean" },
    ],
    defaultData: {
      title: "Проверка условия",
      leftValue: "{{ ai_text_1.text }}",
      operator: "not_empty",
      rightValue: "",
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
      { id: "sourceText", label: "Исходный текст", type: "string" },
    ],
    outputs: [
      { id: "result", label: "Отформатированный текст", type: "string" },
    ],
    defaultData: {
      title: "Форматирование текста",
      template: "{{ ai_text_1.text }}\n\n🔥 Узнать подробнее: https://postilka.ru/go/promo",
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
    label: "Медиа / Любой",
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
      n.type === "social_rutube" ||
      n.type === "social_max" ||
      n.type === "social_dzen"
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

