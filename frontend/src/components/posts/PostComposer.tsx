"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileImage,
  GripVertical,
  Link2,
  Loader2,
  MapPin,
  MessageCircle,
  Monitor,
  Plus,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
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
import { RichTextEditor } from "@/components/posts/RichTextEditor";
import {
  ApiError,
  fetchChannels,
  fetchMe,
  type ChannelListItem,
  type ChannelProvider,
} from "@/lib/api";
import { channelDisplayName } from "@/lib/channelPresentation";
import { composePostText } from "@/lib/generation-api";
import {
  listFiles,
  uploadFile,
  type WorkspaceFile,
} from "@/lib/files-api";
import {
  approvePost,
  commentPost,
  createPost,
  fetchPostApprovalEvents,
  fetchPosts,
  publishPost,
  rejectPost,
  schedulePost,
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
import { cn } from "@/lib/utils";

const PROVIDER_LABEL: Record<ChannelProvider, string> = {
  telegram: "Telegram",
  vk: "VK",
  ok: "Одноклассники",
  max: "MAX",
  rutube: "Rutube",
  dzen: "Дзен",
  youtube: "YouTube",
};

const PROVIDER_COLOR: Record<ChannelProvider, string> = {
  telegram: "#2aabee",
  vk: "#2787f5",
  ok: "#ee8208",
  max: "#7b61ff",
  rutube: "#100943",
  dzen: "#111111",
  youtube: "#ef4444",
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
  reject: "Отклонено",
  comment: "Комментарий",
};

const HASHTAG_SETS = [
  { name: "SMM", value: "#smm #маркетинг #контент #соцсети #продвижение" },
  { name: "Запуск", value: "#запуск #новинка #анонс #скоро #новость" },
];

type Override = { detached: boolean; html: string; plain: string };
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

function htmlToPlain(html: string) {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, "");
  const node = document.createElement("div");
  node.innerHTML = html;
  return (node.innerText || node.textContent || "").trim();
}

type PostKind = "post" | "story" | "short_video";

