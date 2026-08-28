"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BellOff,
  CalendarClock,
  Briefcase,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  FileImage,
  GripVertical,
  Layers2,
  Loader2,
  MapPin,
  MessageCircle,
  Monitor,
  Pin,
  Plus,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { PostStatsPanel } from "@/components/analytics/PostStatsPanel";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ChannelAvatar } from "@/components/channels/ChannelAvatar";
import { FileThumbnail } from "@/components/files/FileThumbnail";
import { PageHeader } from "@/components/layout/PageHeader";
import { PostChannelPreview } from "@/components/posts/PostChannelPreview";
import { RichTextEditor, normalizeTelegramHTMLString } from "@/components/posts/RichTextEditor";
import { StoryAreaEditor } from "@/components/posts/StoryAreaEditor";
import {
  ApiError,
  fetchChannels,
  fetchMe,
  fetchWorkspaceMembers,
  type ChannelListItem,
  type WorkspaceMember,
  type ChannelProvider,
  type PublishCapabilities,
} from "@/lib/api";
import { channelDisplayName } from "@/lib/channelPresentation";
import { composePostText } from "@/lib/generation-api";
import {
  getFileVideoDimensions,
  isVideoMime as isVideoMimeFile,
  probeVideoMetadata,
} from "@/lib/file-media";
import { getCachedFileMediaUrl } from "@/lib/file-media-cache";
import {
  listFiles,
  uploadFile,
  downloadFile,
  type WorkspaceFile,
} from "@/lib/files-api";
import {
  approvePost,
  commentPost,
  createPost,
  deleteTelegramStory,
  fetchPost,
  fetchPostApprovalEvents,
  publishPost,
  rejectPost,
  schedulePost,
  syncTelegramStory,
  updatePost,
  type Post,
  type PostApprovalEvent,
  type PostContent,
  type PostSaveInput,
  type PostSettings,
  type PostTargetSettings,
  type TelegramButton,
  type TelegramRichBlock,
} from "@/lib/posts-api";
import { normalizeStorySettings, type TelegramStorySettings } from "@/lib/telegram-story";
import { usePinnedElement } from "@/lib/usePinnedElement";
import { cn } from "@/lib/utils";

const PROVIDER_LABEL: Record<ChannelProvider, string> = {
  telegram: "Telegram",
  vk: "VK",
  ok: "Одноклассники",
  max: "MAX",
  rutube: "Rutube",
  dzen: "Дзен",
  youtube: "YouTube",
  photochka: "Photochka",
};

const PROVIDER_COLOR: Record<ChannelProvider, string> = {
  telegram: "#2aabee",
  vk: "#2787f5",
  ok: "#ee8208",
  max: "#7b61ff",
  rutube: "#100943",
  dzen: "#111111",
  youtube: "#ef4444",
  photochka: "#7C3AED",
};

const STATUS_LABEL: Record<Post["status"], string> = {
  draft: "Черновик",
  pending_approval: "На согласовании",
  scheduled: "Запланирован",
  publishing: "Публикуется",
  published: "Опубликован",
  failed: "Ошибка",
  canceled: "Отменён",
};

const APPROVAL_ACTION_LABEL: Record<PostApprovalEvent["action"], string> = {
  submit: "Отправлено на согласование",
  approve: "Одобрено",
  reject: "Вернули на доработку",
  comment: "Комментарий",
};

const HASHTAG_SETS = [
  { name: "SMM", value: "#smm #маркетинг #контент #соцсети #продвижение" },
  { name: "Запуск", value: "#запуск #новинка #анонс #скоро #новость" },
];

type Override = { detached: boolean; html: string; plain: string };
const TELEGRAM_CIRCLE_LABEL = "Кружок Telegram";

type SelectedMedia = { file: WorkspaceFile; alt: string };
type ArticleBlock = TelegramRichBlock;
type Timing = "draft" | "now" | "schedule";
type ButtonAction = "url" | "callback_data" | "copy_text" | "web_app_url";
type EditableButton = TelegramButton & { action: ButtonAction; value: string };

const emptyButton = (): EditableButton => ({
  text: "",
  style: "default",
  action: "url",
  value: "",
});

const TELEGRAM_CAPTION_LIMIT = 1024;
const MAX_BUTTONS_PER_ROW = 3;
const MAX_BUTTON_ROWS = 30;
const MAX_BUTTONS_TOTAL = 210;

type MaxEditableButton = { text: string; url: string };

const emptyMaxButton = (): MaxEditableButton => ({ text: "", url: "" });

function channelTextLimit(
  channel: { provider: string; publish_capabilities?: { max_text_length?: number } },
  mediaCount: number,
  telegramMediaLayout: "separate" | "caption",
) {
  if (
    channel.provider === "telegram" &&
    mediaCount > 0 &&
    telegramMediaLayout === "caption"
  ) {
    return TELEGRAM_CAPTION_LIMIT;
  }
  return channel.publish_capabilities?.max_text_length || 4096;
}

function htmlToPlain(html: string) {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, "");
  const node = document.createElement("div");
  node.innerHTML = html;
  return (node.innerText || node.textContent || "").trim();
}

type PostKind = "post" | "story" | "short_video" | "video" | "shorts";

function formatToPostKind(format: PostContent["format"]): PostKind {
  if (format === "story") return "story";
  if (format === "short_video") return "short_video";
  if (format === "video") return "video";
  if (format === "shorts") return "shorts";
  return "post";
}

/** YouTube-only formats break Telegram/MAX bubble layout in the side preview. */
function previewFormatForChannel(
  channel: ChannelListItem,
  format: PostContent["format"],
): PostContent["format"] {
  if (channel.provider === "youtube") return format;
  if (format === "video" || format === "shorts") return "message";
  return format;
}

const YOUTUBE_SHORTS_MAX_SECONDS = 60;

function fileDurationSeconds(file: WorkspaceFile): number | null {
  const duration = file.media_metadata?.duration_seconds;
  return typeof duration === "number" && duration > 0 ? duration : null;
}

async function probeWorkspaceFileVideoMetadata(file: WorkspaceFile): Promise<WorkspaceFile> {
  if (!isVideoMimeFile(file.mime_type, file.name) || getFileVideoDimensions(file)) {
    return file;
  }
  try {
    const url = await getCachedFileMediaUrl(file.id, "preview");
    const response = await fetch(url);
    if (!response.ok) return file;
    const blob = await response.blob();
    const meta = await probeVideoMetadata(blob, file.mime_type);
    if (!meta.width && !meta.height && !meta.durationSeconds) return file;
    return {
      ...file,
      media_metadata: {
        ...file.media_metadata,
        ...(meta.durationSeconds ? { duration_seconds: meta.durationSeconds } : {}),
        ...(meta.width ? { width: meta.width } : {}),
        ...(meta.height ? { height: meta.height } : {}),
      },
    };
  } catch {
    return file;
  }
}

function plainToEditorHTML(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

function isVideoMime(mime: string) {
  return mime.toLowerCase().startsWith("video/");
}

function isTelegramBusinessChannel(channel: {
  provider: string;
  chat_type?: string;
  metadata?: { business_user_id?: string };
}) {
  return (
    channel.provider === "telegram" &&
    (channel.chat_type === "business" || Boolean(channel.metadata?.business_user_id?.trim()))
  );
}

function channelProviderSubtitle(
  channel: ChannelListItem,
  postKind: PostKind,
): string {
  if (postKind === "story" && isTelegramBusinessChannel(channel)) {
    const bot = channel.bot_username?.trim();
    const botLabel = bot ? (bot.startsWith("@") ? bot : `@${bot}`) : null;
    return botLabel
      ? `Telegram — бизнес аккаунт (${botLabel})`
      : "Telegram — бизнес аккаунт";
  }
  return PROVIDER_LABEL[channel.provider];
}

function channelSupportsPostKind(
  channel: { status: string; publish_capabilities?: PublishCapabilities },
  kind: PostKind,
): boolean {
  if (channel.status !== "active") return false;
  const caps = channel.publish_capabilities;
  const formats = caps?.formats ?? [];
  if (kind === "story") {
    return formats.includes("story") && Boolean(caps?.text);
  }
  if (kind === "short_video") {
    return formats.includes("short_video");
  }
  if (kind === "video") {
    return formats.includes("video");
  }
  if (kind === "shorts") {
    return formats.includes("shorts");
  }
  if (formats.length === 1 && formats[0] === "story") {
    return false;
  }
  return Boolean(caps?.text);
}

function channelUnavailableReason(
  channel: ChannelListItem,
  postKind: PostKind,
): string | null {
  if (channelSupportsPostKind(channel, postKind)) {
    return null;
  }

  if (channel.status === "needs_reconnect") {
    return "Канал требует переподключения — обновите доступ на странице «Каналы».";
  }
  if (channel.status === "disabled") {
    return "Канал отключён. Включите его на странице «Каналы», чтобы снова публиковать.";
  }
  if (channel.status !== "active") {
    return "Канал сейчас недоступен для публикации.";
  }

  const caps = channel.publish_capabilities;
  const formats = caps?.formats ?? [];
  const provider = PROVIDER_LABEL[channel.provider];

  if (postKind === "story") {
    if (!formats.includes("story")) {
      if (channel.provider === "telegram") {
        return "Обычный Telegram-канал или группа не публикует Stories. Подключите Telegram Business в разделе «Каналы».";
      }
      return `${provider} не поддерживает формат «История». Выберите тип «Пост» или другой канал.`;
    }
    return `${provider} не поддерживает этот формат публикации.`;
  }

  if (postKind === "short_video") {
    if (!formats.includes("short_video")) {
      return `${provider} не поддерживает «${TELEGRAM_CIRCLE_LABEL}». Выберите Telegram или другой подходящий канал.`;
    }
    return `${provider} не поддерживает этот формат публикации.`;
  }

  if (postKind === "video") {
    if (!formats.includes("video")) {
      return `${provider} не поддерживает формат «Видео». Выберите YouTube или другой подходящий канал.`;
    }
    return `${provider} не поддерживает этот формат публикации.`;
  }

  if (postKind === "shorts") {
    if (!formats.includes("shorts")) {
      return `${provider} не поддерживает YouTube Shorts. Выберите YouTube-канал.`;
    }
    return `${provider} не поддерживает этот формат публикации.`;
  }

  if (isTelegramBusinessChannel(channel)) {
    return "Telegram Business предназначен только для Stories. Для обычного поста выберите канал, группу или другую сеть.";
  }

  if (formats.length === 1 && formats[0] === "story") {
    return `${provider} поддерживает только Stories. Выберите тип «История» или другой канал.`;
  }

  if (!caps?.text) {
    if (channel.provider === "youtube") {
      return "YouTube принимает только видео. Выберите тип «Видео» или «Shorts» для публикации на YouTube.";
    }
    if (formats.includes("wall_post")) {
      return `${provider} принимает только посты на стену. Для этого типа поста нужен другой канал.`;
    }
    if (formats.includes("video") && !formats.includes("message")) {
      return `${provider} принимает только видео. Выберите тип «Видео».`;
    }
    return `${provider} не поддерживает обычный пост с текстом и медиа. Выберите другой тип публикации.`;
  }

  return `${provider} не поддерживает выбранный тип публикации.`;
}

const TELEGRAM_BUSINESS_HINT =
  "Telegram Business — личный или бизнес-профиль, подключённый через бота Postilka. Он публикует только Stories (истории). Обычные посты в канал или группу отправляйте через обычный Telegram-канал.";

function ChannelHintIcon({
  label,
  tone = "warning",
  children,
}: {
  label: string;
  tone?: "warning" | "info";
  children: React.ReactNode;
}) {
  return (
    <span
      tabIndex={0}
      className="group/hint relative inline-flex shrink-0 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute right-0 top-full z-30 mt-1.5 hidden w-[min(calc(100vw-2rem),17rem)] rounded-xl border px-3 py-2.5 text-left text-[11px] font-normal normal-case leading-relaxed shadow-[0_10px_28px_rgba(15,23,42,0.14)] group-hover/hint:block group-focus-within/hint:block",
          tone === "warning"
            ? "border-amber-200/90 bg-white text-zinc-700"
            : "border-accent/20 bg-white text-zinc-700",
        )}
      >
        {label}
      </span>
    </span>
  );
}

function buttonToEditable(button: TelegramButton): EditableButton {
  const action = button.url
    ? "url"
    : button.callback_data
      ? "callback_data"
      : button.copy_text
        ? "copy_text"
        : "web_app_url";
  return {
    ...button,
    action,
    value:
      button.url ??
      button.callback_data ??
      button.copy_text ??
      button.web_app_url ??
      "",
  };
}

function buttonToAPI(button: EditableButton): TelegramButton {
  return {
    text: button.text.trim(),
    style: button.style,
    icon_custom_emoji_id: button.icon_custom_emoji_id?.trim() || undefined,
    [button.action]: button.value.trim(),
  };
}

function errorText(error: unknown, fallback: string) {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

function Card({
  title,
  action,
  children,
  className,
  accent,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-surface p-4 shadow-sm",
        accent
          ? "border-2 border-accent/30 bg-gradient-to-br from-accent/[0.07] via-surface to-violet-50/50 shadow-md ring-1 ring-accent/10"
          : "border-border",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.08em]",
            accent ? "text-accent" : "text-muted",
          )}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SmallButton({
  children,
  active,
  disabled,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-accent bg-accent/10 text-accent"
          : "border-border bg-white text-zinc-700 hover:bg-zinc-50",
        disabled && "cursor-not-allowed opacity-45",
      )}
    >
      {children}
    </button>
  );
}

