export const TELEGRAM_STORY_PERIODS = [
  { value: 21600, label: "6 часов" },
  { value: 43200, label: "12 часов" },
  { value: 86400, label: "24 часа" },
  { value: 172800, label: "48 часов" },
] as const;

export const TELEGRAM_STORY_PERIOD_DEFAULT = 86400;

export const TELEGRAM_STORY_AREA_LIMITS = {
  link: 3,
  location: 10,
  suggested_reaction: 5,
  weather: 3,
} as const;

export const TELEGRAM_STORY_REACTION_EMOJIS = [
  "❤",
  "👍",
  "👎",
  "🔥",
  "🥰",
  "👏",
  "😁",
  "🤔",
  "🤯",
  "😱",
  "🤬",
  "😢",
  "🎉",
  "🤩",
  "🤮",
  "💩",
  "🙏",
  "👌",
  "🕊",
  "🤡",
  "🥱",
  "🥴",
  "😍",
  "🐳",
  "❤‍🔥",
  "🌚",
  "🌭",
  "💯",
  "🤣",
  "⚡",
  "🍌",
  "🏆",
  "💔",
  "🤨",
  "😐",
  "🍓",
  "🍾",
  "💋",
  "🖕",
  "😈",
  "😴",
  "😭",
  "🤓",
  "👻",
  "👨‍💻",
  "👀",
  "🎃",
  "🙈",
  "😇",
  "😨",
  "🤝",
  "✍",
  "🤗",
  "🫡",
  "🎅",
  "🎄",
  "☃",
  "💅",
  "🤪",
  "🗿",
  "🆒",
  "💘",
  "🙉",
  "🦄",
  "😘",
  "💊",
  "🙊",
  "😎",
  "👾",
  "🤷‍♂",
  "🤷",
  "🤷‍♀",
  "😡",
] as const;

export const TELEGRAM_STORY_WEATHER_EMOJIS = ["☀️", "🌤", "⛅️", "🌥", "☁️", "🌧", "⛈", "🌩", "❄️"] as const;

export type TelegramStoryAreaKind = "link" | "location" | "suggested_reaction" | "weather";

export type TelegramStoryAreaPosition = {
  x_percentage: number;
  y_percentage: number;
  width_percentage: number;
  height_percentage: number;
  rotation_angle: number;
  corner_radius_percentage: number;
};

export type TelegramStoryLocationAddress = {
  country_code?: string;
  state?: string;
  city?: string;
  street?: string;
};

export type TelegramStoryArea = {
  id?: string;
  kind: TelegramStoryAreaKind;
  position: TelegramStoryAreaPosition;
  url?: string;
  latitude?: number;
  longitude?: number;
  address?: TelegramStoryLocationAddress;
  reaction_emoji?: string;
  reaction_dark?: boolean;
  reaction_flipped?: boolean;
  temperature?: number;
  weather_emoji?: string;
  background_color?: number;
};

export type TelegramStorySettings = {
  active_period?: number;
  post_to_chat_page?: boolean;
  protect_content?: boolean;
  areas?: TelegramStoryArea[];
};

export function createStoryAreaId() {
  return `area_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultStoryAreaPosition(
  kind: TelegramStoryAreaKind,
  index: number,
): TelegramStoryAreaPosition {
  if (kind === "link" && index === 0) {
    return {
      x_percentage: 18,
      y_percentage: 78,
      width_percentage: 64,
      height_percentage: 10,
      rotation_angle: 0,
      corner_radius_percentage: 14,
    };
  }
  const row = index % 3;
  const col = Math.floor(index / 3);
  const baseY = 12 + col * 22;
  const baseX = 8 + row * 28;
  const sizes: Record<TelegramStoryAreaKind, { w: number; h: number }> = {
    link: { w: 64, h: 10 },
    location: { w: 40, h: 14 },
    suggested_reaction: { w: 16, h: 16 },
    weather: { w: 32, h: 14 },
  };
  const { w, h } = sizes[kind];
  return {
    x_percentage: Math.min(Math.max(baseX, 2), 100 - w - 2),
    y_percentage: Math.min(Math.max(baseY, 2), 100 - h - 2),
    width_percentage: w,
    height_percentage: h,
    rotation_angle: 0,
    corner_radius_percentage: 8,
  };
}

export function createDefaultStoryArea(kind: TelegramStoryAreaKind, index: number): TelegramStoryArea {
  const base: TelegramStoryArea = {
    id: createStoryAreaId(),
    kind,
    position: defaultStoryAreaPosition(kind, index),
  };
  switch (kind) {
    case "link":
      return { ...base, url: "" };
    case "location":
      return {
        ...base,
        latitude: 55.7558,
        longitude: 37.6173,
        address: { country_code: "RU", city: "Москва" },
      };
    case "suggested_reaction":
      return { ...base, reaction_emoji: "❤" };
    case "weather":
      return {
        ...base,
        temperature: 20,
        weather_emoji: "☀️",
        background_color: 0xcc1e1e1e,
      };
    default:
      return base;
  }
}

export function storyAreaKindLabel(kind: TelegramStoryAreaKind): string {
  switch (kind) {
    case "link":
      return "Ссылка";
    case "location":
      return "Геометка";
    case "suggested_reaction":
      return "Реакция";
    case "weather":
      return "Погода";
    default:
      return kind;
  }
}

export function countStoryAreasByKind(areas: TelegramStoryArea[]) {
  return areas.reduce(
    (acc, area) => {
      acc[area.kind] = (acc[area.kind] ?? 0) + 1;
      return acc;
    },
    {} as Partial<Record<TelegramStoryAreaKind, number>>,
  );
}

export function canAddStoryAreaKind(areas: TelegramStoryArea[], kind: TelegramStoryAreaKind) {
  const counts = countStoryAreasByKind(areas);
  return (counts[kind] ?? 0) < TELEGRAM_STORY_AREA_LIMITS[kind];
}

export function normalizeStorySettings(input?: TelegramStorySettings | null): TelegramStorySettings {
  return {
    active_period: input?.active_period ?? TELEGRAM_STORY_PERIOD_DEFAULT,
    post_to_chat_page: Boolean(input?.post_to_chat_page),
    protect_content: Boolean(input?.protect_content),
    areas: (input?.areas ?? []).map((area) => ({
      ...area,
      id: area.id || createStoryAreaId(),
      position: {
        ...area.position,
        corner_radius_percentage: area.position.corner_radius_percentage ?? 8,
        rotation_angle: area.position.rotation_angle ?? 0,
      },
    })),
  };
}