function formatToPostKind(format: PostContent["format"]): PostKind {
  if (format === "story") return "story";
  if (format === "short_video") return "short_video";
  return "post";
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
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-surface p-4 shadow-sm", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{title}</h2>
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

export function PostComposer() {
  const [channels, setChannels] = useState<ChannelListItem[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
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
  const [articleTitle, setArticleTitle] = useState("");
  const [articleBlocks, setArticleBlocks] = useState<ArticleBlock[]>([
    { type: "paragraph", text: "" },
  ]);
  const [buttonRows, setButtonRows] = useState<EditableButton[][]>([]);
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [mediaPicker, setMediaPicker] = useState(false);
  const [firstComment, setFirstComment] = useState("");
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [linkPreview, setLinkPreview] = useState(true);
  const [telegramMediaLayout, setTelegramMediaLayout] = useState<"separate" | "caption">("separate");
  const [utm, setUTM] = useState({ source: "", medium: "social", campaign: "", shorten: false });
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [evergreenEnabled, setEvergreenEnabled] = useState(false);
  const [intervalDays, setIntervalDays] = useState(7);
  const [maxRuns, setMaxRuns] = useState("");
  const [endsAt, setEndsAt] = useState("");
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const markDirty = useCallback(() => setDirty(true), []);

  const isAdmin = workspaceRole === "owner" || workspaceRole === "admin";
  const isPendingApproval = currentStatus === "pending_approval";
  const composerLocked = isPendingApproval && !isAdmin;

  const loadApprovalEvents = useCallback(async (id: string) => {
    try {
      const data = await fetchPostApprovalEvents(id);
      setApprovalEvents(data.items);
    } catch {
      setApprovalEvents([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [channelData, postData, fileData, meData] = await Promise.all([
        fetchChannels(),
        fetchPosts(),
        listFiles("recent"),
        fetchMe(),
      ]);
      setChannels(channelData.items);
      setPosts(postData.items);
      setRecentFiles(fileData.files);
      setWorkspaceRole(meData.active_workspace?.role ?? meData.workspace?.role ?? null);
      const activeChannels = channelData.items.filter(
        (channel) => channel.status === "active" && channel.publish_capabilities?.text,
      );
      setSelectedIds(activeChannels.map((channel) => channel.id));
      setActiveChannelId(activeChannels[0]?.id ?? null);
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

  const selectedChannels = useMemo(
    () => channels.filter((channel) => selectedIds.includes(channel.id)),
    [channels, selectedIds],
  );
  const activeChannel =
    selectedChannels.find((channel) => channel.id === activeChannelId) ?? selectedChannels[0] ?? null;
  const telegramChannels = selectedChannels.filter((channel) => channel.provider === "telegram");
  const currentOverride = activeChannel ? overrides[activeChannel.id] : undefined;
  const previewHTML = currentOverride?.detached ? currentOverride.html : html;
  const previewPlain = currentOverride?.detached ? currentOverride.plain : plain;
  const editorHTML = activeChannelId && currentOverride?.detached ? currentOverride.html : html;
  const editorPlain = activeChannelId && currentOverride?.detached ? currentOverride.plain : plain;
  const detectedURL = previewPlain.match(/https?:\/\/[^\s<]+/)?.[0] ?? "";
  const maxText = activeChannel?.publish_capabilities?.max_text_length || 4096;
  const hashtagCount = (previewPlain.match(/#[^\s#]+/g) || []).length;
  const canArticle = telegramChannels.some(
    (channel) => channel.publish_capabilities?.telegram_rich_messages,
  );
  const articleOnlyTelegram =
    format !== "message" &&
    selectedChannels.some((channel) => channel.provider !== "telegram");
  const canButtons =
    telegramChannels.length > 0 &&
    telegramChannels.every((channel) => channel.publish_capabilities?.inline_buttons);
  const maxButtons = Math.min(
    ...telegramChannels.map((channel) => channel.publish_capabilities?.max_buttons || 100),
    100,
  );
  const noMediaDelivery = selectedChannels.filter(
    (channel) => !channel.publish_capabilities?.composer_media,
  );
  const noCommentDelivery = selectedChannels.filter(
    (channel) => !channel.publish_capabilities?.composer_first_comment,
  );
  const noLocationDelivery = selectedChannels.filter(
    (channel) => !channel.publish_capabilities?.composer_location,
  );
  const noLinkPreviewDelivery = selectedChannels.filter(
    (channel) => !channel.publish_capabilities?.composer_link_preview,
  );

  function resetNew() {
    if (dirty && !window.confirm("Несохранённые изменения будут потеряны. Продолжить?")) return;
    const active = channels.filter(
      (channel) => channel.status === "active" && channel.publish_capabilities?.text,
    );
    setPostId(null);
    setSelectedIds(active.map((channel) => channel.id));
    setActiveChannelId(active[0]?.id ?? null);
    setHTML("");
    setPlain("");
    setOverrides({});
    setFormat("message");
    setPostKind("post");
    setArticleTitle("");
    setArticleBlocks([{ type: "paragraph", text: "" }]);
    setButtonRows([]);
    setMedia([]);
    setTelegramMediaLayout("separate");
    setFirstComment("");
    setLocationName("");
    setLatitude("");
    setLongitude("");
    setUTM({ source: "", medium: "social", campaign: "", shorten: false });
    setApprovalRequired(false);
    setEvergreenEnabled(false);
    setIntervalDays(7);
    setMaxRuns("");
    setEndsAt("");
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
    if (
      post.status !== "draft" &&
      post.status !== "canceled" &&
      post.status !== "failed" &&
      post.status !== "pending_approval"
    ) {
      setError("Редактировать можно только черновики, отменённые, неудачные публикации и записи на согласовании");
      return;
    }
    const targetOverrides: Record<string, Override> = {};
    for (const target of post.targets) {
      const targetHTML = target.settings?.content?.text ?? post.content.text;
      targetOverrides[target.channel_id] = {
        detached: Boolean(target.settings?.content?.text),
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
    setTelegramMediaLayout(post.settings.telegram_media_layout === "caption" ? "caption" : "separate");
    const storedUTM = post.targets[0]?.settings?.settings?.utm;
    setUTM({
      source: storedUTM?.source ?? "",
      medium: storedUTM?.medium ?? "social",
      campaign: storedUTM?.campaign ?? "",
      shorten: storedUTM?.shorten ?? false,
    });
    setApprovalRequired(Boolean(post.settings.approval_required));
    setEvergreenEnabled(Boolean(post.settings.recurrence?.enabled));
    setIntervalDays(post.settings.recurrence?.interval_days ?? 7);
    setMaxRuns(
      post.settings.recurrence?.max_runs != null ? String(post.settings.recurrence.max_runs) : "",
    );
    setEndsAt(post.settings.recurrence?.ends_at ? post.settings.recurrence.ends_at.slice(0, 16) : "");
    setCurrentStatus(post.status);
    void loadApprovalEvents(post.id);
    setTiming("draft");
    setScheduleAt(post.due_at ? post.due_at.slice(0, 16) : "");
    setError(null);
    setSuccess(null);
    setDirty(false);
  }

  function toggleChannel(channel: ChannelListItem) {
    if (channel.status !== "active" || !channel.publish_capabilities?.text) return;
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
    const separator = editorPlain.trim() ? "<br><br>" : "";
    updateCurrentText(`${editorHTML}${separator}${value}`, `${editorPlain}\n\n${value}`.trim());
  }

  function buildSettings(): PostSettings {
    const hasCoordinates = latitude.trim() !== "" && longitude.trim() !== "";
    return {
      first_comment: firstComment.trim() || undefined,
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
      recurrence: evergreenEnabled
        ? {
            enabled: true,
            interval_days: intervalDays,
            max_runs: maxRuns.trim() ? Number(maxRuns) : undefined,
            ends_at: endsAt ? new Date(endsAt).toISOString() : undefined,
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
      text:
        format === "message" || format === "story" || format === "short_video" ? html : "",
      parse_mode: "HTML",
      entities: [],
      buttons: format === "message" ? apiButtons : [],
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
          settings.content = { text: override.html, parse_mode: "HTML", entities: [] };
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
    if (kind === "story") {
      setFormat("story");
      setMedia((current) => current.slice(0, 1));
      return;
    }
    if (kind === "short_video") {
      setFormat("short_video");
      setMedia((current) => {
        const video = current.find((item) => isVideoMime(item.file.mime_type));
        return video ? [video] : current.slice(0, 1);
      });
      return;
    }
    setFormat(format === "article" || format === "rich_message" ? "article" : "message");
  }

  async function runAIAction(label: string) {
    const taskMap: Record<string, { task: string; tone?: string }> = {
      "Переписать с AI": { task: "rewrite" },
      Сократить: { task: "shorten" },
      "Изменить тон": { task: "tone", tone: window.prompt("Укажите желаемый тон", "дружелюбный") ?? "" },
      "Подобрать хэштеги": { task: "hashtags" },
    };
    const mapped = taskMap[label];
    if (!mapped) return;
    if (mapped.task === "tone" && !mapped.tone?.trim()) return;
    const sourceText = editorPlain.trim();
    if (!sourceText) {
      setError("Сначала введите текст публикации");
      return;
    }
    setAiBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const { text } = await composePostText({
        task: mapped.task,
        text: sourceText,
        tone: mapped.tone,
      });
      if (mapped.task === "hashtags") {
        appendHashtags(text);
      } else {
        updateCurrentText(plainToEditorHTML(text), text);
      }
      setSuccess("Текст обновлён с помощью AI");
    } catch (aiError) {
      setError(errorText(aiError, "Не удалось выполнить AI-действие"));
    } finally {
      setAiBusy(false);
    }
  }

  function validate(action: Timing) {
    if (selectedChannels.length === 0) return "Выберите хотя бы один активный канал";
    if (postKind === "story" || format === "story") {
      if (action !== "draft" && selectedChannels.some((channel) => channel.provider !== "telegram")) {
        return "История поддерживается только для Telegram";
      }
      if (action !== "draft" && media.length !== 1) {
        return "Для истории прикрепите ровно одно фото или видео";
      }
    }
    if (postKind === "short_video" || format === "short_video") {
      if (action !== "draft" && selectedChannels.some((channel) => channel.provider !== "telegram")) {
        return "Короткое видео поддерживается только для Telegram";
      }
      if (action !== "draft" && media.length !== 1) {
        return "Для короткого видео прикрепите ровно один файл";
      }
      if (action !== "draft" && media.length === 1 && !isVideoMime(media[0]!.file.mime_type)) {
        return "Короткое видео должно быть файлом video/*";
      }
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
      if (!channel.publish_capabilities?.text) {
        return `${PROVIDER_LABEL[channel.provider]}: обычные текстовые посты не поддерживаются`;
      }
      const limit = channel.publish_capabilities?.max_text_length;
      if (format === "message" && limit && text.length > limit) {
        return `${PROVIDER_LABEL[channel.provider]}: текст длиннее лимита ${limit}`;
      }
      if (
        action !== "draft" &&
        media.length > 0 &&
        channel.provider === "telegram" &&
        telegramMediaLayout === "caption" &&
        text.length > 1024
      ) {
        return "Подпись к медиа Telegram не должна превышать 1024 символов";
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
    if (action === "schedule" && (!scheduleAt || new Date(scheduleAt) <= new Date())) {
      return "Выберите дату и время в будущем";
    }
    if (evergreenEnabled && intervalDays < 1) {
      return "Интервал evergreen-повтора должен быть не меньше 1 дня";
    }
    if (maxRuns.trim() && Number(maxRuns) < 1) {
      return "Лимит повторов должен быть не меньше 1";
    }
    return null;
  }

  async function handleApprovalDecision(action: "approve" | "reject") {
    if (!postId) return;
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
          : await rejectPost(postId, { comment: discussionComment.trim() || undefined });
      setPosts((current) => [finalPost, ...current.filter((item) => item.id !== finalPost.id)]);
      setCurrentStatus(finalPost.status);
      await loadApprovalEvents(finalPost.id);
      setDiscussionComment("");
      setSuccess(action === "approve" ? "Публикация одобрена" : "Публикация возвращена в черновик");
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
      const saved = postId
        ? await updatePost(postId, buildPayload())
        : await createPost(buildPayload());
      let finalPost = saved;
      if (action === "schedule") {
        finalPost = await schedulePost(saved.id, new Date(scheduleAt).toISOString());
      } else if (action === "now") {
        finalPost = await publishPost(saved.id);
      }
      setPostId(finalPost.id);
      setCurrentStatus(finalPost.status);
      setPosts((current) => [finalPost, ...current.filter((item) => item.id !== finalPost.id)]);
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
      setError(errorText(saveError, "Не удалось сохранить публикацию"));
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
      setMedia((current) => [
        ...current,
        ...uploaded
          .filter((file) => !current.some((item) => item.file.id === file.id))
          .map((file) => ({ file, alt: "" })),
      ]);
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

  const editorChannel = activeChannel
    ? overrides[activeChannel.id]?.detached
      ? activeChannel
      : null
    : null;

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
        title={postId ? "Редактирование поста" : "Новый пост"}
        description="Создайте общую публикацию, адаптируйте её для каналов и выберите время отправки."
        actions={
          <button
            type="button"
            onClick={resetNew}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            <Plus className="h-4 w-4" />
            Новый пост
          </button>
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
        <div className="min-w-0 space-y-4">
          <div className="inline-flex rounded-lg bg-zinc-200/70 p-1">
            {(
              [
                { id: "post" as const, label: "Пост" },
                { id: "story" as const, label: "История" },
                { id: "short_video" as const, label: "Короткое видео" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => switchPostKind(id)}
                disabled={composerLocked}
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
              ? "История — одно вертикальное фото или видео в Telegram с подписью."
              : postKind === "short_video"
                ? "Короткое видео — один video/* файл в Telegram с подписью."
                : "Обычный пост: текст, медиа и статья Telegram."}
          </p>

          {isPendingApproval && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Публикация на согласовании</p>
              <p className="mt-1 text-xs">
                {isAdmin
                  ? "Вы можете одобрить или отклонить запись во вкладке «Обсуждение»."
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
                  const active = channels.filter(
                    (channel) =>
                      channel.status === "active" && channel.publish_capabilities?.text,
                  );
                  setSelectedIds(
                    selectedIds.length === active.length ? [] : active.map((channel) => channel.id),
                  );
                  setActiveChannelId(active[0]?.id ?? null);
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
                  const supportsPost =
                    channel.status === "active" && Boolean(channel.publish_capabilities?.text);
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      disabled={!supportsPost}
                      onClick={() => toggleChannel(channel)}
                      title={
                        channel.status !== "active"
                          ? "Канал недоступен"
                          : !channel.publish_capabilities?.text
                            ? "Канал не поддерживает обычный текстовый пост"
                            : undefined
                      }
                      className={cn(
                        "flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors",
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
                        size="sm"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {channelDisplayName(channel)}
                        </span>
                        <span className="block text-xs text-muted">
                          {PROVIDER_LABEL[channel.provider]}
                          {channel.status !== "active"
                            ? " · недоступен"
                            : !channel.publish_capabilities?.text
                              ? " · только другой формат"
                              : ""}
                        </span>
                      </span>
                    </button>
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
                  !editorChannel ? "border-accent bg-accent/10 text-accent" : "border-border",
                )}
              >
                Общий текст
              </button>
              {selectedChannels.map((channel) => {
                const detached = overrides[channel.id]?.detached;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setActiveChannelId(channel.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                      activeChannelId === channel.id && detached
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border",
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: PROVIDER_COLOR[channel.provider] }}
                    />
                    {channelDisplayName(channel)}
                    {detached && <span title="Отдельная версия">●</span>}
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
                      ? "Отдельная версия будет применена при публикации в этот канал"
                      : "Сейчас канал использует общий текст"}
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
                    {overrides[activeChannel.id]?.detached ? "Вернуть общий" : "Отделить версию"}
                  </SmallButton>
                </div>
              </div>
            )}

            <div className="mb-3 flex flex-wrap gap-2">
              {["Переписать с AI", "Сократить", "Изменить тон", "Подобрать хэштеги"].map((label) => (
                <button
                  key={label}
                  type="button"
                  disabled={aiBusy || composerLocked || format !== "message"}
                  onClick={() => void runAIAction(label)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-blue-100 disabled:opacity-50"
                >
                  {aiBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {label}
                </button>
              ))}
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

            {format === "message" || format === "story" || format === "short_video" ? (
              <RichTextEditor
                html={editorHTML}
                onChange={updateCurrentText}
                placeholder={
                  format === "story"
                    ? "Подпись к истории (необязательно)…"
                    : format === "short_video"
                      ? "Подпись к видео (необязательно)…"
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
                const limit = channel.publish_capabilities?.max_text_length || 0;
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

          {canButtons && (
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

          <Card title="Медиа">
            <input
              ref={fileInputRef}
              type="file"
              multiple
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
            {media.length > 0 && noMediaDelivery.length > 0 && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                Медиа сохранится в черновике, но сейчас не будет доставлено в{" "}
                {noMediaDelivery
                  .map((channel) => PROVIDER_LABEL[channel.provider])
                  .join(", ")}. Публикация и планирование заблокированы.
              </div>
            )}
            {media.length > 0 && telegramChannels.length > 0 && (
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
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  {telegramMediaLayout === "caption" ? (
                    <>
                      Текст уйдёт подписью к медиа (лимит 1024 символа). При одном файле кнопки
                      прикрепятся к тому же сообщению; при альбоме — отдельным сообщением с
                      кнопками.
                    </>
                  ) : (
                    <>
                      В Telegram вложения отправляются первым сообщением, затем текст и кнопки —
                      вторым. Это две отдельные записи в канале.
                    </>
                  )}
                </div>
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
                          setMedia((current) =>
                            selected
                              ? current.filter((item) => item.file.id !== file.id)
                              : [...current, { file, alt: "" }],
                          );
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

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Дополнения">
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
                {firstComment.trim() && noCommentDelivery.length > 0 && (
                  <p className="mt-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                    Сохранится в черновике, но пока не доставляется в{" "}
                    {noCommentDelivery.map((channel) => PROVIDER_LABEL[channel.provider]).join(", ")}.
                  </p>
                )}
              </label>
              <div className="mt-3">
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
                  API принимает координаты; поиск места по названию пока не подключён.
                </p>
                {(locationName.trim() || latitude || longitude) &&
                  noLocationDelivery.length > 0 && (
                    <p className="mt-1 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-medium text-red-700">
                      Геопозиция сохранится в черновике, но не доставляется в{" "}
                      {noLocationDelivery
                        .map((channel) => PROVIDER_LABEL[channel.provider])
                        .join(", ")}. Публикация и планирование заблокированы.
                    </p>
                  )}
              </div>
            </Card>

            <Card title="Ссылка и UTM">
              {detectedURL ? (
                <>
                  <p className="truncate text-sm font-medium text-accent">{detectedURL}</p>
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={linkPreview}
                      onChange={(event) => {
                        setLinkPreview(event.target.checked);
                        markDirty();
                      }}
                    />
                    Показывать превью ссылки
                  </label>
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
                  {noLinkPreviewDelivery.length > 0 && (
                    <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                      Управление превью ссылки не подключено для{" "}
                      {noLinkPreviewDelivery
                        .map((channel) => PROVIDER_LABEL[channel.provider])
                        .join(", ")}. Оставьте значение по умолчанию; отключение превью
                      заблокирует публикацию.
                    </p>
                  )}
                </>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted">
                  <Link2 className="h-4 w-4" />
                  Добавьте HTTP(S)-ссылку в текст — здесь появятся настройки.
                </p>
              )}
            </Card>
          </div>

          <Card title="Когда опубликовать">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["draft", "Черновик"],
                  ["now", "Сейчас"],
                  ["schedule", "По расписанию"],
                ] as [Timing, string][]
              ).map(([value, label]) => (
                <SmallButton
                  key={value}
                  active={timing === value}
                  onClick={() => {
                    setTiming(value);
                    markDirty();
                  }}
                >
                  {label}
                </SmallButton>
              ))}
            </div>
            {timing === "schedule" && (
              <div className="mt-3 space-y-3">
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(event) => {
                    setScheduleAt(event.target.value);
                    markDirty();
                  }}
                  className="rounded-lg border border-border px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-violet-800">
                  <span>
                    Рекомендация: будний день, 10:00. Это общий ориентир, не персональный AI-прогноз.
                  </span>
                  <SmallButton
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
                  >
                    Использовать
                  </SmallButton>
                </div>
              </div>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-xs">
                <input
                  type="checkbox"
                  checked={evergreenEnabled}
                  disabled={composerLocked}
                  onChange={(event) => {
                    setEvergreenEnabled(event.target.checked);
                    markDirty();
                  }}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-semibold">Evergreen-повторы</span>
                  <span className="mt-1 block text-muted">
                    После успешной публикации создаётся новая запланированная копия.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-xs">
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
                  <span className="font-semibold">Согласование</span>
                  <span className="mt-1 block text-muted">
                    Редакторы отправляют пост администратору перед публикацией.
                  </span>
                </span>
              </label>
            </div>
            {evergreenEnabled && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <label className="text-xs">
                  <span className="mb-1 block text-muted">Интервал, дней</span>
                  <input
                    type="number"
                    min={1}
                    value={intervalDays}
                    disabled={composerLocked}
                    onChange={(event) => {
                      setIntervalDays(Number(event.target.value) || 1);
                      markDirty();
                    }}
                    className="w-full rounded-md border border-border px-2 py-1.5"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block text-muted">Макс. повторов</span>
                  <input
                    type="number"
                    min={1}
                    value={maxRuns}
                    disabled={composerLocked}
                    onChange={(event) => {
                      setMaxRuns(event.target.value);
                      markDirty();
                    }}
                    placeholder="Без лимита"
                    className="w-full rounded-md border border-border px-2 py-1.5"
                  />
                </label>
                <label className="text-xs">
                  <span className="mb-1 block text-muted">Завершить после</span>
                  <input
                    type="datetime-local"
                    value={endsAt}
                    disabled={composerLocked}
                    onChange={(event) => {
                      setEndsAt(event.target.value);
                      markDirty();
                    }}
                    className="w-full rounded-md border border-border px-2 py-1.5"
                  />
                </label>
              </div>
            )}
            {isPendingApproval && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Публикация ожидает согласования администратора workspace.
              </p>
            )}
          </Card>

          <Card
            title="Черновики и публикации"
            action={<span className="text-xs text-muted">{posts.length} записей</span>}
          >
            {posts.length === 0 ? (
              <p className="text-sm text-muted">Сохранённых публикаций пока нет.</p>
            ) : (
              <div className="divide-y divide-border">
                {posts.map((post) => {
                  const text =
                    post.content.text ||
                    post.content.rich_message?.title ||
                    post.content.rich_message?.blocks?.[0]?.text ||
                    "Без текста";
                  const editable = ["draft", "failed", "canceled"].includes(post.status);
                  const reviewable = post.status === "pending_approval";
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => (editable || reviewable) && openPost(post)}
                      className={cn(
                        "flex w-full items-center gap-3 py-3 text-left",
                        !editable && !reviewable && "cursor-default",
                      )}
                    >
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[11px] font-semibold",
                          post.status === "published"
                            ? "bg-emerald-50 text-emerald-700"
                            : post.status === "pending_approval"
                              ? "bg-amber-50 text-amber-800"
                            : post.status === "failed"
                              ? "bg-red-50 text-red-700"
                              : "bg-zinc-100 text-zinc-700",
                        )}
                      >
                        {STATUS_LABEL[post.status]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{htmlToPlain(text)}</span>
                        <span className="block text-xs text-muted">
                          {new Date(post.updated_at).toLocaleString("ru-RU")} · {post.targets.length} каналов
                        </span>
                      </span>
                      {editable && <span className="text-xs text-accent">Открыть</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="sticky bottom-0 z-20 -mx-2 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-white/95 p-3 shadow-[0_-8px_24px_rgba(0,0,0,0.04)] backdrop-blur">
            <span className="text-xs text-muted">
              {dirty ? "Есть несохранённые изменения" : postId ? "Все изменения сохранены" : ""}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy || composerLocked}
                onClick={() => void save("draft")}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Сохранить черновик
              </button>
              {timing === "schedule" ? (
                <button
                  type="button"
                  disabled={busy || composerLocked}
                  onClick={() => void save("schedule")}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <CalendarClock className="h-4 w-4" />
                  Запланировать
                </button>
              ) : timing === "now" ? (
                <button
                  type="button"
                  disabled={busy || composerLocked}
                  onClick={() => void save("now")}
                  className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Опубликовать
                </button>
              ) : null}
            </div>
          </div>
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

        <aside className="post-composer-preview min-w-0">
          <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
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
                            Одобрить
                          </SmallButton>
                          <SmallButton
                            onClick={() => void handleApprovalDecision("reject")}
                            disabled={busy}
                          >
                            Отклонить
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
                      {PROVIDER_LABEL[channel.provider]}
                    </button>
                  ))}
                </div>
                <div
                  className={cn(
                    "mx-auto overflow-hidden rounded-2xl border border-border bg-zinc-100 transition-all",
                    device === "mobile" ? "max-w-[300px]" : "max-w-full",
                  )}
                >
                  <div className="flex items-center gap-2 border-b border-border bg-white p-3">
                    {activeChannel && (
                      <ChannelAvatar
                        name={activeChannel.name}
                        metadata={activeChannel.metadata}
                        channelId={activeChannel.id}
                        provider={activeChannel.provider}
                        size="sm"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">
                        {activeChannel ? channelDisplayName(activeChannel) : "Канал"}
                      </p>
                      <p className="text-[10px] text-muted">
                        {activeChannel ? PROVIDER_LABEL[activeChannel.provider] : ""}
                      </p>
                    </div>
                  </div>
                  <div className="p-3">
                    {media.length > 0 &&
                    activeChannel?.publish_capabilities?.composer_media ? (
                      <div className="mb-2 grid grid-cols-2 gap-1 overflow-hidden rounded-lg">
                        {media.slice(0, 4).map((item) => (
                          <FileThumbnail
                            key={item.file.id}
                            fileId={item.file.id}
                            name={item.file.name}
                            mimeType={item.file.mime_type}
                            size="sm"
                            className={media.length === 1 ? "col-span-2 aspect-video" : ""}
                          />
                        ))}
                      </div>
                    ) : media.length > 0 ? (
                      <div className="mb-2 rounded-lg border border-red-200 bg-red-50 p-2 text-[10px] font-medium text-red-700">
                        Медиа прикреплено к черновику, но не доставляется этим каналом.
                      </div>
                    ) : null}
                    <div className="rounded-xl border border-border bg-white p-3 text-[13px] leading-5">
                      {format === "message" ? (
                        previewHTML ? (
                          <div
                            className="break-words whitespace-pre-wrap [&_blockquote]:border-l-2 [&_blockquote]:border-blue-300 [&_blockquote]:pl-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-zinc-100 [&_pre]:p-2"
                            dangerouslySetInnerHTML={{ __html: previewHTML }}
                          />
                        ) : (
                          <span className="text-muted">Текст поста появится здесь…</span>
                        )
                      ) : (
                        <article>
                          {articleTitle && <h3 className="mb-2 text-base font-bold">{articleTitle}</h3>}
                          {articleBlocks.map((block, index) => (
                            <ArticleBlockPreview key={index} block={block} />
                          ))}
                        </article>
                      )}
                      {previewPlain.length > maxText && (
                        <p className="mt-2 text-xs font-semibold text-red-600">
                          Текст будет отклонён: превышен лимит на {previewPlain.length - maxText} символов.
                        </p>
                      )}
                      {buttonRows.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {buttonRows.map((row, index) => (
                            <div key={index} className="grid grid-flow-col gap-1">
                              {row.map((button, buttonIndex) => (
                                <span
                                  key={buttonIndex}
                                  className={cn(
                                    "truncate rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-center text-[11px] font-semibold text-zinc-700",
                                    button.style === "primary" &&
                                      "border-blue-200 bg-blue-50 text-accent",
                                    button.style === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                                    button.style === "danger" && "border-red-200 bg-red-50 text-red-700",
                                  )}
                                >
                                  {button.icon_custom_emoji_id && (
                                    <span
                                      className="mr-1"
                                      title={`Custom emoji ID: ${button.icon_custom_emoji_id}`}
                                    >
                                      ◈
                                    </span>
                                  )}
                                  {button.text || "Кнопка"}
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                      {locationName &&
                      activeChannel?.publish_capabilities?.composer_location ? (
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
                          <MapPin className="h-3 w-3" />
                          {locationName}
                        </p>
                      ) : locationName ? (
                        <p className="mt-2 text-[10px] font-medium text-red-600">
                          Геопозиция сохранена, но не будет доставлена.
                        </p>
                      ) : null}
                      {firstComment &&
                      activeChannel?.publish_capabilities?.composer_first_comment ? (
                        <div className="mt-2 border-t border-dashed border-border pt-2 text-xs text-muted">
                          Первый комментарий: {firstComment}
                        </div>
                      ) : firstComment ? (
                        <p className="mt-2 text-[10px] font-medium text-red-600">
                          Первый комментарий сохранён, но не будет доставлен.
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-2 text-right text-[10px] text-muted">
                      {timing === "schedule" ? "по расписанию" : timing === "draft" ? "черновик" : "сейчас"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