function ArticleBlockPreview({ block }: { block: ArticleBlock }) {
  if (block.type === "heading") {
    const sizes = ["text-xl", "text-lg", "text-base", "text-sm", "text-xs", "text-[11px]"];
    return <h4 className={cn("my-2 font-bold", sizes[(block.size ?? 2) - 1])}>{block.text}</h4>;
  }
  if (block.type === "quote" || block.type === "pullquote") {
    return (
      <blockquote
        className={cn(
          "my-2 border-l-2 border-accent pl-2 italic",
          block.type === "pullquote" && "border-y border-l-0 py-2 text-center text-base",
        )}
      >
        <p>{block.text}</p>
        {block.credit && <cite className="mt-1 block text-[10px] not-italic text-muted">— {block.credit}</cite>}
      </blockquote>
    );
  }
  if (block.type === "code") {
    return (
      <div className="my-2">
        {block.language && <p className="text-[9px] uppercase text-muted">{block.language}</p>}
        <pre className="overflow-x-auto rounded bg-zinc-100 p-2 font-mono text-xs">{block.text}</pre>
      </div>
    );
  }
  if (block.type === "footer") {
    return <footer className="mt-3 border-t border-border pt-2 text-[11px] text-muted">{block.text}</footer>;
  }
  if (block.type === "divider") return <hr className="my-3 border-border" />;
  if (block.type === "list") {
    return (
      <ul className="my-2 list-disc space-y-1 pl-5">
        {(block.items ?? []).map((item, index) => (
          <li key={index}>
            {(item.blocks ?? []).map((child, childIndex) => (
              <ArticleBlockPreview key={childIndex} block={child} />
            ))}
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "details") {
    return (
      <details open={block.is_open} className="my-2 rounded border border-border p-2">
        <summary className="cursor-default font-semibold">{block.summary}</summary>
        <div className="mt-2">
          {(block.blocks ?? []).map((child, index) => (
            <ArticleBlockPreview key={index} block={child} />
          ))}
        </div>
      </details>
    );
  }
  if (block.type === "table") {
    return (
      <div className="my-2 overflow-x-auto">
        <table className={cn("w-full text-left text-[10px]", block.bordered && "border-collapse")}>
          <tbody>
            {(block.rows ?? []).map((row, rowIndex) => (
              <tr key={rowIndex} className={cn(block.striped && rowIndex % 2 === 1 && "bg-zinc-50")}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className={cn("p-1.5 align-top", block.bordered && "border border-border")}>
                    {cell.text}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "mathematical_expression") {
    return (
      <div className="my-2 overflow-x-auto rounded bg-zinc-50 p-2 text-center font-mono">
        {block.expression}
      </div>
    );
  }
  return <p className="my-2 whitespace-pre-wrap">{block.text}</p>;
}

function ArticleEditor({
  title,
  blocks,
  onTitleChange,
  onChange,
}: {
  title: string;
  blocks: ArticleBlock[];
  onTitleChange: (value: string) => void;
  onChange: (blocks: ArticleBlock[]) => void;
}) {
  const blockTypes: { type: ArticleBlock["type"]; label: string }[] = [
    { type: "paragraph", label: "Абзац" },
    { type: "heading", label: "Заголовок" },
    { type: "code", label: "Код" },
    { type: "quote", label: "Цитата" },
    { type: "footer", label: "Подвал" },
    { type: "divider", label: "Разделитель" },
    { type: "list", label: "Список" },
    { type: "pullquote", label: "Выносная цитата" },
    { type: "details", label: "Детали" },
    { type: "table", label: "Таблица" },
    { type: "mathematical_expression", label: "Формула" },
  ];

  function add(type: ArticleBlock["type"]) {
    let block: ArticleBlock = { type, text: "" };
    if (type === "heading") block = { type, text: "", size: 2 };
    if (type === "code") block = { type, text: "", language: "" };
    if (type === "quote" || type === "pullquote") block = { type, text: "", credit: "" };
    if (type === "divider") block = { type };
    if (type === "list") {
      block = { type, items: [{ blocks: [{ type: "paragraph", text: "" }] }] };
    }
    if (type === "details") {
      block = {
        type,
        summary: "",
        is_open: false,
        blocks: [{ type: "paragraph", text: "" }],
      };
    }
    if (type === "table") {
      block = {
        type,
        rows: [
          [{ text: "" }, { text: "" }],
          [{ text: "" }, { text: "" }],
        ],
        bordered: true,
        striped: false,
      };
    }
    if (type === "mathematical_expression") block = { type, expression: "" };
    onChange([...blocks, block]);
  }

  function update(index: number, patch: Partial<ArticleBlock>) {
    const next = [...blocks];
    next[index] = { ...next[index]!, ...patch } as ArticleBlock;
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-600">Заголовок статьи</span>
        <input
          value={title}
          maxLength={256}
          onChange={(event) => onTitleChange(event.target.value)}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          placeholder="Название rich message (будет заголовком)"
        />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {blockTypes.map((item) => (
          <SmallButton key={item.type} onClick={() => add(item.type)}>
            <Plus className="h-3.5 w-3.5" />
            {item.label}
          </SmallButton>
        ))}
      </div>
      <p className="text-xs text-muted">
        Заголовок сверху backend преобразует в heading. До 100 блоков, включая вложенные элементы.
      </p>
      <div className="space-y-2">
        {blocks.map((block, index) => (
          <div key={`${block.type}-${index}`} className="rounded-lg border border-border bg-zinc-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-600">
                {blockTypes.find((item) => item.type === block.type)?.label}
              </span>
              {block.type === "heading" && (
                <select
                  value={block.size ?? 2}
                  onChange={(event) => update(index, { size: Number(event.target.value) })}
                  className="rounded border border-border bg-white px-2 py-1 text-xs"
                >
                  {[1, 2, 3, 4, 5, 6].map((size) => (
                    <option key={size} value={size}>
                      H{size}
                    </option>
                  ))}
                </select>
              )}
              <div className="ml-auto flex">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...blocks];
                    [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                    onChange(next);
                  }}
                  className="p-1 text-muted disabled:opacity-30"
                  aria-label="Выше"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={index === blocks.length - 1}
                  onClick={() => {
                    const next = [...blocks];
                    [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                    onChange(next);
                  }}
                  className="p-1 text-muted disabled:opacity-30"
                  aria-label="Ниже"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(blocks.filter((_, itemIndex) => itemIndex !== index))}
                  className="p-1 text-red-500"
                  aria-label="Удалить блок"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {block.type === "divider" ? (
              <p className="text-xs text-muted">Горизонтальный разделитель без содержимого.</p>
            ) : block.type === "list" ? (
              <label className="block">
                <span className="mb-1 block text-xs text-muted">Один пункт на строку</span>
                <textarea
                  value={(block.items ?? [])
                    .map((item) => item.blocks[0]?.text ?? "")
                    .join("\n")}
                  onChange={(event) =>
                    update(index, {
                      items: event.target.value.split("\n").map((text) => ({
                        blocks: [{ type: "paragraph", text }],
                      })),
                    })
                  }
                  rows={5}
                  className="w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm"
                  placeholder={"Первый пункт\nВторой пункт"}
                />
              </label>
            ) : block.type === "details" ? (
              <div className="space-y-2">
                <input
                  value={block.summary ?? ""}
                  onChange={(event) => update(index, { summary: event.target.value })}
                  placeholder="Краткий заголовок"
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                />
                <textarea
                  value={block.blocks?.[0]?.text ?? ""}
                  onChange={(event) =>
                    update(index, {
                      blocks: [{ type: "paragraph", text: event.target.value }],
                    })
                  }
                  rows={4}
                  className="w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm"
                  placeholder="Раскрываемое содержимое"
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={Boolean(block.is_open)}
                    onChange={(event) => update(index, { is_open: event.target.checked })}
                  />
                  Открыто по умолчанию
                </label>
              </div>
            ) : block.type === "table" ? (
              <div className="space-y-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">
                    Строки — с новой строки, ячейки — через Tab
                  </span>
                  <textarea
                    value={(block.rows ?? [])
                      .map((row) => row.map((cell) => cell.text).join("\t"))
                      .join("\n")}
                    onChange={(event) =>
                      update(index, {
                        rows: event.target.value.split("\n").map((row) =>
                          row.split("\t").map((text) => ({
                            text,
                            align: "left" as const,
                            valign: "top" as const,
                          })),
                        ),
                      })
                    }
                    rows={5}
                    className="w-full resize-y rounded-md border border-border bg-white px-3 py-2 font-mono text-xs"
                    placeholder={"Товар\tЦена\nПлан Pro\t990 ₽"}
                  />
                </label>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(block.bordered)}
                      onChange={(event) => update(index, { bordered: event.target.checked })}
                    />
                    Границы
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(block.striped)}
                      onChange={(event) => update(index, { striped: event.target.checked })}
                    />
                    Чередование строк
                  </label>
                </div>
              </div>
            ) : block.type === "mathematical_expression" ? (
              <textarea
                value={block.expression ?? ""}
                onChange={(event) => update(index, { expression: event.target.value })}
                rows={3}
                className="w-full resize-y rounded-md border border-border bg-white px-3 py-2 font-mono text-sm"
                placeholder="E = mc^2"
              />
            ) : (
              <div className="space-y-2">
                <textarea
                  value={block.text ?? ""}
                  onChange={(event) => update(index, { text: event.target.value })}
                  rows={block.type === "code" ? 5 : 3}
                  className={cn(
                    "w-full resize-y rounded-md border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent",
                    block.type === "code" && "font-mono",
                  )}
                  placeholder={block.type === "footer" ? "Текст подвала" : "Текст блока"}
                />
                {block.type === "code" && (
                  <input
                    value={block.language ?? ""}
                    maxLength={64}
                    onChange={(event) => update(index, { language: event.target.value })}
                    placeholder="Язык кода, например go"
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-xs"
                  />
                )}
                {(block.type === "quote" || block.type === "pullquote") && (
                  <input
                    value={block.credit ?? ""}
                    maxLength={256}
                    onChange={(event) => update(index, { credit: event.target.value })}
                    placeholder="Автор / источник цитаты"
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-xs"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ButtonBuilder({
  rows,
  styled,
  customEmoji,
  maxButtons,
  onChange,
}: {
  rows: EditableButton[][];
  styled: boolean;
  customEmoji: boolean;
  maxButtons: number;
  onChange: (rows: EditableButton[][]) => void;
}) {
  const count = rows.flat().length;

  function update(rowIndex: number, buttonIndex: number, patch: Partial<EditableButton>) {
    const next = rows.map((row) => row.map((button) => ({ ...button })));
    next[rowIndex]![buttonIndex] = { ...next[rowIndex]![buttonIndex]!, ...patch };
    onChange(next);
  }

  return (
    <Card
      title="Кнопки Telegram"
      action={
        <SmallButton
          disabled={count >= maxButtons}
          onClick={() => onChange([...rows, [emptyButton()]])}
        >
          <Plus className="h-3.5 w-3.5" />
          Строка
        </SmallButton>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Добавьте строку с inline-кнопками. До 8 кнопок в строке.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="rounded-lg border border-border bg-zinc-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-600">Строка {rowIndex + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={rowIndex === 0}
                    onClick={() => {
                      const next = [...rows];
                      [next[rowIndex - 1], next[rowIndex]] = [next[rowIndex]!, next[rowIndex - 1]!];
                      onChange(next);
                    }}
                    className="p-1 text-muted disabled:opacity-30"
                    aria-label="Строку выше"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={rowIndex === rows.length - 1}
                    onClick={() => {
                      const next = [...rows];
                      [next[rowIndex], next[rowIndex + 1]] = [next[rowIndex + 1]!, next[rowIndex]!];
                      onChange(next);
                    }}
                    className="p-1 text-muted disabled:opacity-30"
                    aria-label="Строку ниже"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(rows.filter((_, index) => index !== rowIndex))}
                    className="p-1 text-red-500"
                    aria-label="Удалить строку"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {row.map((button, buttonIndex) => (
                  <div
                    key={buttonIndex}
                    className="grid gap-2 lg:grid-cols-[1fr_8rem_1fr_7rem_10rem_auto]"
                  >
                    <input
                      value={button.text}
                      maxLength={64}
                      onChange={(event) => update(rowIndex, buttonIndex, { text: event.target.value })}
                      placeholder="Текст кнопки"
                      className="min-w-0 rounded-md border border-border bg-white px-2 py-1.5 text-xs"
                    />
                    <select
                      value={button.action}
                      onChange={(event) =>
                        update(rowIndex, buttonIndex, {
                          action: event.target.value as ButtonAction,
                          value: "",
                        })
                      }
                      className="rounded-md border border-border bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="url">URL</option>
                      <option value="callback_data">Callback</option>
                      <option value="copy_text">Копировать</option>
                      <option value="web_app_url">Web App</option>
                    </select>
                    <input
                      value={button.value}
                      onChange={(event) => update(rowIndex, buttonIndex, { value: event.target.value })}
                      placeholder={button.action.includes("url") ? "https://…" : "Значение"}
                      className="min-w-0 rounded-md border border-border bg-white px-2 py-1.5 text-xs"
                    />
                    <select
                      value={button.style ?? "default"}
                      disabled={!styled}
                      title={styled ? "Стиль кнопки" : "Стили не поддерживаются каналом"}
                      onChange={(event) =>
                        update(rowIndex, buttonIndex, {
                          style: event.target.value as EditableButton["style"],
                        })
                      }
                      className="rounded-md border border-border bg-white px-2 py-1.5 text-xs disabled:opacity-50"
                    >
                      <option value="default">Обычная</option>
                      <option value="primary">Основная</option>
                      <option value="success">Успех</option>
                      <option value="danger">Опасная</option>
                    </select>
                    <input
                      value={button.icon_custom_emoji_id ?? ""}
                      disabled={!customEmoji}
                      onChange={(event) =>
                        update(rowIndex, buttonIndex, {
                          icon_custom_emoji_id: event.target.value,
                        })
                      }
                      placeholder="Custom emoji ID"
                      title={
                        customEmoji
                          ? "Telegram custom emoji ID для иконки"
                          : "Custom emoji не поддерживается выбранным Telegram-каналом"
                      }
                      className="min-w-0 rounded-md border border-border bg-white px-2 py-1.5 text-xs disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = rows.map((item) => [...item]);
                        next[rowIndex] = next[rowIndex]!.filter((_, index) => index !== buttonIndex);
                        if (next[rowIndex]!.length === 0) next.splice(rowIndex, 1);
                        onChange(next);
                      }}
                      className="p-1.5 text-red-500"
                      aria-label="Удалить кнопку"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {row.length < 8 && count < maxButtons && (
                <button
                  type="button"
                  onClick={() => {
                    const next = rows.map((item) => [...item]);
                    next[rowIndex] = [...next[rowIndex]!, emptyButton()];
                    onChange(next);
                  }}
                  className="mt-2 text-xs font-medium text-accent hover:underline"
                >
                  + Кнопка в строку
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">
        {count}/{maxButtons}. У каждой кнопки сохраняется ровно одно действие. Иконка принимает
        числовой Telegram custom emoji ID.
      </p>
    </Card>
  );
}

function MaxButtonBuilder({
  rows,
  maxButtons,
  onChange,
}: {
  rows: MaxEditableButton[][];
  maxButtons: number;
  onChange: (rows: MaxEditableButton[][]) => void;
}) {
  const count = rows.flat().length;

  function update(rowIndex: number, buttonIndex: number, patch: Partial<MaxEditableButton>) {
    const next = rows.map((row) => row.map((button) => ({ ...button })));
    next[rowIndex]![buttonIndex] = { ...next[rowIndex]![buttonIndex]!, ...patch };
    onChange(next);
  }

  return (
    <Card
      title="Кнопки MAX"
      action={
        <SmallButton
          disabled={count >= maxButtons || rows.length >= MAX_BUTTON_ROWS}
          onClick={() => onChange([...rows, [emptyMaxButton()]])}
        >
          <Plus className="h-3.5 w-3.5" />
          Строка
        </SmallButton>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          Добавьте кнопки-ссылки для MAX. До {MAX_BUTTONS_PER_ROW} кнопок в строке, не более{" "}
          {maxButtons} всего. Клавиатура считается одним вложением вместе с медиа (лимит 12).
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="rounded-lg border border-border bg-zinc-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-600">Строка {rowIndex + 1}</span>
                <button
                  type="button"
                  onClick={() => onChange(rows.filter((_, index) => index !== rowIndex))}
                  className="p-1 text-red-500"
                  aria-label="Удалить строку"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {row.map((button, buttonIndex) => (
                  <div key={buttonIndex} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      value={button.text}
                      maxLength={128}
                      onChange={(event) => update(rowIndex, buttonIndex, { text: event.target.value })}
                      placeholder="Текст кнопки"
                      className="min-w-0 rounded-md border border-border bg-white px-2 py-1.5 text-xs"
                    />
                    <input
                      value={button.url}
                      onChange={(event) => update(rowIndex, buttonIndex, { url: event.target.value })}
                      placeholder="https://…"
                      className="min-w-0 rounded-md border border-border bg-white px-2 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = rows.map((item) => [...item]);
                        next[rowIndex] = next[rowIndex]!.filter((_, index) => index !== buttonIndex);
                        if (next[rowIndex]!.length === 0) next.splice(rowIndex, 1);
                        onChange(next);
                      }}
                      className="p-1.5 text-red-500"
                      aria-label="Удалить кнопку"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {row.length < MAX_BUTTONS_PER_ROW && count < maxButtons && (
                <button
                  type="button"
                  onClick={() => {
                    const next = rows.map((item) => [...item]);
                    next[rowIndex] = [...next[rowIndex]!, emptyMaxButton()];
                    onChange(next);
                  }}
                  className="mt-2 text-xs font-medium text-accent hover:underline"
                >
                  + Кнопка в строку
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">
        {count}/{maxButtons}. MAX поддерживает только кнопки-ссылки.
      </p>
    </Card>
  );
}

export function PostComposer({ initialPostId }: { initialPostId?: string } = {}) {
  const router = useRouter();
  const [channels, setChannels] = useState<ChannelListItem[]>([]);
  const [recentFiles, setRecentFiles] = useState<WorkspaceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [html, setHTML] = useState("");
  const [plain, setPlain] = useState("");
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [format, setFormat] = useState<PostContent["format"]>("message");
  const [postKind, setPostKind] = useState<PostKind>("post");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiUseEditorText, setAiUseEditorText] = useState(false);
  const [aiTone, setAiTone] = useState("нейтральный");
  const [aiLength, setAiLength] = useState<"short" | "medium" | "long">("medium");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [articleBlocks, setArticleBlocks] = useState<ArticleBlock[]>([
    { type: "paragraph", text: "" },
  ]);
  const [buttonRows, setButtonRows] = useState<EditableButton[][]>([]);
  const [maxButtonRows, setMaxButtonRows] = useState<MaxEditableButton[][]>([]);
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [mediaPicker, setMediaPicker] = useState(false);
  const [firstComment, setFirstComment] = useState("");
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [linkPreview, setLinkPreview] = useState(true);
  const [telegramPin, setTelegramPin] = useState(false);
  const [telegramSilent, setTelegramSilent] = useState(false);
  const [telegramVideoNote, setTelegramVideoNote] = useState(false);
  const [telegramMediaLayout, setTelegramMediaLayout] = useState<"separate" | "caption">("separate");
  const [telegramCaptionPosition, setTelegramCaptionPosition] = useState<"above" | "below">("below");
  const [telegramMediaOrder, setTelegramMediaOrder] = useState<"media_first" | "text_first">("media_first");
  const [utm, setUTM] = useState({ source: "", medium: "social", campaign: "", shorten: false });
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [needsRevision, setNeedsRevision] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [workspaceRole, setWorkspaceRole] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<Post["status"] | null>(null);
  const [approvalEvents, setApprovalEvents] = useState<PostApprovalEvent[]>([]);
  const [discussionComment, setDiscussionComment] = useState("");
  const [timing, setTiming] = useState<Timing>("draft");
  const [scheduleAt, setScheduleAt] = useState("");
  const [activePreviewTab, setActivePreviewTab] = useState<"preview" | "discussion">("preview");
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const [previewWidth, setPreviewWidth] = useState(380);
  const [dirty, setDirty] = useState(false);
  const [telegramStory, setTelegramStory] = useState<TelegramStorySettings>(() =>
    normalizeStorySettings(),
  );
  const telegramStoryRef = useRef(telegramStory);
  const [storyMediaPreviewUrl, setStoryMediaPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { hostRef, targetRef, anchorRef, pinnedStyle } = usePinnedElement({
    enabled: !loading,
  });

  const markDirty = useCallback(() => setDirty(true), []);

  useEffect(() => {
    telegramStoryRef.current = telegramStory;
  }, [telegramStory]);

  const isAdmin = workspaceRole === "owner" || workspaceRole === "admin";
  const isPendingApproval = currentStatus === "pending_approval";
  const isPublishedStory =
    currentStatus === "published" && (postKind === "story" || format === "story");
  const isViewOnly =
    currentStatus === "scheduled" ||
    currentStatus === "publishing" ||
    (currentStatus === "published" && !isPublishedStory);
  const composerLocked = (isPendingApproval && !isAdmin) || isViewOnly;
  const publishLocked =
    currentStatus === "publishing" ||
    (currentStatus === "published" && !isPublishedStory);

  const loadApprovalEvents = useCallback(async (id: string) => {
    try {
      const data = await fetchPostApprovalEvents(id);
      setApprovalEvents(data.items);
    } catch {
      setApprovalEvents([]);
    }
  }, []);

  const loadWorkspaceMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const data = await fetchWorkspaceMembers();
      setWorkspaceMembers(data.members);
    } catch {
      setWorkspaceMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const approverMembers = useMemo(
    () =>
      workspaceMembers.filter(
        (member) =>
          member.status !== "suspended" &&
          (member.role === "owner" || member.role === "admin"),
      ),
    [workspaceMembers],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [channelData, fileData, meData] = await Promise.all([
        fetchChannels(),
        listFiles("recent"),
        fetchMe(),
      ]);
      setChannels(channelData.items);
      setRecentFiles(fileData.files);
      setWorkspaceRole(meData.active_workspace?.role ?? meData.workspace?.role ?? null);
      setSelectedIds([]);
      setActiveChannelId(null);
    } catch (loadError) {
      setError(errorText(loadError, "Не удалось загрузить композер"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const stored = Number(window.localStorage.getItem("postilka-composer-preview-width"));
    if (Number.isFinite(stored) && stored >= 320) {
      setPreviewWidth(Math.min(stored, Math.min(560, window.innerWidth * 0.45)));
    }
  }, [load]);

  useEffect(() => {
    if (!initialPostId || loading) return;
    let cancelled = false;
    void fetchPost(initialPostId)
      .then((post) => {
        if (!cancelled) openPost(post);
      })
      .catch(() => {
        if (!cancelled) setError("Не удалось загрузить публикацию");
      });
    return () => {
      cancelled = true;
    };
  }, [initialPostId, loading]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (postId) void loadApprovalEvents(postId);
  }, [postId, loadApprovalEvents]);

  useEffect(() => {
    if (postId && activePreviewTab === "discussion") void loadApprovalEvents(postId);
  }, [postId, activePreviewTab, loadApprovalEvents]);

  useEffect(() => {
    if (media.length > 1 && telegramCaptionPosition === "above") {
      setTelegramCaptionPosition("below");
    }
  }, [media.length, telegramCaptionPosition]);

  useEffect(() => {
    if (postKind !== "story" && format !== "story") {
      setStoryMediaPreviewUrl(null);
      return;
    }
    const file = media[0]?.file;
    if (!file || !file.mime_type.startsWith("image/")) {
      setStoryMediaPreviewUrl(null);
      return;
    }
    let cancelled = false;
    void downloadFile(file.id, "inline")
      .then((data) => {
        if (!cancelled) setStoryMediaPreviewUrl(data.url);
      })
      .catch(() => {
        if (!cancelled) setStoryMediaPreviewUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [postKind, format, media]);

  useEffect(() => {
    if (format !== "shorts" && format !== "video") return;
    let cancelled = false;
    for (const item of media) {
      if (!isVideoMime(item.file.mime_type) || getFileVideoDimensions(item.file)) continue;
      void probeWorkspaceFileVideoMetadata(item.file).then((enriched) => {
        if (cancelled || enriched === item.file) return;
        setMedia((current) =>
          current.map((entry) => (entry.file.id === enriched.id ? { ...entry, file: enriched } : entry)),
        );
      });
    }
    return () => {
      cancelled = true;
    };
  }, [format, media]);

  const selectedChannels = useMemo(
    () => channels.filter((channel) => selectedIds.includes(channel.id)),
    [channels, selectedIds],
  );
  const hasStoryChannels = useMemo(
    () => channels.some((channel) => channelSupportsPostKind(channel, "story")),
    [channels],
  );
  const hasVideoChannels = useMemo(
    () => channels.some((channel) => channelSupportsPostKind(channel, "video")),
    [channels],
  );
  const hasShortsChannels = useMemo(
    () => channels.some((channel) => channelSupportsPostKind(channel, "shorts")),
    [channels],
  );
  const activeChannel =
    selectedChannels.find((channel) => channel.id === activeChannelId) ?? selectedChannels[0] ?? null;
  const telegramChannels = selectedChannels.filter((channel) => channel.provider === "telegram");
  const maxChannels = selectedChannels.filter((channel) => channel.provider === "max");
  const currentOverride = activeChannel ? overrides[activeChannel.id] : undefined;
  const previewHTML = currentOverride?.detached ? currentOverride.html : html;
  const previewPlain = currentOverride?.detached ? currentOverride.plain : plain;
  const editorHTML = activeChannelId && currentOverride?.detached ? currentOverride.html : html;
  const editorPlain = activeChannelId && currentOverride?.detached ? currentOverride.plain : plain;
  const detectedURL = previewPlain.match(/https?:\/\/[^\s<]+/)?.[0] ?? "";
  const maxText =
    activeChannel !== null
      ? channelTextLimit(activeChannel, media.length, telegramMediaLayout)
      : selectedChannels.length > 0
        ? Math.min(
            ...selectedChannels.map((channel) =>
              channelTextLimit(channel, media.length, telegramMediaLayout),
            ),
          )
        : 4096;
  const hashtagCount = (previewPlain.match(/#[^\s#]+/g) || []).length;
  const canArticle = telegramChannels.some(
    (channel) => channel.publish_capabilities?.telegram_rich_messages,
  );
  const articleOnlyTelegram =
    (format === "article" || format === "rich_message") &&
    selectedChannels.some((channel) => channel.provider !== "telegram");
  const canTelegramButtons =
    telegramChannels.length > 0 &&
    telegramChannels.every((channel) => channel.publish_capabilities?.inline_buttons);
  const canMaxButtons =
    maxChannels.length > 0 &&
    maxChannels.every((channel) => channel.publish_capabilities?.inline_buttons);
  const maxButtons = canTelegramButtons
    ? Math.min(
        ...telegramChannels.map((channel) => channel.publish_capabilities?.max_buttons || 100),
        100,
      )
    : 100;
  const maxMaxButtons = canMaxButtons
    ? Math.min(
        ...maxChannels.map((channel) => channel.publish_capabilities?.max_buttons || MAX_BUTTONS_TOTAL),
        MAX_BUTTONS_TOTAL,
      )
    : MAX_BUTTONS_TOTAL;
  const noMediaDelivery = selectedChannels.filter(
    (channel) => !channel.publish_capabilities?.composer_media,
  );
  const extrasKind = postKind === "post";
  const showFirstComment =
    extrasKind &&
    selectedChannels.some((channel) => channel.publish_capabilities?.composer_first_comment);
  const showLocation =
    extrasKind &&
    selectedChannels.some((channel) => channel.publish_capabilities?.composer_location);
  const showExtrasCard = showFirstComment || showLocation;
  const noCommentDelivery = selectedChannels.filter(
    (channel) => !channel.publish_capabilities?.composer_first_comment,
  );
  const noLocationDelivery = selectedChannels.filter(
    (channel) => !channel.publish_capabilities?.composer_location,
  );
  const firstCommentHint = [
    selectedChannels.some(
      (channel) => channel.provider === "vk" && channel.publish_capabilities?.composer_first_comment,
    )
      ? "В VK уйдёт комментарием от имени сообщества."
      : null,
    selectedChannels.some(
      (channel) =>
        channel.provider === "telegram" && channel.publish_capabilities?.composer_first_comment,
    )
      ? "В Telegram отправится в привязанную группу обсуждения канала."
      : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
  const locationHint = [
    selectedChannels.some(
      (channel) => channel.provider === "vk" && channel.publish_capabilities?.composer_location,
    )
      ? "В VK координаты прикрепятся к посту."
      : null,
    selectedChannels.some(
      (channel) =>
        channel.provider === "telegram" && channel.publish_capabilities?.composer_location,
    )
      ? "В Telegram геопозиция уйдёт отдельным сообщением."
      : null,
    "Поиск места по названию пока не подключён.",
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");
  const canTelegramPin = telegramChannels.every((channel) => channel.publish_capabilities?.composer_pin);
  const canTelegramSilent = telegramChannels.every(
    (channel) => channel.publish_capabilities?.composer_silent,
  );
  const canTelegramVideoNote = telegramChannels.every(
    (channel) => channel.publish_capabilities?.composer_video_note,
  );
  const singleVideoAttached =
    media.length === 1 && isVideoMime(media[0]!.file.mime_type);
  const telegramVideoCircleActive =
    singleVideoAttached &&
    (telegramVideoNote || postKind === "short_video" || format === "short_video");
  const maxGetsRectangularVideo = telegramVideoCircleActive && maxChannels.length > 0;
  const isYouTubeVideoMode = postKind === "video" || postKind === "shorts";

  function resetNew() {
    if (dirty && !window.confirm("Несохранённые изменения будут потеряны. Продолжить?")) return;
    if (initialPostId) {
      router.push("/posts/new");
      return;
    }
    setPostId(null);
    setSelectedIds([]);
    setActiveChannelId(null);
    setHTML("");
    setPlain("");
    setOverrides({});
    setFormat("message");
    setPostKind("post");
    setArticleTitle("");
    setVideoTitle("");
    setArticleBlocks([{ type: "paragraph", text: "" }]);
    setButtonRows([]);
    setMaxButtonRows([]);
    setMedia([]);
    setTelegramMediaLayout("separate");
    setTelegramCaptionPosition("below");
    setTelegramMediaOrder("media_first");
    setTelegramPin(false);
    setTelegramSilent(false);
    setTelegramVideoNote(false);
    setLinkPreview(true);
    setFirstComment("");
    setLocationName("");
    setLatitude("");
    setLongitude("");
    setUTM({ source: "", medium: "social", campaign: "", shorten: false });
    setApprovalRequired(false);
    setApprovalModalOpen(false);
    setCurrentStatus(null);
    setApprovalEvents([]);
    setDiscussionComment("");
    setTiming("draft");
    setScheduleAt("");
    setError(null);
    setSuccess(null);
    setDirty(false);
  }

  function openPost(post: Post) {
    if (dirty && !window.confirm("Несохранённые изменения будут потеряны. Открыть публикацию?")) return;
    const targetOverrides: Record<string, Override> = {};
    for (const target of post.targets) {
      const targetHTML = target.settings?.content?.text ?? post.content.text;
      targetOverrides[target.channel_id] = {
        detached: Boolean(target.settings?.detached),
        html: targetHTML,
        plain: htmlToPlain(targetHTML),
      };
    }
    const fileMap = new Map(recentFiles.map((file) => [file.id, file]));
    setPostId(post.id);
    setSelectedIds(post.targets.map((target) => target.channel_id));
    setActiveChannelId(post.targets[0]?.channel_id ?? null);
    setHTML(post.content.text || "");
    setPlain(htmlToPlain(post.content.text || ""));
    setOverrides(targetOverrides);
    setFormat(post.content.format || "message");
    setPostKind(formatToPostKind(post.content.format || "message"));
    setArticleTitle(post.content.rich_message?.title ?? "");
    setVideoTitle(post.content.title ?? "");
    setArticleBlocks(
      post.content.rich_message?.blocks?.map((block) => ({ ...block })) ?? [
        { type: "paragraph", text: "" },
      ],
    );
    setButtonRows(
      (post.content.rich_message?.buttons ?? post.content.buttons ?? []).map((row) =>
        row.map(buttonToEditable),
      ),
    );
    setMaxButtonRows(
      (post.settings.max_buttons ?? []).map((row) =>
        row.map((button) => ({ text: button.text, url: button.url ?? "" })),
      ),
    );
    setMedia(
      post.media.map((item) => ({
        file:
          fileMap.get(item.file_id) ?? {
            id: item.file_id,
            workspace_id: post.workspace_id,
            folder_id: null,
            name: `Файл ${item.file_id.slice(0, 8)}`,
            mime_type: "application/octet-stream",
            size: 0,
            created_at: post.created_at,
            updated_at: post.updated_at,
          },
        alt: item.settings?.alt_text ?? "",
      })),
    );
    setFirstComment(post.settings.first_comment ?? "");
    setLocationName(post.settings.location?.name ?? "");
    setLatitude(post.settings.location ? String(post.settings.location.latitude) : "");
    setLongitude(post.settings.location ? String(post.settings.location.longitude) : "");
    setLinkPreview(post.settings.link?.preview_enabled ?? true);
    setTelegramPin(Boolean(post.settings.telegram_pin));
    setTelegramSilent(Boolean(post.settings.telegram_silent));
    setTelegramVideoNote(Boolean(post.settings.telegram_video_note));
    setTelegramMediaLayout(post.settings.telegram_media_layout === "caption" ? "caption" : "separate");
    setTelegramCaptionPosition(
      post.settings.telegram_caption_position === "above" ? "above" : "below",
    );
    setTelegramMediaOrder(
      post.settings.telegram_media_order === "text_first" ? "text_first" : "media_first",
    );
    setTelegramStory(normalizeStorySettings(post.settings.telegram_story));
    const storedUTM = post.targets[0]?.settings?.settings?.utm;
    setUTM({
      source: storedUTM?.source ?? "",
      medium: storedUTM?.medium ?? "social",
      campaign: storedUTM?.campaign ?? "",
      shorten: storedUTM?.shorten ?? false,
    });
    setApprovalRequired(Boolean(post.settings.approval_required));
    setNeedsRevision(Boolean(post.needs_revision));
    setCurrentStatus(post.status);
    void loadApprovalEvents(post.id);
    setTiming("draft");
    setScheduleAt(post.due_at ? post.due_at.slice(0, 16) : "");
    setError(null);
    setSuccess(null);
    setDirty(false);
  }

  function toggleChannel(channel: ChannelListItem) {
    if (!channelSupportsPostKind(channel, postKind)) return;
    markDirty();
    setSelectedIds((current) => {
      const exists = current.includes(channel.id);
      const next = exists ? current.filter((id) => id !== channel.id) : [...current, channel.id];
      if (exists && activeChannelId === channel.id) setActiveChannelId(next[0] ?? null);
      if (!exists) setActiveChannelId(channel.id);
      return next;
    });
  }

  function updateCurrentText(nextHTML: string, nextPlain: string) {
    markDirty();
    if (activeChannelId && activeChannel && overrides[activeChannel.id]?.detached) {
      setOverrides((current) => ({
        ...current,
        [activeChannel.id]: { detached: true, html: nextHTML, plain: nextPlain },
      }));
    } else {
      setHTML(nextHTML);
      setPlain(nextPlain);
    }
  }

  function appendHashtags(value: string) {
    const separator = editorPlain.trim() ? "\n\n" : "";
    updateCurrentText(
      `${editorHTML}${separator}${value}`,
      `${editorPlain}${separator}${value}`.trim(),
    );
  }

  function extrasChannelLabel(channel: (typeof selectedChannels)[number]) {
    return channel.name.trim() || PROVIDER_LABEL[channel.provider];
  }

  function buildSettings(): PostSettings {
    const hasCoordinates = showLocation && latitude.trim() !== "" && longitude.trim() !== "";
    const storySettings = telegramStoryRef.current;
    return {
      first_comment: showFirstComment ? firstComment.trim() || undefined : undefined,
      location: hasCoordinates
        ? {
            latitude: Number(latitude),
            longitude: Number(longitude),
            name: locationName.trim() || undefined,
          }
        : undefined,
      link: detectedURL
        ? {
            url: detectedURL,
            preview_enabled: selectedChannels.some(
              (channel) => channel.publish_capabilities?.composer_link_preview,
            )
              ? linkPreview
              : undefined,
          }
        : undefined,
      approval_required: approvalRequired || undefined,
      telegram_media_layout:
        media.length > 0 && telegramChannels.length > 0 ? telegramMediaLayout : undefined,
      telegram_caption_position:
        media.length > 0 && telegramChannels.length > 0 && telegramMediaLayout === "caption"
          ? media.length > 1
            ? "below"
            : telegramCaptionPosition
          : undefined,
      telegram_media_order:
        media.length > 0 && telegramChannels.length > 0 && telegramMediaLayout === "separate"
          ? telegramMediaOrder
          : undefined,
      telegram_pin: telegramChannels.length > 0 && canTelegramPin && telegramPin ? true : undefined,
      telegram_silent:
        telegramChannels.length > 0 && canTelegramSilent && telegramSilent ? true : undefined,
      telegram_video_note:
        telegramChannels.length > 0 && telegramVideoNote && singleVideoAttached
          ? true
          : undefined,
      max_buttons:
        canMaxButtons && maxButtonRows.length > 0
          ? maxButtonRows.map((row) =>
              row.map((button) => ({
                text: button.text.trim(),
                url: button.url.trim(),
              })),
            )
          : undefined,
      telegram_story:
        format === "story" || postKind === "story"
          ? {
              active_period: storySettings.active_period,
              post_to_chat_page: storySettings.post_to_chat_page || undefined,
              protect_content: storySettings.protect_content || undefined,
              areas: (storySettings.areas ?? []).map(({ id, ...area }) => ({
                ...area,
                url: area.kind === "link" ? area.url?.trim() || undefined : area.url,
              })),
            }
          : undefined,
    };
  }

  function buildPayload(): PostSaveInput {
    const apiButtons = buttonRows.map((row) => row.map(buttonToAPI));
    const richMessage =
      format === "article" || format === "rich_message"
        ? {
            title: articleTitle.trim() || undefined,
            blocks: articleBlocks,
            buttons: apiButtons,
          }
        : undefined;
    const content: PostContent = {
      format,
      title: format === "video" || format === "shorts" ? videoTitle.trim() || undefined : undefined,
      text:
        format === "message" || format === "story" || format === "short_video" || format === "video" || format === "shorts"
          ? normalizeTelegramHTMLString(html)
          : "",
      parse_mode: "HTML",
      entities: [],
      buttons: format === "message" && canTelegramButtons ? apiButtons : [],
      rich_message: richMessage,
    };
    return {
      content,
      settings: buildSettings(),
      targets: selectedChannels.map((channel) => {
        const override = overrides[channel.id];
        const hasUTM = Boolean(
          utm.source.trim() ||
            utm.medium.trim() ||
            utm.campaign.trim() ||
            utm.shorten,
        );
        const settings: PostTargetSettings = {
          detached: Boolean(override?.detached) || hasUTM,
          settings: hasUTM
            ? {
                utm: {
                  source: utm.source.trim() || undefined,
                  medium: utm.medium.trim() || undefined,
                  campaign: utm.campaign.trim() || undefined,
                  shorten: utm.shorten,
                },
              }
            : undefined,
        };
        if (override?.detached) {
          settings.content = {
            text: normalizeTelegramHTMLString(override.html),
            parse_mode: "HTML",
            entities: [],
          };
        }
        return { channel_id: channel.id, settings };
      }),
      media: media.map((item) => ({
        file_id: item.file.id,
        settings: { alt_text: item.alt.trim() || undefined },
      })),
    };
  }

  function switchPostKind(kind: PostKind) {
    markDirty();
    setPostKind(kind);
    setSelectedIds([]);
    setActiveChannelId(null);
    if (kind === "story") {
      setFormat("story");
      setMedia((current) => current.slice(0, 1));
      setTelegramStory((current) =>
        current.areas?.length ? current : normalizeStorySettings(current),
      );
      return;
    }
    if (kind === "short_video") {
      setFormat("short_video");
      setTelegramVideoNote(true);
      setMedia((current) => {
        const video = current.find((item) => isVideoMime(item.file.mime_type));
        return video ? [video] : current.slice(0, 1);
      });
      return;
    }
    if (kind === "video") {
      setFormat("video");
      setTelegramVideoNote(false);
      setMedia((current) => {
        const video = current.find((item) => isVideoMime(item.file.mime_type));
        return video ? [video] : current.slice(0, 1);
      });
      return;
    }
    if (kind === "shorts") {
      setFormat("shorts");
      setTelegramVideoNote(false);
      setMedia((current) => {
        const video = current.find((item) => isVideoMime(item.file.mime_type));
        return video ? [video] : current.slice(0, 1);
      });
      return;
    }
    setFormat(format === "article" || format === "rich_message" ? "article" : "message");
    setTelegramVideoNote(false);
  }

  async function runAIGenerate() {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setError("Введите задание для AI");
      return;
    }
    setAiBusy(true);
    setError(null);
    setSuccess(null);
    setAiResult(null);
    try {
      const editorText = editorPlain.trim();
      const { text } = await composePostText({
        task: "generate",
        prompt,
        text: aiUseEditorText && editorText ? editorText : undefined,
        tone: aiTone !== "нейтральный" ? aiTone : undefined,
        length: aiLength,
      });
      setAiResult(text);
    } catch (aiError) {
      setError(errorText(aiError, "Не удалось сгенерировать текст"));
    } finally {
      setAiBusy(false);
    }
  }

  function applyAIResult(mode: "replace" | "append") {
    if (!aiResult?.trim()) return;
    const value = aiResult.trim();
    if (mode === "replace") {
      updateCurrentText(plainToEditorHTML(value), value);
    } else {
      const separator = editorPlain.trim() ? "\n\n" : "";
      updateCurrentText(
        `${editorHTML}${separator}${value}`,
        `${editorPlain}${separator}${value}`.trim(),
      );
    }
    setSuccess("Текст вставлен из AI");
    setAiResult(null);
  }

  function validate(action: Timing) {
    if (selectedChannels.length === 0) return "Выберите хотя бы один активный канал";
    if (postKind === "story" || format === "story") {
      if (
        action !== "draft" &&
        selectedChannels.some((channel) => !channelSupportsPostKind(channel, "story"))
      ) {
        return "История публикуется только в Telegram Business — выберите соответствующий профиль";
      }
      if (action !== "draft" && media.length !== 1) {
        return "Для истории прикрепите ровно одно фото или видео";
      }
      for (const area of telegramStory.areas ?? []) {
        if (area.kind === "link") {
          const raw = area.url?.trim() ?? "";
          if (action !== "draft" && !raw) {
            return "Укажите URL в зоне «Ссылка» (кнопка + Ссылка в настройках истории). URL в тексте подписи не создаёт link-sticker.";
          }
          if (raw) {
            try {
              const parsed = new URL(raw.includes("://") ? raw : `https://${raw}`);
              if (!parsed.hostname) {
                return "URL зоны ссылки должен содержать домен, например https://example.com";
              }
            } catch {
              return "Некорректный URL зоны ссылки на истории";
            }
          }
          continue;
        }
        if (area.kind === "location" && action !== "draft") {
          if (
            area.latitude == null ||
            area.longitude == null ||
            Number.isNaN(area.latitude) ||
            Number.isNaN(area.longitude)
          ) {
            return "Укажите широту и долготу в зоне «Геометка»";
          }
          if (!area.address?.country_code?.trim()) {
            return "У геометки укажите код страны (например RU)";
          }
        }
      }
    }
    if (postKind === "short_video" || format === "short_video") {
      if (
        action !== "draft" &&
        selectedChannels.some((channel) => !channelSupportsPostKind(channel, "short_video"))
      ) {
        return `${TELEGRAM_CIRCLE_LABEL} поддерживается только для Telegram`;
      }
      if (action !== "draft" && media.length !== 1) {
        return `Для ${TELEGRAM_CIRCLE_LABEL.toLowerCase()} прикрепите ровно один файл`;
      }
      if (action !== "draft" && media.length === 1 && !isVideoMime(media[0]!.file.mime_type)) {
        return `${TELEGRAM_CIRCLE_LABEL} должен быть файлом video/*`;
      }
    }
    if (postKind === "video" || format === "video") {
      if (
        action !== "draft" &&
        selectedChannels.some((channel) => !channelSupportsPostKind(channel, "video"))
      ) {
        return "Формат «Видео» доступен для YouTube и других видеоплатформ — выберите подходящий канал";
      }
      if (action !== "draft" && !videoTitle.trim()) {
        return "Укажите название видео";
      }
      if (action !== "draft" && videoTitle.trim().length > 100) {
        return "Название видео не должно превышать 100 символов";
      }
      if (action !== "draft" && media.length !== 1) {
        return "Для видео прикрепите ровно один файл";
      }
      if (action !== "draft" && media.length === 1 && !isVideoMime(media[0]!.file.mime_type)) {
        return "Видео должно быть файлом video/*";
      }
    }
    if (postKind === "shorts" || format === "shorts") {
      if (
        action !== "draft" &&
        selectedChannels.some((channel) => !channelSupportsPostKind(channel, "shorts"))
      ) {
        return "YouTube Shorts доступны только для YouTube — выберите YouTube-канал";
      }
      if (action !== "draft" && !videoTitle.trim()) {
        return "Укажите название Shorts";
      }
      if (action !== "draft" && videoTitle.trim().length > 100) {
        return "Название Shorts не должно превышать 100 символов";
      }
      if (action !== "draft" && media.length !== 1) {
        return "Для Shorts прикрепите ровно один видеофайл";
      }
      if (action !== "draft" && media.length === 1 && !isVideoMime(media[0]!.file.mime_type)) {
        return "Shorts должны быть файлом video/*";
      }
      if (action !== "draft" && media.length === 1) {
        const duration = fileDurationSeconds(media[0]!.file);
        if (duration != null && duration > YOUTUBE_SHORTS_MAX_SECONDS) {
          return `YouTube Shorts — не более ${YOUTUBE_SHORTS_MAX_SECONDS} секунд (у файла ${duration} с)`;
        }
      }
    }
    if (
      action !== "draft" &&
      telegramVideoNote &&
      postKind === "post" &&
      (!singleVideoAttached || media.length !== 1)
    ) {
      return "Для отправки в круге прикрепите ровно одно видео";
    }
    if ((format === "article" || format === "rich_message") && !canArticle) {
      return "Статья Telegram доступна, если выбран канал с поддержкой rich messages";
    }
    if (articleOnlyTelegram && action !== "draft") {
      return "Статья Telegram публикуется только в Telegram — снимите остальные каналы или переключитесь на «Сообщение»";
    }
    if (format === "message" && !plain.trim() && postKind === "post") {
      return "Введите текст публикации";
    }
    if ((format === "story" || format === "short_video") && !html.trim() && media.length === 0) {
      return "Добавьте медиа или подпись";
    }
    if (format === "video" && !videoTitle.trim() && media.length === 0) {
      return "Укажите название и прикрепите видео";
    }
    if (format === "shorts" && !videoTitle.trim() && media.length === 0) {
      return "Укажите название и прикрепите вертикальное видео для Shorts";
    }
    if ((format === "article" || format === "rich_message") && articleBlocks.length === 0) {
      return "Добавьте хотя бы один блок статьи";
    }
    if (format === "article" || format === "rich_message") {
      for (const block of articleBlocks) {
        if (
          ["paragraph", "heading", "code", "quote", "footer", "pullquote"].includes(block.type) &&
          !block.text?.trim()
        ) {
          return `Заполните блок «${block.type}»`;
        }
        if (block.type === "heading" && (!block.size || block.size < 1 || block.size > 6)) {
          return "Размер заголовка должен быть от 1 до 6";
        }
        if (
          block.type === "list" &&
          (!block.items?.length ||
            block.items.some((item) => !item.blocks[0]?.text?.trim()))
        ) {
          return "Заполните все пункты списка";
        }
        if (
          block.type === "details" &&
          (!block.summary?.trim() || !block.blocks?.[0]?.text?.trim())
        ) {
          return "Для блока «Детали» заполните заголовок и содержимое";
        }
        if (block.type === "table") {
          const rows = block.rows ?? [];
          const width = rows[0]?.length ?? 0;
          if (
            rows.length === 0 ||
            width === 0 ||
            rows.some((row) => row.length !== width)
          ) {
            return "Таблица должна содержать строки одинаковой длины";
          }
        }
        if (
          block.type === "mathematical_expression" &&
          !block.expression?.trim()
        ) {
          return "Введите математическое выражение";
        }
      }
    }
    for (const channel of selectedChannels) {
      const text = overrides[channel.id]?.detached ? overrides[channel.id]!.plain : plain;
      if (!channel.publish_capabilities?.text && format !== "video" && format !== "shorts") {
        return `${PROVIDER_LABEL[channel.provider]}: обычные текстовые посты не поддерживаются`;
      }
      const limit = channelTextLimit(channel, media.length, telegramMediaLayout);
      if (format === "message" && text.length > limit) {
        const limitHint =
          channel.provider === "telegram" &&
          media.length > 0 &&
          telegramMediaLayout === "caption"
            ? " (подпись к медиа Telegram)"
            : "";
        return `${PROVIDER_LABEL[channel.provider]}: текст длиннее лимита ${limit}${limitHint}`;
      }
      if (action !== "draft" && media.length > 0) {
        if (!channel.publish_capabilities?.composer_media) {
          return `${PROVIDER_LABEL[channel.provider]}: публикация медиа из композера ещё не подключена`;
        }
        const maxMedia = channel.publish_capabilities?.max_media;
        if (maxMedia && media.length > maxMedia) {
          return `${PROVIDER_LABEL[channel.provider]}: можно прикрепить не более ${maxMedia} файлов`;
        }
      }
    }
    if (canTelegramButtons) {
      for (const row of buttonRows) {
        if (row.length < 1 || row.length > 8) return "В строке Telegram должно быть от 1 до 8 кнопок";
        for (const button of row) {
          if (!button.text.trim() || !button.value.trim()) return "Заполните текст и действие каждой кнопки";
          if (button.action.includes("url")) {
            try {
              const url = new URL(button.value);
              if (!["http:", "https:"].includes(url.protocol)) throw new Error();
            } catch {
              return "URL и Web App кнопки должны содержать корректную HTTP(S)-ссылку";
            }
          }
          if (button.action === "callback_data" && new TextEncoder().encode(button.value).length > 64) {
            return "Callback кнопки не должен превышать 64 байта";
          }
          if (button.action === "copy_text" && button.value.length > 256) {
            return "Текст для копирования не должен превышать 256 символов";
          }
          if (
            button.icon_custom_emoji_id?.trim() &&
            !/^[1-9]\d*$/.test(button.icon_custom_emoji_id.trim())
          ) {
            return "Custom emoji ID кнопки должен быть положительным числом";
          }
        }
      }
    }
    if (canMaxButtons && maxButtonRows.length > 0) {
      const flatCount = maxButtonRows.flat().length;
      if (maxButtonRows.length > MAX_BUTTON_ROWS) {
        return `В MAX можно добавить не более ${MAX_BUTTON_ROWS} строк кнопок`;
      }
      if (flatCount > maxMaxButtons) {
        return `Можно добавить не более ${maxMaxButtons} кнопок MAX`;
      }
      for (const row of maxButtonRows) {
        if (row.length < 1 || row.length > MAX_BUTTONS_PER_ROW) {
          return `В строке MAX должно быть от 1 до ${MAX_BUTTONS_PER_ROW} кнопок-ссылок`;
        }
        for (const button of row) {
          if (!button.text.trim() || !button.url.trim()) {
            return "Заполните текст и URL каждой кнопки MAX";
          }
          try {
            const url = new URL(button.url);
            if (!["http:", "https:"].includes(url.protocol)) throw new Error();
          } catch {
            return "URL кнопки MAX должен быть корректной HTTP(S)-ссылкой";
          }
        }
      }
      if (
        maxChannels.length > 0 &&
        media.length + 1 > 12
      ) {
        return "MAX: медиа и кнопки вместе — не более 12 вложений в одном сообщении";
      }
    }
    if (showLocation) {
      if ((latitude && !longitude) || (!latitude && longitude)) return "Укажите обе координаты";
      if (locationName.trim() && (!latitude || !longitude)) {
        return "Для геопозиции укажите широту и долготу: backend не ищет координаты по названию";
      }
      if (
        latitude &&
        (Number.isNaN(Number(latitude)) ||
          Number(latitude) < -90 ||
          Number(latitude) > 90 ||
          Number(longitude) < -180 ||
          Number(longitude) > 180)
      ) {
        return "Проверьте координаты геопозиции";
      }
    }
    if (action === "schedule" && (!scheduleAt || new Date(scheduleAt) <= new Date())) {
      return "Выберите дату и время в будущем";
    }
    return null;
  }

  async function handleApprovalDecision(action: "approve" | "reject") {
    if (!postId) return;
    if (action === "reject" && !discussionComment.trim()) {
      setError("Укажите, что нужно доработать");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const finalPost =
        action === "approve"
          ? await approvePost(postId, {
              comment: discussionComment.trim() || undefined,
              due_at:
                timing === "schedule" && scheduleAt
                  ? new Date(scheduleAt).toISOString()
                  : undefined,
              publish: timing === "now",
            })
          : await rejectPost(postId, { comment: discussionComment.trim() });
      setCurrentStatus(finalPost.status);
      setNeedsRevision(Boolean(finalPost.needs_revision) || action === "reject");
      await loadApprovalEvents(finalPost.id);
      setDiscussionComment("");
      setSuccess(
        action === "approve"
          ? "Публикация одобрена"
          : "Публикация возвращена на доработку",
      );
    } catch (decisionError) {
      setError(errorText(decisionError, "Не удалось обработать согласование"));
    } finally {
      setBusy(false);
    }
  }

  async function sendDiscussionComment() {
    if (!postId || !discussionComment.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await commentPost(postId, discussionComment.trim());
      setDiscussionComment("");
      await loadApprovalEvents(postId);
      setSuccess("Комментарий добавлен");
    } catch (commentError) {
      setError(errorText(commentError, "Не удалось отправить комментарий"));
    } finally {
      setBusy(false);
    }
  }

  async function save(action: Timing) {
    const validation = validate(action);
    if (validation) {
      setError(validation);
      setSuccess(null);
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const canPublishWithoutSave =
        action === "now" &&
        postId &&
        !dirty &&
        currentStatus !== null &&
        (currentStatus === "failed" ||
          currentStatus === "scheduled" ||
          currentStatus === "draft");

      let finalPost: Post;
      if (action === "now") {
        const saved = postId
          ? await updatePost(postId, buildPayload())
          : await createPost(buildPayload());
        finalPost = await publishPost(saved.id);
      } else if (canPublishWithoutSave) {
        finalPost = await publishPost(postId!);
      } else {
        const saved = postId
          ? await updatePost(postId, buildPayload())
          : await createPost(buildPayload());
        finalPost = saved;
        if (action === "schedule") {
          finalPost = await schedulePost(saved.id, new Date(scheduleAt).toISOString());
        }
      }
      if (action === "now" && finalPost.status === "failed") {
        const targetErrors = finalPost.targets
          .filter((target) => target.status === "failed" && target.last_error)
          .map((target) => target.last_error!)
          .join("; ");
        throw new ApiError(
          502,
          targetErrors || finalPost.last_error || "Не удалось опубликовать во все каналы",
        );
      }
      setPostId(finalPost.id);
      setCurrentStatus(finalPost.status);
      setNeedsRevision(Boolean(finalPost.needs_revision));
      if (!postId) {
        router.replace(`/posts/${finalPost.id}`, { scroll: false });
      }
      if (finalPost.status === "pending_approval" || approvalRequired) {
        await loadApprovalEvents(finalPost.id);
        setActivePreviewTab("discussion");
      }
      setDirty(false);
      setSuccess(
        finalPost.status === "pending_approval"
          ? "Отправлено на согласование"
          : action === "draft"
            ? "Черновик сохранён"
            : action === "schedule"
              ? "Публикация запланирована"
              : "Публикация передана в очередь",
      );
    } catch (saveError) {
      if (postId && action === "now") {
        try {
          const latest = await fetchPost(postId);
          setCurrentStatus(latest.status);
        } catch {
          // ignore sync errors
        }
      }
      setError(errorText(saveError, "Не удалось сохранить публикацию"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncTelegramStory() {
    const validation = validate("now");
    if (validation) {
      setError(validation);
      return;
    }
    if (!postId) {
      setError("Сначала сохраните историю");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await updatePost(postId, buildPayload());
      const finalPost = await syncTelegramStory(postId);
      setCurrentStatus(finalPost.status);
      setDirty(false);
      setSuccess("История обновлена в Telegram");
    } catch (syncError) {
      setError(errorText(syncError, "Не удалось обновить историю в Telegram"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTelegramStory() {
    if (!postId) return;
    if (!window.confirm("Удалить историю из Telegram? Запись в Postilka останется.")) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const finalPost = await deleteTelegramStory(postId);
      setCurrentStatus(finalPost.status);
      setSuccess("История удалена из Telegram");
    } catch (deleteError) {
      setError(errorText(deleteError, "Не удалось удалить историю в Telegram"));
    } finally {
      setBusy(false);
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await Promise.all(Array.from(files).map((file) => uploadFile(file)));
      setRecentFiles((current) => [...uploaded, ...current]);
      setMedia((current) => {
        const added = uploaded
          .filter((file) => !current.some((item) => item.file.id === file.id))
          .map((file) => ({ file, alt: "" }));
        if (isYouTubeVideoMode) {
          const video = added.find((item) => isVideoMime(item.file.mime_type)) ?? added[0];
          return video ? [video] : current;
        }
        return [...current, ...added];
      });
      markDirty();
      setSuccess("Файлы загружены и добавлены");
    } catch (uploadError) {
      setError(errorText(uploadError, "Не удалось загрузить файлы"));
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function resizeStart(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = previewWidth;
    let finalWidth = startWidth;
    const move = (moveEvent: PointerEvent) => {
      const maximum = Math.min(560, window.innerWidth * 0.45);
      finalWidth = Math.max(320, Math.min(maximum, startWidth + startX - moveEvent.clientX));
      setPreviewWidth(finalWidth);
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.localStorage.setItem("postilka-composer-preview-width", String(finalWidth));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  }

  const editingSharedText = activeChannelId === null;

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загружаем каналы и публикации…
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={
          isViewOnly
            ? "Просмотр публикации"
            : postId
              ? "Редактирование поста"
              : "Новый пост"
        }
        description={
          isViewOnly
            ? "Запись уже отправлена или стоит в очереди. Редактирование недоступно — можно дублировать из списка публикаций."
            : "Создайте общую публикацию, адаптируйте её для каналов и выберите время отправки."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/posts"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Все публикации
            </Link>
            <button
              type="button"
              onClick={resetNew}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              <Plus className="h-4 w-4" />
              Новый пост
            </button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}

      <div
        className="post-composer-layout"
        style={{ "--preview-width": `${previewWidth}px` } as CSSProperties}
      >
        <div ref={anchorRef} className="min-w-0 space-y-4">
          <div className="inline-flex rounded-lg bg-zinc-200/70 p-1">
            {(
              [
                { id: "post" as const, label: "Пост", disabled: false },
                { id: "story" as const, label: "История", disabled: !hasStoryChannels },
                { id: "short_video" as const, label: TELEGRAM_CIRCLE_LABEL, disabled: false },
                { id: "video" as const, label: "Видео", disabled: !hasVideoChannels },
                { id: "shorts" as const, label: "Shorts", disabled: !hasShortsChannels },
              ] satisfies ReadonlyArray<{ id: PostKind; label: string; disabled: boolean }>
            ).map(({ id, label, disabled }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchPostKind(id)}
                disabled={composerLocked || disabled}
                title={
                  disabled
                    ? id === "story"
                      ? "Подключите Telegram Business на странице «Каналы»"
                      : "Подключите YouTube или другой видеоканал на странице «Каналы»"
                    : undefined
                }
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-semibold",
                  postKind === id ? "bg-white shadow-sm" : "text-muted hover:text-text",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="-mt-2 text-xs text-muted">
            {postKind === "story"
              ? "История — одно фото или видео в Telegram Stories через Business-подключение."
              : postKind === "short_video"
                ? maxChannels.length > 0
                  ? `${TELEGRAM_CIRCLE_LABEL}: в Telegram — кружок, в MAX — обычное прямоугольное видео с текстом.`
                  : `${TELEGRAM_CIRCLE_LABEL} отправляется в Telegram как кружок; подпись — отдельным сообщением.`
                : postKind === "video"
                  ? "Видео для YouTube: название, описание и один видеофайл. Запланированная публикация поддерживается."
                  : postKind === "shorts"
                    ? "YouTube Shorts: вертикальное видео до 60 секунд (9:16). Postilka добавит #Shorts при публикации."
                    : "Обычный пост: текст, медиа и статья Telegram."}
          </p>
          {maxGetsRectangularVideo && postKind !== "short_video" && !isYouTubeVideoMode && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              «Отправить в круге» действует только в Telegram. В MAX то же видео уйдёт как обычный
              прямоугольный ролик.
            </p>
          )}

          {needsRevision && currentStatus === "draft" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Нужна доработка</p>
              <p className="mt-1 text-xs">
                Администратор вернул пост. Внесите правки и отправьте на согласование снова.
              </p>
            </div>
          )}

          {isPendingApproval && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Публикация на согласовании</p>
              <p className="mt-1 text-xs">
                {isAdmin
                  ? "Одобрите публикацию или верните её на доработку во вкладке «Обсуждение»."
                  : "Редактирование заблокировано до решения администратора."}
              </p>
            </div>
          )}

          <Card
            title="Каналы"
            action={
              <button
                type="button"
                onClick={() => {
                  const active = channels.filter((channel) =>
                    channelSupportsPostKind(channel, postKind),
                  );
                  setSelectedIds(
                    selectedIds.length === active.length ? [] : active.map((channel) => channel.id),
                  );
                  setActiveChannelId(selectedIds.length === active.length ? null : active[0]?.id ?? null);
                  markDirty();
                }}
                className="text-xs font-medium text-accent hover:underline"
              >
                {selectedIds.length ? "Снять выбор" : "Выбрать все"}
              </button>
            }
          >
            {channels.length === 0 ? (
              <p className="text-sm text-muted">Сначала подключите канал на странице «Каналы».</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {channels.map((channel) => {
                  const selected = selectedIds.includes(channel.id);
                  const supportsPost = channelSupportsPostKind(channel, postKind);
                  const unavailableReason = channelUnavailableReason(channel, postKind);
                  const isBusiness = isTelegramBusinessChannel(channel);
                  return (
                    <div key={channel.id} className="relative min-w-0">
                      <button
                        type="button"
                        disabled={!supportsPost}
                        onClick={() => toggleChannel(channel)}
                        className={cn(
                          "flex w-full min-w-0 items-center gap-3 rounded-lg border p-3 pr-9 text-left transition-colors",
                          selected ? "border-accent bg-accent/5" : "border-border hover:bg-zinc-50",
                          !supportsPost && "cursor-not-allowed opacity-50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            selected ? "border-accent bg-accent text-white" : "border-zinc-300 bg-white",
                          )}
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                        <ChannelAvatar
                          name={channel.name}
                          metadata={channel.metadata}
                          channelId={channel.id}
                          provider={channel.provider}
                          chatType={channel.chat_type}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-semibold">
                              {channelDisplayName(channel)}
                            </span>
                            {isBusiness && (
                              <ChannelHintIcon label={TELEGRAM_BUSINESS_HINT} tone="info">
                                <Briefcase className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
                              </ChannelHintIcon>
                            )}
                          </span>
                          <span className="block text-xs text-muted">
                            {channelProviderSubtitle(channel, postKind)}
                            {channel.status !== "active"
                              ? " · недоступен"
                              : !supportsPost && !channel.publish_capabilities?.text && postKind === "post"
                                ? " · только другой формат"
                                : ""}
                          </span>
                        </span>
                      </button>
                      {!supportsPost && unavailableReason && (
                        <div className="pointer-events-auto absolute right-2 top-2 z-10">
                          <ChannelHintIcon label={unavailableReason} tone="warning">
                            <AlertTriangle
                              className="h-4 w-4 fill-amber-100 text-amber-500"
                              aria-label="Почему канал недоступен"
                            />
                          </ChannelHintIcon>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Текст и адаптация">
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveChannelId(null)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-semibold",
                  editingSharedText ? "border-accent bg-accent/10 text-accent" : "border-border",
                )}
              >
                Общий текст
              </button>
              {selectedChannels.map((channel) => {
                const detached = overrides[channel.id]?.detached;
                const selected = activeChannelId === channel.id;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setActiveChannelId(channel.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                      selected ? "border-accent bg-accent/10 text-accent" : "border-border",
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: PROVIDER_COLOR[channel.provider] }}
                    />
                    {channelDisplayName(channel)}
                    {detached && (
                      <span title="Своя версия текста">
                        <Layers2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {activeChannel && activeChannelId && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-zinc-50 p-3">
                <div>
                  <p className="text-sm font-semibold">{channelDisplayName(activeChannel)}</p>
                  <p className="text-xs text-muted">
                    {overrides[activeChannel.id]?.detached
                      ? "Своя версия текста будет опубликована только в этот канал"
                      : "Сейчас канал использует общий текст. Нажмите «Своя версия», чтобы адаптировать."}
                  </p>
                </div>
                <div className="flex gap-2">
                  {overrides[activeChannel.id]?.detached && (
                    <SmallButton
                      onClick={() => {
                        setOverrides((current) => ({
                          ...current,
                          [activeChannel.id]: { detached: true, html, plain },
                        }));
                        markDirty();
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Скопировать общий
                    </SmallButton>
                  )}
                  <SmallButton
                    active={overrides[activeChannel.id]?.detached}
                    onClick={() => {
                      setOverrides((current) => {
                        const wasDetached = current[activeChannel.id]?.detached;
                        return {
                          ...current,
                          [activeChannel.id]: wasDetached
                            ? { detached: false, html, plain }
                            : { detached: true, html, plain },
                        };
                      });
                      markDirty();
                    }}
                  >
                    {overrides[activeChannel.id]?.detached ? "Общий текст" : "Своя версия"}
                  </SmallButton>
                </div>
              </div>
            )}

            <div className="mb-3">
              <button
                type="button"
                disabled={composerLocked || format !== "message"}
                onClick={() => setAiPanelOpen((open) => !open)}
                className={cn(
                  "inline-flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors",
                  aiPanelOpen
                    ? "border-accent/30 bg-blue-50 text-accent"
                    : "border-border bg-white text-accent hover:bg-blue-50/60",
                  (composerLocked || format !== "message") && "opacity-50",
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {aiBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  AI генерация текста
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", aiPanelOpen && "rotate-180")}
                />
              </button>

              {aiPanelOpen && (
                <div className="mt-2 space-y-3 rounded-lg border border-accent/20 bg-gradient-to-b from-blue-50/70 to-white p-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                      Задание для нейросети
                    </label>
                    <textarea
                      value={aiPrompt}
                      disabled={aiBusy || composerLocked}
                      onChange={(event) => setAiPrompt(event.target.value)}
                      placeholder="Например: напиши пост про скидку 20% до конца недели с призывом перейти на сайт"
                      rows={3}
                      className="box-border w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-800 outline-none focus:border-accent/40"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: "Написать с нуля", prompt: "Напиши пост для соцсетей", useEditor: false },
                      {
                        label: "Переписать",
                        prompt: "Перепиши текст: улучши ясность и вовлечение",
                        useEditor: true,
                      },
                      { label: "Сократить", prompt: "Сократи текст, сохрани смысл", useEditor: true },
                      {
                        label: "Продающий",
                        prompt: "Сделай текст более продающим с чётким призывом к действию",
                        useEditor: true,
                      },
                      {
                        label: "Хэштеги",
                        prompt: "Подбери 5–10 релевантных хэштегов для этого поста",
                        useEditor: true,
                      },
                    ].map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        disabled={aiBusy || composerLocked}
                        onClick={() => {
                          setAiPrompt(chip.prompt);
                          setAiUseEditorText(chip.useEditor);
                        }}
                        className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 hover:border-accent/30 hover:text-accent disabled:opacity-50"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                      <input
                        type="checkbox"
                        checked={aiUseEditorText}
                        disabled={aiBusy || composerLocked}
                        onChange={(event) => setAiUseEditorText(event.target.checked)}
                        className="rounded border-zinc-300"
                      />
                      Использовать текст редактора
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                      Тон
                      <select
                        value={aiTone}
                        disabled={aiBusy || composerLocked}
                        onChange={(event) => setAiTone(event.target.value)}
                        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs"
                      >
                        {["нейтральный", "дружелюбный", "экспертный", "продающий", "юмористический"].map(
                          (tone) => (
                            <option key={tone} value={tone}>
                              {tone}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                      Длина
                      <select
                        value={aiLength}
                        disabled={aiBusy || composerLocked}
                        onChange={(event) =>
                          setAiLength(event.target.value as "short" | "medium" | "long")
                        }
                        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs"
                      >
                        <option value="short">короткий</option>
                        <option value="medium">средний</option>
                        <option value="long">длинный</option>
                      </select>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={aiBusy || composerLocked || !aiPrompt.trim()}
                    onClick={() => void runAIGenerate()}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
                  >
                    {aiBusy ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Генерация…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Сгенерировать
                      </>
                    )}
                  </button>

                  {aiResult && (
                    <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                        Результат
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
                        {aiResult}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <SmallButton onClick={() => applyAIResult("replace")}>Заменить</SmallButton>
                        <SmallButton onClick={() => applyAIResult("append")}>Добавить ниже</SmallButton>
                        <SmallButton disabled={aiBusy} onClick={() => void runAIGenerate()}>
                          Ещё раз
                        </SmallButton>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {canArticle && postKind === "post" && (
              <div className="mb-3 inline-flex rounded-lg bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setFormat("message");
                    markDirty();
                  }}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold",
                    format === "message" && "bg-white shadow-sm",
                  )}
                >
                  Сообщение
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormat("article");
                    markDirty();
                  }}
                  title="Статья Telegram (rich message)"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold",
                    format !== "message" && "bg-white shadow-sm",
                  )}
                >
                  Статья Telegram
                </button>
              </div>
            )}
            {articleOnlyTelegram && (
              <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Статья Telegram будет опубликована только в Telegram. Остальные выбранные каналы
                получат ошибку при публикации — снимите их или переключитесь на «Сообщение».
              </p>
            )}

            {(format === "video" || format === "shorts") && (
              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-medium text-zinc-600">
                  {format === "shorts" ? "Название Shorts" : "Название видео"}{" "}
                  <span className="text-red-500">*</span>
                </span>
                <input
                  type="text"
                  value={videoTitle}
                  maxLength={100}
                  disabled={composerLocked}
                  onChange={(event) => {
                    setVideoTitle(event.target.value);
                    markDirty();
                  }}
                  placeholder={
                    format === "shorts"
                      ? "Название для YouTube Shorts (до 100 символов)"
                      : "Название для YouTube (до 100 символов)"
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                />
              </label>
            )}

            {format === "message" || format === "story" || format === "short_video" || format === "video" || format === "shorts" ? (
              <RichTextEditor
                html={editorHTML}
                onChange={updateCurrentText}
                placeholder={
                  format === "story"
                    ? "Подпись к истории (необязательно)…"
                    : format === "short_video"
                      ? "Подпись к видео (необязательно)…"
                      : format === "video"
                        ? "Описание видео (необязательно)…"
                        : format === "shorts"
                          ? "Описание Shorts (необязательно)…"
                          : "Напишите текст поста…"
                }
                disabled={composerLocked}
              />
            ) : (
              <ArticleEditor
                title={articleTitle}
                blocks={articleBlocks}
                onTitleChange={(value) => {
                  setArticleTitle(value);
                  markDirty();
                }}
                onChange={(value) => {
                  setArticleBlocks(value);
                  markDirty();
                }}
              />
            )}
            {format === "article" || format === "rich_message" ? (
              <p className="mt-2 text-xs text-muted">
                Статья Telegram использует блочную разметку rich message. Отделённые текстовые
                версии применяются в режиме «Сообщение».
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {HASHTAG_SETS.map((set) => (
                  <SmallButton key={set.name} onClick={() => appendHashtags(set.value)}>
                    #{set.name}
                  </SmallButton>
                ))}
                <SmallButton
                  onClick={() => {
                    const value = window.prompt("Введите хэштеги через пробел");
                    if (value?.trim()) appendHashtags(value.trim());
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Свой набор
                </SmallButton>
              </div>
              <div className="flex gap-3 text-xs text-muted">
                <span className={previewPlain.length > maxText ? "font-semibold text-red-600" : ""}>
                  {previewPlain.length}/{maxText} символов
                </span>
                <span>{hashtagCount} хэштегов</span>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedChannels.map((channel) => {
                const channelText = overrides[channel.id]?.detached
                  ? overrides[channel.id]!.plain
                  : plain;
                const limit = channelTextLimit(channel, media.length, telegramMediaLayout);
                const over = limit > 0 && channelText.length > limit;
                return (
                  <span
                    key={channel.id}
                    className={cn(
                      "rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-muted",
                      over && "bg-red-50 font-semibold text-red-600",
                    )}
                  >
                    {PROVIDER_LABEL[channel.provider]}: {channelText.length}/{limit || "—"}
                  </span>
                );
              })}
            </div>
          </Card>

          {detectedURL && (
            <Card title="Ссылка и UTM">
              <p className="truncate text-sm font-medium text-accent">{detectedURL}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(["source", "medium", "campaign"] as const).map((key) => (
                  <input
                    key={key}
                    value={utm[key]}
                    onChange={(event) => {
                      setUTM((current) => ({ ...current, [key]: event.target.value }));
                      markDirty();
                    }}
                    placeholder={`utm_${key}`}
                    className="min-w-0 rounded-md border border-border px-2 py-1.5 text-xs"
                  />
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={utm.shorten}
                  onChange={(event) => {
                    setUTM((current) => ({ ...current, shorten: event.target.checked }));
                    markDirty();
                  }}
                />
                Сократить ссылку при публикации
              </label>
              <p className="mt-2 text-[11px] text-muted">
                UTM и сокращение сохраняются отдельно для каждого выбранного канала. При
                публикации URL заменяются на короткие отслеживаемые ссылки с учётом UTM.
              </p>
            </Card>
          )}

          {canTelegramButtons && (
            <ButtonBuilder
              rows={buttonRows}
              styled={telegramChannels.every((channel) => channel.publish_capabilities?.styled_buttons)}
              customEmoji={telegramChannels.every(
                (channel) => channel.publish_capabilities?.custom_emoji,
              )}
              maxButtons={maxButtons}
              onChange={(rows) => {
                setButtonRows(rows);
                markDirty();
              }}
            />
          )}

          {canMaxButtons && (
            <MaxButtonBuilder
              rows={maxButtonRows}
              maxButtons={maxMaxButtons}
              onChange={(rows) => {
                setMaxButtonRows(rows);
                markDirty();
              }}
            />
          )}

          <Card
            title="Медиа"
            accent
            action={
              media.length > 0 ? (
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
                  {media.length} файл{media.length === 1 ? "" : media.length < 5 ? "а" : "ов"}
                </span>
              ) : undefined
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple={!isYouTubeVideoMode}
              accept={isYouTubeVideoMode ? "video/*" : undefined}
              className="hidden"
              onChange={(event) => void upload(event.target.files)}
            />
            <div className="flex flex-wrap gap-2">
              <SmallButton disabled={busy} onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />
                С компьютера
              </SmallButton>
              <SmallButton onClick={() => setMediaPicker((value) => !value)}>
                <FileImage className="h-3.5 w-3.5" />
                Недавние файлы
              </SmallButton>
            </div>
            {media.length === 0 && (
              <p className="mt-3 rounded-lg border border-dashed border-accent/25 bg-white/70 px-3 py-4 text-center text-sm text-muted">
                {isYouTubeVideoMode
                  ? "Прикрепите один видеофайл — с компьютера или из недавних."
                  : "Прикрепите фото или видео — это ключевой блок публикации."}
              </p>
            )}
            {media.length > 0 && noMediaDelivery.length > 0 && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                Медиа сохранится в черновике, но сейчас не будет доставлено в{" "}
                {noMediaDelivery
                  .map((channel) => PROVIDER_LABEL[channel.provider])
                  .join(", ")}. Публикация и планирование заблокированы.
              </div>
            )}
            {media.length > 0 && telegramChannels.length > 0 && !isYouTubeVideoMode && (
              <div className="mt-3 space-y-2">
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-zinc-700">Доставка в Telegram</p>
                  <div className="flex flex-wrap gap-2">
                    <SmallButton
                      active={telegramMediaLayout === "separate"}
                      onClick={() => {
                        setTelegramMediaLayout("separate");
                        markDirty();
                      }}
                    >
                      Медиа и текст отдельно
                    </SmallButton>
                    <SmallButton
                      active={telegramMediaLayout === "caption"}
                      onClick={() => {
                        setTelegramMediaLayout("caption");
                        markDirty();
                      }}
                    >
                      Одним сообщением
                    </SmallButton>
                  </div>
                </div>
                {telegramMediaLayout === "caption" ? (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-zinc-700">Текст относительно медиа</p>
                    <div className="flex flex-wrap gap-2">
                      <SmallButton
                        active={telegramCaptionPosition === "above"}
                        disabled={media.length > 1}
                        title={
                          media.length > 1
                            ? "Для альбома Telegram показывает подпись только под медиа"
                            : undefined
                        }
                        onClick={() => {
                          setTelegramCaptionPosition("above");
                          markDirty();
                        }}
                      >
                        Текст сверху
                      </SmallButton>
                      <SmallButton
                        active={telegramCaptionPosition === "below"}
                        onClick={() => {
                          setTelegramCaptionPosition("below");
                          markDirty();
                        }}
                      >
                        Текст снизу
                      </SmallButton>
                    </div>
                    {media.length > 1 && (
                      <p className="mt-1.5 text-xs text-muted">
                        В альбоме из нескольких файлов Telegram размещает подпись только под медиа.
                      </p>
                    )}
                    {media.length > 1 &&
                      canTelegramButtons &&
                      buttonRows.some((row) => row.length > 0) && (
                        <p className="mt-1.5 text-xs text-amber-700">
                          Telegram не прикрепляет кнопки к альбому: медиа отправится первым, текст и
                          кнопки — следующим сообщением.
                        </p>
                      )}
                  </div>
                ) : (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-zinc-700">Порядок в канале</p>
                    <div className="flex flex-wrap gap-2">
                      <SmallButton
                        active={telegramMediaOrder === "media_first"}
                        onClick={() => {
                          setTelegramMediaOrder("media_first");
                          markDirty();
                        }}
                      >
                        Сначала медиа
                      </SmallButton>
                      <SmallButton
                        active={telegramMediaOrder === "text_first"}
                        onClick={() => {
                          setTelegramMediaOrder("text_first");
                          markDirty();
                        }}
                      >
                        Сначала текст
                      </SmallButton>
                    </div>
                  </div>
                )}
                {telegramMediaLayout === "caption" && (
                  <div
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs",
                      plain.length > 1024
                        ? "border-red-200 bg-red-50 font-medium text-red-700"
                        : plain.length > 900
                          ? "border-amber-200 bg-amber-50 text-amber-900"
                          : "border-blue-200 bg-blue-50 text-blue-800",
                    )}
                  >
                    <p>
                      В режиме «одним сообщением» текст становится подписью к медиа. Лимит Telegram
                      — <strong>1024 символа</strong> (сейчас {plain.length}).
                    </p>
                    {plain.length > 1024 && (
                      <p className="mt-1">
                        Сократите текст или переключитесь на «Медиа и текст отдельно» — там лимит
                        4096 символов.
                      </p>
                    )}
                    {plain.length <= 1024 && (
                      <p className="mt-1">
                        При одном файле кнопки прикрепятся к тому же сообщению; при альбоме —
                        отдельным сообщением с кнопками.
                      </p>
                    )}
                  </div>
                )}
                {telegramMediaLayout === "separate" && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                    Два сообщения в канале: порядок задаётся кнопками выше. Текст может быть до 4096
                    символов; лимит подписи 1024 здесь не применяется.
                  </div>
                )}
              </div>
            )}
            {mediaPicker && (
              <div className="mt-3 rounded-lg border border-border bg-zinc-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold">Недавние медиа</p>
                  <button type="button" onClick={() => setMediaPicker(false)}>
                    <X className="h-4 w-4 text-muted" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
                  {recentFiles.slice(0, 21).map((file) => {
                    const selected = media.some((item) => item.file.id === file.id);
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => {
                          setMedia((current) => {
                            if (selected) {
                              return current.filter((item) => item.file.id !== file.id);
                            }
                            const next = { file, alt: "" };
                            return isYouTubeVideoMode ? [next] : [...current, next];
                          });
                          markDirty();
                        }}
                        className="min-w-0 text-left"
                      >
                        <FileThumbnail
                          fileId={file.id}
                          name={file.name}
                          mimeType={file.mime_type}
                          selected={selected}
                          size="sm"
                        />
                        <span className="mt-1 block truncate text-[10px] text-muted">{file.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {media.length > 0 && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {media.map((item) => (
                  <div key={item.file.id} className="flex gap-3 rounded-lg border border-border p-3">
                    <FileThumbnail
                      fileId={item.file.id}
                      name={item.file.name}
                      mimeType={item.file.mime_type}
                      size="sm"
                      className="h-16 w-16 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-xs font-semibold">{item.file.name}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setMedia((current) =>
                              current.filter((selected) => selected.file.id !== item.file.id),
                            );
                            markDirty();
                          }}
                          aria-label="Убрать файл"
                        >
                          <X className="h-4 w-4 text-muted" />
                        </button>
                      </div>
                      <input
                        value={item.alt}
                        onChange={(event) => {
                          setMedia((current) =>
                            current.map((selected) =>
                              selected.file.id === item.file.id
                                ? { ...selected, alt: event.target.value }
                                : selected,
                            ),
                          );
                          markDirty();
                        }}
                        placeholder="Alt-текст"
                        className="mt-2 w-full rounded border border-border px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {(postKind === "story" || format === "story") && (
            <Card title="Настройки истории Telegram">
              <StoryAreaEditor
                settings={telegramStory}
                mediaPreviewUrl={storyMediaPreviewUrl}
                disabled={composerLocked}
                onChange={(next) => {
                  setTelegramStory(next);
                  markDirty();
                }}
              />
            </Card>
          )}

          {(showExtrasCard ||
            (telegramChannels.length > 0 &&
              postKind !== "story" &&
              format !== "story" &&
              !isYouTubeVideoMode)) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {showExtrasCard && (
            <Card title="Дополнения">
              {showFirstComment && (
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-600">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Первый комментарий
                </span>
                <textarea
                  value={firstComment}
                  maxLength={4096}
                  onChange={(event) => {
                    setFirstComment(event.target.value);
                    markDirty();
                  }}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-border px-3 py-2 text-sm"
                  placeholder="Необязательно"
                />
                <p className="mt-1 text-[11px] text-muted">
                  {firstCommentHint}
                </p>
                {firstComment.trim() && noCommentDelivery.length > 0 && (
                  <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                    Сохранится в черновике, но не доставится в{" "}
                    {noCommentDelivery.map(extrasChannelLabel).join(", ")}.
                  </p>
                )}
              </label>
              )}
              {showLocation && (
              <div className={showFirstComment ? "mt-3" : undefined}>
                <span className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-600">
                  <MapPin className="h-3.5 w-3.5" />
                  Геопозиция
                </span>
                <input
                  value={locationName}
                  onChange={(event) => {
                    setLocationName(event.target.value);
                    markDirty();
                  }}
                  placeholder="Название места"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={latitude}
                    onChange={(event) => {
                      setLatitude(event.target.value);
                      markDirty();
                    }}
                    placeholder="Широта"
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    value={longitude}
                    onChange={(event) => {
                      setLongitude(event.target.value);
                      markDirty();
                    }}
                    placeholder="Долгота"
                    className="rounded-lg border border-border px-3 py-2 text-sm"
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {locationHint}
                </p>
                {(locationName.trim() || latitude || longitude) &&
                  noLocationDelivery.length > 0 && (
                    <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                      Геопозиция сохранится в черновике, но не доставится в{" "}
                      {noLocationDelivery.map(extrasChannelLabel).join(", ")}.
                    </p>
                  )}
              </div>
              )}
            </Card>
            )}

            {telegramChannels.length > 0 && postKind !== "story" && format !== "story" && !isYouTubeVideoMode && (
              <Card title="Настройки Telegram">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={telegramPin}
                      disabled={!canTelegramPin || composerLocked}
                      onChange={(event) => {
                        setTelegramPin(event.target.checked);
                        markDirty();
                      }}
                    />
                    <Pin className="h-3.5 w-3.5 shrink-0 text-muted" />
                    Закрепить
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={telegramSilent}
                      disabled={!canTelegramSilent || composerLocked}
                      onChange={(event) => {
                        setTelegramSilent(event.target.checked);
                        markDirty();
                      }}
                    />
                    <BellOff className="h-3.5 w-3.5 shrink-0 text-muted" />
                    Отправить без звука
                  </label>
                  <label
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      !singleVideoAttached && "opacity-60",
                    )}
                    title={
                      !singleVideoAttached
                        ? "Прикрепите ровно одно видео"
                        : undefined
                    }
                  >
                    <input
                      type="checkbox"
                      checked={telegramVideoNote}
                      disabled={
                        !canTelegramVideoNote ||
                        !singleVideoAttached ||
                        composerLocked ||
                        postKind === "short_video"
                      }
                      onChange={(event) => {
                        setTelegramVideoNote(event.target.checked);
                        markDirty();
                      }}
                    />
                    <Circle className="h-3.5 w-3.5 shrink-0 text-muted" />
                    Отправить в круге
                  </label>
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  «Отправить в круге» — только Telegram, нужно одно видео. В режиме «{TELEGRAM_CIRCLE_LABEL}»
                  кружок включается автоматически.
                </p>
                {maxGetsRectangularVideo && (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
                    Выбраны каналы MAX: кружок будет только в Telegram, в MAX уйдёт прямоугольное
                    видео.
                  </p>
                )}
                {telegramPin && !canTelegramPin && (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                    Закрепление пока недоступно для выбранных Telegram-каналов.
                  </p>
                )}
              </Card>
            )}
          </div>
          )}

          {postId && currentStatus === "published" ? (
            <PostStatsPanel postId={postId} published />
          ) : null}
        </div>

        <div
          role="separator"
          aria-label="Изменить ширину предпросмотра"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={resizeStart}
          onDoubleClick={() => {
            setPreviewWidth(380);
            window.localStorage.setItem("postilka-composer-preview-width", "380");
          }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const delta = event.key === "ArrowLeft" ? 16 : -16;
            const maximum = Math.min(560, window.innerWidth * 0.45);
            const next = Math.max(320, Math.min(maximum, previewWidth + delta));
            setPreviewWidth(next);
            window.localStorage.setItem("postilka-composer-preview-width", String(next));
          }}
          className="post-composer-resizer"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        <div ref={hostRef} className="post-composer-preview-host">
        <aside
          ref={targetRef}
          className="post-composer-preview min-w-0"
          style={pinnedStyle}
        >
          <div className="post-composer-preview-panel rounded-xl border border-border bg-surface shadow-sm">
            <div className="shrink-0 border-b border-border p-4 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex rounded-lg bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab("preview")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold",
                    activePreviewTab === "preview" && "bg-white text-accent shadow-sm",
                  )}
                >
                  Предпросмотр
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab("discussion")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-semibold",
                    activePreviewTab === "discussion" && "bg-white text-accent shadow-sm",
                  )}
                >
                  Обсуждение
                </button>
              </div>
              <div className="flex rounded-md bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => setDevice("mobile")}
                  className={cn("rounded p-1.5", device === "mobile" && "bg-white shadow-sm")}
                  aria-label="Мобильный вид"
                >
                  <Smartphone className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDevice("desktop")}
                  className={cn("rounded p-1.5", device === "desktop" && "bg-white shadow-sm")}
                  aria-label="Десктопный вид"
                >
                  <Monitor className="h-4 w-4" />
                </button>
              </div>
              </div>
            </div>

            <div className="post-composer-preview-body p-4 pt-3">
            {activePreviewTab === "discussion" ? (
              <div className="flex min-h-64 flex-col gap-3">
                {!postId ? (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <MessageCircle className="mb-2 h-8 w-8 text-zinc-300" />
                    <p className="text-sm font-semibold">Сохраните черновик</p>
                    <p className="mt-1 max-w-64 text-xs text-muted">
                      Обсуждение и согласование доступны после первого сохранения публикации.
                    </p>
                  </div>
                ) : approvalEvents.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <MessageCircle className="mb-2 h-8 w-8 text-zinc-300" />
                    <p className="text-sm font-semibold">Обсуждений пока нет</p>
                    <p className="mt-1 max-w-64 text-xs text-muted">
                      {approvalRequired || isPendingApproval
                        ? "Добавьте комментарий или дождитесь решения администратора."
                        : "Включите «Согласование» или отправьте пост на публикацию, чтобы начать обсуждение."}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto">
                    {approvalEvents.map((event) => (
                      <div key={event.id} className="rounded-lg border border-border bg-white p-3 text-left">
                        <p className="text-xs font-semibold text-accent">
                          {APPROVAL_ACTION_LABEL[event.action]}
                        </p>
                        {event.comment && (
                          <p className="mt-1 text-sm text-zinc-800">{event.comment}</p>
                        )}
                        <p className="mt-1 text-[11px] text-muted">
                          {new Date(event.created_at).toLocaleString("ru-RU")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {postId && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <textarea
                      value={discussionComment}
                      onChange={(event) => setDiscussionComment(event.target.value)}
                      rows={3}
                      placeholder="Комментарий для команды"
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <SmallButton onClick={() => void sendDiscussionComment()} disabled={busy}>
                        Добавить комментарий
                      </SmallButton>
                      {isPendingApproval && isAdmin && (
                        <>
                          <SmallButton
                            onClick={() => void handleApprovalDecision("approve")}
                            disabled={busy}
                          >
                            {timing === "schedule" ? "Одобрить и запланировать" : "Одобрить и опубликовать"}
                          </SmallButton>
                          <SmallButton
                            onClick={() => void handleApprovalDecision("reject")}
                            disabled={busy}
                          >
                            Вернуть на доработку
                          </SmallButton>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedChannels.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center text-center text-sm text-muted">
                Выберите канал для предпросмотра
              </div>
            ) : (
              <>
                <div className="mb-3 flex gap-1 overflow-x-auto border-b border-border">
                  {selectedChannels.map((channel) => (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => setActiveChannelId(channel.id)}
                      className={cn(
                        "shrink-0 border-b-2 px-2 py-2 text-xs font-semibold",
                        activeChannel?.id === channel.id
                          ? "border-accent text-accent"
                          : "border-transparent text-muted",
                      )}
                    >
                      {channelProviderSubtitle(channel, postKind)}
                    </button>
                  ))}
                </div>
                {activeChannel && (
                <PostChannelPreview
                  channel={activeChannel}
                  media={media.map((item) => ({
                    fileId: item.file.id,
                    name: item.file.name,
                    mimeType: item.file.mime_type,
                    durationSeconds: item.file.media_metadata?.duration_seconds,
                    width: getFileVideoDimensions(item.file)?.width,
                    height: getFileVideoDimensions(item.file)?.height,
                  }))}
                  textHtml={previewHTML}
                  textPlain={previewPlain}
                  format={previewFormatForChannel(activeChannel, format)}
                  device={device}
                  mediaLayout={telegramMediaLayout}
                  captionPosition={telegramCaptionPosition}
                  mediaOrder={telegramMediaOrder}
                  videoCircle={
                    (telegramVideoNote || format === "short_video") &&
                    media.length === 1 &&
                    isVideoMime(media[0]!.file.mime_type)
                  }
                  pinned={Boolean(
                    activeChannel.provider === "telegram" && telegramPin && canTelegramPin,
                  )}
                  silent={Boolean(
                    activeChannel.provider === "telegram" && telegramSilent && canTelegramSilent,
                  )}
                  detectedUrl={detectedURL}
                  buttonRows={buttonRows.map((row) => row.map(buttonToAPI))}
                  maxButtonRows={maxButtonRows}
                  firstComment={firstComment}
                  locationName={locationName}
                  articleTitle={articleTitle}
                  articleBlocks={articleBlocks}
                  storyMediaPreviewUrl={storyMediaPreviewUrl}
                  timingLabel={
                    timing === "schedule"
                      ? "по расписанию"
                      : timing === "draft"
                        ? "черновик"
                        : "сейчас"
                  }
                  linkPreviewEnabled={
                    activeChannel.provider === "telegram" &&
                    Boolean(activeChannel.publish_capabilities?.composer_link_preview) &&
                    linkPreview
                  }
                />
                )}
                {previewPlain.length > maxText && (
                  <p className="mt-2 text-xs font-semibold text-red-600">
                    Текст будет отклонён: превышен лимит на {previewPlain.length - maxText} символов.
                  </p>
                )}
              </>
            )}
            </div>

            <div className="shrink-0 space-y-3 border-t border-border bg-surface p-4">
              {dirty && (
                <p className="text-center text-[11px] text-muted">Есть несохранённые изменения</p>
              )}
              {isPendingApproval && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Публикация ожидает согласования администратора workspace.
                </p>
              )}
              {isPublishedStory ? (
                <>
                  <button
                    type="button"
                    disabled={busy || composerLocked}
                    onClick={() => void handleSyncTelegramStory()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Обновить в Telegram
                  </button>
                  <button
                    type="button"
                    disabled={busy || composerLocked}
                    onClick={() => void save("draft")}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Сохранить изменения
                  </button>
                  <button
                    type="button"
                    disabled={busy || composerLocked}
                    onClick={() => void handleDeleteTelegramStory()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Удалить из Telegram
                  </button>
                </>
              ) : (
                <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Когда опубликовать
              </p>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    ["draft", "Черновик"],
                    ["now", "Сейчас"],
                    ["schedule", "Расписание"],
                  ] as [Timing, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setTiming(value);
                      markDirty();
                    }}
                    className={cn(
                      "truncate rounded-md border px-1 py-1.5 text-[11px] font-semibold leading-tight transition-colors",
                      timing === value
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-white text-zinc-700 hover:bg-zinc-50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {timing === "schedule" && (
                <div className="space-y-1.5">
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(event) => {
                      setScheduleAt(event.target.value);
                      markDirty();
                    }}
                    className="w-full rounded-md border border-border px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Date();
                      next.setDate(next.getDate() + 1);
                      next.setHours(10, 0, 0, 0);
                      setScheduleAt(
                        new Date(next.getTime() - next.getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16),
                      );
                      markDirty();
                    }}
                    className="w-full rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[10px] font-medium text-violet-800 hover:bg-violet-100"
                  >
                    Завтра 10:00
                  </button>
                </div>
              )}
              <button
                type="button"
                disabled={
                  busy ||
                  composerLocked ||
                  (timing === "now" && publishLocked)
                }
                onClick={() => void save(timing)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                title={
                  timing === "now" && publishLocked
                    ? currentStatus === "published"
                      ? "Публикация уже отправлена — создайте новую запись"
                      : "Публикация уже выполняется"
                    : timing === "schedule" && !scheduleAt
                      ? "Укажите дату и время публикации"
                      : undefined
                }
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : timing === "schedule" ? (
                  <CalendarClock className="h-4 w-4" />
                ) : timing === "draft" ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {timing === "schedule"
                  ? "Запланировать"
                  : timing === "draft"
                    ? "Сохранить"
                    : "Опубликовать"}
              </button>
              <button
                type="button"
                disabled={busy || composerLocked}
                onClick={() => void save("draft")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Сохранить черновик
              </button>
              <button
                type="button"
                disabled={composerLocked}
                onClick={() => {
                  setApprovalModalOpen(true);
                  void loadWorkspaceMembers();
                }}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50",
                  approvalRequired
                    ? "border-amber-300 bg-amber-50 text-amber-900"
                    : "border-border bg-white text-zinc-800",
                )}
              >
                <Users className="h-4 w-4" />
                Согласование
                {approvalRequired && (
                  <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                    вкл
                  </span>
                )}
              </button>
                </>
              )}
            </div>
          </div>
        </aside>
        </div>
      </div>

      {approvalModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setApprovalModalOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Согласование</h3>
                <p className="mt-1 text-xs text-muted">
                  Запрос уйдёт владельцу и администраторам. Редакторы сами публиковать не смогут.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApprovalModalOpen(false)}
                className="rounded-md p-1 text-muted hover:bg-zinc-100"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-4 flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
              <input
                type="checkbox"
                checked={approvalRequired}
                disabled={composerLocked}
                onChange={(event) => {
                  setApprovalRequired(event.target.checked);
                  markDirty();
                }}
                className="mt-0.5"
              />
              <span>
                <span className="font-semibold">Требовать согласование</span>
                <span className="mt-1 block text-xs text-muted">
                  Редакторы отправляют пост администратору перед публикацией.
                </span>
              </span>
            </label>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Кто получит запрос
            </p>
            {membersLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загружаем участников…
              </div>
            ) : approverMembers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-zinc-50 px-4 py-5 text-center">
                <Users className="mx-auto mb-2 h-8 w-8 text-zinc-300" />
                <p className="text-sm font-semibold">Нет администраторов</p>
                <p className="mt-1 text-xs text-muted">
                  Владелец и администраторы workspace получат запрос на согласование.
                </p>
                <Link
                  href="/team"
                  className="mt-3 inline-flex rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  onClick={() => setApprovalModalOpen(false)}
                >
                  Перейти в «Команда»
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {approverMembers.map((member) => (
                  <li
                    key={member.user_id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {member.name?.trim() || member.email}
                      </span>
                      {member.name?.trim() && (
                        <span className="block truncate text-xs text-muted">{member.email}</span>
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-muted">
                      {member.role === "owner"
                        ? "Владелец"
                        : member.role === "admin"
                          ? "Администратор"
                          : member.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
