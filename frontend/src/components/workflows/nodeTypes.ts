export type NodeViewMode = "compact" | "expanded";

export const NODE_VIEW_STORAGE_KEY = "postilka.workflow.nodeView";

export const NODE_CARD_LAYOUT = {
  compact: {
    width: 220,
    height: 72,
    colGap: 280,
    rowGap: 140,
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
  label: "Вход",
  type: "any",
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
      NODE_FLOW_INPUT,
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
      NODE_FLOW_INPUT,
      { id: "text", label: "Текст сообщения", type: "string" },
      { id: "mediaUrl", label: "Медиафайл (опционально)", type: "any" },
    ],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
      { id: "channel_name", label: "Канал", type: "string" },
    ],
    defaultData: {
      title: "Telegram Пост",
      channelId: "",
      channelName: "",
      text: "{{ ai_text_1.text }}",
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
    inputs: [
      NODE_FLOW_INPUT,
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
      NODE_FLOW_INPUT,
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
    inputs: [
      NODE_FLOW_INPUT,
      { id: "text", label: "Текст сообщения", type: "string" },
      { id: "mediaUrl", label: "Медиафайл (опционально)", type: "any" },
    ],
    outputs: [
      { id: "status", label: "Статус", type: "string" },
      { id: "channel_name", label: "Канал MAX", type: "string" },
    ],
    defaultData: {
      title: "MAX Пост",
      channelId: "",
      channelName: "",
      text: "{{ ai_text_1.text }}",
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
    inputs: [
      NODE_FLOW_INPUT,
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
    inputs: [NODE_FLOW_INPUT],
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
    inputs: [
      NODE_FLOW_INPUT,
      { id: "text", label: "Текст публикации", type: "string" },
    ],
    outputs: [
      { id: "post_id", label: "ID публикации", type: "string" },
      { id: "status", label: "Статус", type: "string" },
    ],
    defaultData: {
      title: "Согласование",
      text: "{{ ai_text_1.text }}",
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
        { key: "mediaUrl", value: "{{ merge_1.image_url }}" },
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

