"use client";

import { BellOff, ExternalLink, Eye, Loader2, MapPin, Pin, Play } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ChannelAvatar } from "@/components/channels/ChannelAvatar";
import { channelDisplayName } from "@/lib/channelPresentation";
import type { ChannelListItem, ChannelProvider } from "@/lib/api";
import { getCachedFileMediaUrl } from "@/lib/file-media-cache";
import { formatMediaDuration, isLandscapeVideo, isVideoMime } from "@/lib/file-media";
import type { TelegramButton, TelegramRichBlock } from "@/lib/posts-api";
import type { TelegramStorySettings } from "@/lib/telegram-story";
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

const TELEGRAM_PREVIEW_BG = "/app/telegram-chat-bg.png";
const MAX_PREVIEW_BG = "/app/max-chat-bg.png";

function telegramButtonColors(style?: TelegramButton["style"]) {
  switch (style) {
    case "primary":
      return "bg-[#3390ec] hover:bg-[#2d84db] text-white";
    case "success":
      return "bg-[#4faf4f] hover:bg-[#48a048] text-white";
    case "danger":
      return "bg-[#e05356] hover:bg-[#d44a4d] text-white";
    default:
      return "bg-[#5bcbe7] hover:bg-[#52bdd8] text-white";
  }
}

function previewClockLabel(timingLabel?: string) {
  if (timingLabel === "по расписанию") return timingLabel;
  if (timingLabel === "черновик") return timingLabel;
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function linkPreviewDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export type PreviewMediaItem = {
  fileId: string;
  name: string;
  mimeType: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
};

type MaxButton = { text: string; url: string };

export type PostChannelPreviewProps = {
  channel: ChannelListItem;
  media: PreviewMediaItem[];
  textHtml: string;
  textPlain: string;
  format: string;
  device: "mobile" | "desktop";
  mediaLayout: "separate" | "caption";
  captionPosition: "above" | "below";
  mediaOrder: "media_first" | "text_first";
  videoCircle: boolean;
  pinned: boolean;
  silent: boolean;
  detectedUrl: string;
  buttonRows: TelegramButton[][];
  maxButtonRows: MaxButton[][];
  firstComment?: string;
  locationName?: string;
  articleTitle?: string;
  articleBlocks?: TelegramRichBlock[];
  storyMediaPreviewUrl?: string | null;
  timingLabel?: string;
  linkPreviewEnabled?: boolean;
};

function ArticleBlockPreview({ block }: { block: TelegramRichBlock }) {
  if (block.type === "heading") {
    const sizes = ["text-xl", "text-lg", "text-base", "text-sm", "text-xs", "text-[11px]"];
    return <h4 className={cn("my-2 font-bold", sizes[(block.size ?? 2) - 1])}>{block.text}</h4>;
  }
  if (block.type === "quote" || block.type === "pullquote") {
    return (
      <blockquote className="my-2 border-l-2 border-accent pl-2 italic">
        <p>{block.text}</p>
      </blockquote>
    );
  }
  if (block.type === "code") {
    return (
      <pre className="my-2 overflow-x-auto bg-zinc-100 p-2 font-mono text-xs">{block.text}</pre>
    );
  }
  return <p className="my-1 whitespace-pre-wrap">{block.text}</p>;
}

function PreviewMediaTile({
  item,
  single = false,
  overlayExtra,
  className,
}: {
  item: PreviewMediaItem;
  single?: boolean;
  overlayExtra?: number;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isVideo = isVideoMime(item.mimeType, item.name);
  const isImage = item.mimeType.startsWith("image/");

  useEffect(() => {
    if (!isImage && !isVideo) return;
    let cancelled = false;
    void getCachedFileMediaUrl(item.fileId, "preview")
      .then((downloadUrl) => {
        if (!cancelled) setUrl(downloadUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [item.fileId, isImage, isVideo]);

  const duration =
    item.durationSeconds != null && item.durationSeconds > 0
      ? formatMediaDuration(item.durationSeconds)
      : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-zinc-200",
        single ? "w-full" : "min-h-0 min-w-0",
        className,
      )}
    >
      {!url && !failed && (isImage || isVideo) ? (
        <div className="flex aspect-square min-h-[80px] items-center justify-center text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : isVideo && url && !failed ? (
        <>
          <video
            src={url}
            muted
            preload="metadata"
            className={cn(
              single ? "block max-h-[480px] w-full object-contain" : "absolute inset-0 h-full w-full object-cover",
            )}
          />
          {!overlayExtra && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white">
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              </div>
            </div>
          )}
        </>
      ) : isImage && url && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn(
            single
              ? "block max-h-[480px] w-full object-contain"
              : "absolute inset-0 h-full w-full object-cover",
          )}
        />
      ) : (
        <div className="flex aspect-square items-center justify-center text-[10px] text-muted">
          {item.name}
        </div>
      )}
      {duration && !overlayExtra && (
        <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1 py-0.5 text-[10px] font-medium tabular-nums text-white">
          {duration}
        </span>
      )}
      {overlayExtra != null && overlayExtra > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-semibold text-white">
          +{overlayExtra}
        </div>
      )}
    </div>
  );
}

function AlbumGrid({ items, className }: { items: PreviewMediaItem[]; className?: string }) {
  const count = items.length;
  if (count === 0) return null;

  const grid = (() => {
  if (count === 1) {
    return <PreviewMediaTile item={items[0]!} single />;
  }

  const gap = "gap-[2px]";

  if (count === 2) {
    return (
      <div className={cn("grid grid-cols-2", gap)}>
        {items.map((item) => (
          <PreviewMediaTile key={item.fileId} item={item} className="aspect-square" />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className={cn("grid grid-cols-2 grid-rows-2", gap)}>
        <PreviewMediaTile item={items[0]!} className="row-span-2 min-h-[160px]" />
        <PreviewMediaTile item={items[1]!} className="aspect-square" />
        <PreviewMediaTile item={items[2]!} className="aspect-square" />
      </div>
    );
  }

  if (count === 4) {
    return (
      <div className={cn("grid grid-cols-2 grid-rows-2", gap)}>
        {items.map((item) => (
          <PreviewMediaTile key={item.fileId} item={item} className="aspect-square" />
        ))}
      </div>
    );
  }

  if (count === 5) {
    return (
      <div className={cn("flex flex-col", gap)}>
        <div className={cn("grid grid-cols-2", gap)}>
          <PreviewMediaTile item={items[0]!} className="aspect-[4/3]" />
          <PreviewMediaTile item={items[1]!} className="aspect-[4/3]" />
        </div>
        <div className={cn("grid grid-cols-3", gap)}>
          {items.slice(2, 5).map((item) => (
            <PreviewMediaTile key={item.fileId} item={item} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  if (count === 6) {
    return (
      <div className={cn("grid grid-cols-3 grid-rows-2", gap)}>
        {items.map((item) => (
          <PreviewMediaTile key={item.fileId} item={item} className="aspect-square" />
        ))}
      </div>
    );
  }

  if (count === 7) {
    return (
      <div className={cn("flex flex-col", gap)}>
        <div className={cn("grid grid-cols-3", gap)}>
          {items.slice(0, 3).map((item) => (
            <PreviewMediaTile key={item.fileId} item={item} className="aspect-square" />
          ))}
        </div>
        <div className={cn("grid grid-cols-4", gap)}>
          {items.slice(3, 7).map((item) => (
            <PreviewMediaTile key={item.fileId} item={item} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  if (count === 8) {
    return (
      <div className={cn("grid grid-cols-4 grid-rows-2", gap)}>
        {items.map((item) => (
          <PreviewMediaTile key={item.fileId} item={item} className="aspect-square" />
        ))}
      </div>
    );
  }

  if (count === 9) {
    return (
      <div className={cn("grid grid-cols-3 grid-rows-3", gap)}>
        {items.map((item) => (
          <PreviewMediaTile key={item.fileId} item={item} className="aspect-square" />
        ))}
      </div>
    );
  }

  const visible = items.slice(0, 10);
  const extra = items.length - 10;
  return (
    <div className={cn("flex flex-col", gap)}>
      <div className={cn("grid grid-cols-3", gap)}>
        {visible.slice(0, 3).map((item) => (
          <PreviewMediaTile key={item.fileId} item={item} className="aspect-square" />
        ))}
      </div>
      <div className={cn("grid grid-cols-3", gap)}>
        {visible.slice(3, 6).map((item) => (
          <PreviewMediaTile key={item.fileId} item={item} className="aspect-square" />
        ))}
      </div>
      <div className={cn("grid grid-cols-4", gap)}>
        {visible.slice(6, 9).map((item) => (
          <PreviewMediaTile key={item.fileId} item={item} className="aspect-square" />
        ))}
        <PreviewMediaTile
          item={visible[9]!}
          className="aspect-square"
          overlayExtra={extra > 0 ? extra : undefined}
        />
      </div>
    </div>
  );
  })();

  return <div className={cn("overflow-hidden", className)}>{grid}</div>;
}

function TextContent({
  format,
  textHtml,
  articleTitle,
  articleBlocks,
}: {
  format: string;
  textHtml: string;
  articleTitle?: string;
  articleBlocks?: TelegramRichBlock[];
}) {
  if (format === "article" || format === "rich_message") {
    return (
      <article>
        {articleTitle && <h3 className="mb-2 text-base font-bold">{articleTitle}</h3>}
        {articleBlocks?.map((block, index) => (
          <ArticleBlockPreview key={index} block={block} />
        ))}
      </article>
    );
  }
  if (textHtml) {
    return (
      <div
        className="telegram-text break-words whitespace-pre-wrap text-[15px] leading-[1.3125] text-black [&_a]:text-[#3390ec] [&_a]:no-underline hover:[&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#3390ec]/40 [&_blockquote]:pl-2 [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-black/5 [&_pre]:p-2 [&_span.tg-spoiler]:rounded [&_span.tg-spoiler]:bg-zinc-300 [&_span.tg-spoiler]:text-zinc-300"
        dangerouslySetInnerHTML={{ __html: textHtml }}
      />
    );
  }
  return <span className="text-[#6d7883]">Текст поста появится здесь…</span>;
}

function LinkPreviewCard({ url }: { url: string }) {
  const domain = linkPreviewDomain(url);
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-black/5">
      <div className="h-14 bg-gradient-to-br from-[#c5dff5] via-[#d4e8f7] to-[#e8f0f5]" />
      <div className="border-t border-black/5 bg-[#f0f2f5] px-2.5 py-1.5">
        <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[#3390ec]">
          {domain}
        </p>
        <p className="truncate text-[11px] text-[#6d7883]">{url}</p>
      </div>
    </div>
  );
}

function TelegramMetaOnMedia({
  time,
  silent,
}: {
  time: string;
  silent?: boolean;
}) {
  return (
    <span className="absolute bottom-1.5 right-1.5 z-10 flex items-center gap-0.5 rounded-full bg-black/45 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
      {silent && <BellOff className="h-3 w-3 shrink-0 opacity-90" />}
      {time}
    </span>
  );
}

function TelegramMetaInline({
  time,
  pinned,
  silent,
}: {
  time: string;
  pinned?: boolean;
  silent?: boolean;
}) {
  return (
    <span className="relative -bottom-0.5 ml-2 inline-flex translate-y-0.5 items-center gap-0.5 align-bottom text-[11px] tabular-nums text-[#6d7883]">
      {pinned && <Pin className="h-3 w-3 shrink-0 fill-[#6d7883] text-[#6d7883]" />}
      {silent && <BellOff className="h-3 w-3 shrink-0" />}
      {time}
    </span>
  );
}

function TelegramInlineKeyboard({ buttonRows }: { buttonRows: TelegramButton[][] }) {
  if (buttonRows.length === 0 || buttonRows.every((row) => row.length === 0)) return null;

  return (
    <div className="flex flex-col gap-1 pt-1">
      {buttonRows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((button, buttonIndex) => (
            <div
              key={buttonIndex}
              className={cn(
                "relative flex min-h-[34px] flex-1 items-center justify-center rounded-lg px-2 py-1.5 text-center text-[13px] font-medium leading-tight",
                telegramButtonColors(button.style),
              )}
            >
              <span className="line-clamp-2 px-1">{button.text || "Кнопка"}</span>
              {(button.url || button.web_app_url) && (
                <ExternalLink className="absolute right-1.5 top-1.5 h-2.5 w-2.5 shrink-0 opacity-80" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function effectiveMaxButtons(
  maxButtonRows: MaxButton[][],
  buttonRows: TelegramButton[][],
): MaxButton[][] {
  if (maxButtonRows.length > 0) {
    return maxButtonRows;
  }
  const fromTelegram = buttonRows
    .map((row) =>
      row
        .filter((button) => button.text?.trim() && button.url?.trim())
        .map((button) => ({ text: button.text.trim(), url: button.url!.trim() })),
    )
    .filter((row) => row.length > 0);
  return fromTelegram.length > 0 ? fromTelegram : maxButtonRows;
}

function MaxInlineKeyboard({ buttonRows }: { buttonRows: MaxButton[][] }) {
  if (buttonRows.length === 0 || buttonRows.every((row) => row.length === 0)) return null;

  return (
    <div className="flex flex-col gap-1.5 border-t border-black/[0.04] p-2">
      {buttonRows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1.5">
          {row.map((button, buttonIndex) => (
            <div
              key={buttonIndex}
              className="relative flex min-h-[42px] flex-1 items-center justify-center rounded-xl bg-[#5daef0] px-2 py-2 text-center text-[14px] font-medium leading-tight text-white"
            >
              <span className="line-clamp-2 px-1">{button.text || "Ссылка"}</span>
              <ExternalLink className="absolute right-2 top-2 h-3 w-3 shrink-0 opacity-90" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function MaxMetaInline({ time }: { time: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] tabular-nums text-[#8a939b]">
      <Eye className="h-3.5 w-3.5 shrink-0" />
      <span>1</span>
      <span>{time}</span>
    </span>
  );
}

function MaxMessageCard({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[min(100%,420px)] overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
      {children}
    </div>
  );
}

function MaxTodayPill() {
  return (
    <div className="mb-2 flex justify-center">
      <span className="rounded-full bg-black/25 px-3 py-0.5 text-[11px] font-medium text-white backdrop-blur-[2px]">
        Сегодня
      </span>
    </div>
  );
}

function InlineButtons({
  channel,
  buttonRows,
}: {
  channel: ChannelListItem;
  buttonRows: TelegramButton[][];
}) {
  if (channel.provider === "telegram") {
    return <TelegramInlineKeyboard buttonRows={buttonRows} />;
  }

  return null;
}

function TelegramPinnedBar({ channelName, textSnippet }: { channelName: string; textSnippet: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/95 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
      <Pin className="h-3.5 w-3.5 shrink-0 fill-[#3390ec] text-[#3390ec]" />
      <p className="min-w-0 truncate text-[11px] text-[#3390ec]">
        <span className="font-semibold">{channelName}</span> pinned &laquo;{textSnippet}&raquo;
      </p>
    </div>
  );
}

function TelegramMessageStack({
  children,
  buttons,
  className,
}: {
  children: ReactNode;
  buttons?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full max-w-[min(100%,420px)]", className)}>
      <div className="overflow-hidden rounded-xl bg-white">{children}</div>
      {buttons}
    </div>
  );
}

function TelegramMediaMessage({
  children,
  time,
  silent,
  pinned,
  className,
}: {
  children: ReactNode;
  time: string;
  silent?: boolean;
  pinned?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full max-w-[min(100%,420px)] overflow-hidden rounded-xl bg-white", className)}>
      <div className="relative">{children}</div>
      <TelegramMetaOnMedia time={time} silent={silent} />
      {pinned && (
        <span className="absolute right-1.5 top-1.5 rounded bg-black/45 p-0.5 text-white">
          <Pin className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

function MessageBubble({
  children,
  footer,
  pinned,
  silent,
  className,
}: {
  children: ReactNode;
  footer?: ReactNode;
  pinned?: boolean;
  silent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-white", className)}>
      {(pinned || silent) && (
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          {pinned && (
            <span className="rounded bg-black/50 p-0.5 text-white" title="Закреплено">
              <Pin className="h-3 w-3" />
            </span>
          )}
          {silent && (
            <span className="rounded bg-black/50 p-0.5 text-white" title="Без звука">
              <BellOff className="h-3 w-3" />
            </span>
          )}
        </div>
      )}
      {children}
      {footer}
    </div>
  );
}

function VideoNotePreview({ item }: { item: PreviewMediaItem }) {
  return (
    <div className="relative h-[220px] w-[220px] overflow-hidden rounded-full ring-1 ring-black/10">
      <PreviewMediaTile
        item={item}
        className="absolute inset-0 h-full w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
      />
    </div>
  );
}

function TelegramVideoNoteMessage({
  item,
  time,
  silent,
  pinned,
  className,
}: {
  item: PreviewMediaItem;
  time: string;
  silent?: boolean;
  pinned?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative mx-auto w-fit max-w-[min(100%,420px)]", className)}>
      <VideoNotePreview item={item} />
      <TelegramMetaOnMedia time={time} silent={silent} />
      {pinned && (
        <span className="absolute right-1.5 top-1.5 rounded bg-black/45 p-0.5 text-white">
          <Pin className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}

function StoryPreview({
  mediaUrl,
  textHtml,
}: {
  mediaUrl?: string | null;
  textHtml: string;
}) {
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden bg-zinc-900">
      {mediaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs text-zinc-500">
          Прикрепите медиа для превью
        </div>
      )}
      {textHtml && (
        <div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs text-white"
          dangerouslySetInnerHTML={{ __html: textHtml }}
        />
      )}
    </div>
  );
}

function renderChannelBody(props: {
  format: string;
  media: PreviewMediaItem[];
  textHtml: string;
  textPlain: string;
  articleTitle?: string;
  articleBlocks?: TelegramRichBlock[];
  detectedUrl: string;
  locationName?: string;
  canMedia: boolean;
  canLocation: boolean;
  effectiveLayout: "separate" | "caption";
  captionPosition: "above" | "below";
  mediaOrder: "media_first" | "text_first";
  effectiveVideoCircle: boolean;
  maxRectVideo: boolean;
  pinned: boolean;
  silent: boolean;
  buttonRows: TelegramButton[][];
  maxButtonRows: MaxButton[][];
  channel: ChannelListItem;
  timingLabel?: string;
  linkPreviewEnabled?: boolean;
}): ReactNode {
  const {
    format,
    media,
    textHtml,
    textPlain,
    articleTitle,
    articleBlocks,
    detectedUrl,
    locationName,
    canMedia,
    canLocation,
    effectiveLayout,
    captionPosition,
    mediaOrder,
    effectiveVideoCircle,
    maxRectVideo,
    pinned,
    silent,
    buttonRows,
    maxButtonRows,
    channel,
    timingLabel,
    linkPreviewEnabled,
  } = props;

  const isTelegram = channel.provider === "telegram";
  const isMax = channel.provider === "max";
  const hasText = Boolean(textPlain.trim() || format === "article" || format === "rich_message");
  const hasButtons = buttonRows.some((row) => row.length > 0);
  const maxButtons = effectiveMaxButtons(maxButtonRows, buttonRows);
  const hasMaxButtons = maxButtons.some((row) => row.length > 0);
  const albumButtonsSeparate =
    effectiveLayout === "caption" && isTelegram && media.length > 1 && hasButtons;
  const showMedia = media.length > 0 && canMedia;
  const clock = previewClockLabel(timingLabel);
  const showLinkPreview = Boolean(linkPreviewEnabled && detectedUrl && !hasButtons);

  const videoNoteBlock =
    showMedia && effectiveVideoCircle ? (
      <TelegramVideoNoteMessage
        item={media[0]!}
        time={clock}
        silent={silent}
        pinned={pinned}
      />
    ) : null;

  const mediaBlock = showMedia
    ? effectiveVideoCircle
      ? null
      : maxRectVideo
        ? <PreviewMediaTile item={media[0]!} single />
        : <AlbumGrid items={media} />
    : media.length > 0
      ? (
          <div className="bg-red-50 px-3 py-2 text-[10px] font-medium text-red-700">
            Медиа прикреплено к черновику, но не доставляется этим каналом.
          </div>
        )
      : null;

  const textInner = (
    <>
      <TextContent
        format={format}
        textHtml={textHtml}
        articleTitle={articleTitle}
        articleBlocks={articleBlocks}
      />
      {showLinkPreview && <LinkPreviewCard url={detectedUrl} />}
      {detectedUrl && !showLinkPreview && !isTelegram && (
        <div className="mt-2 border-l-2 border-accent/40 pl-2 text-[11px] text-muted">{detectedUrl}</div>
      )}
      {locationName && canLocation && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-[#3390ec]">
          <MapPin className="h-3 w-3" />
          {locationName}
        </p>
      )}
    </>
  );

  const buttons = <InlineButtons channel={channel} buttonRows={buttonRows} />;

  if (isTelegram) {
    const textWithMeta = hasText ? (
      <div className="px-2.5 pb-1.5 pt-1.5">
        {textInner}
        <TelegramMetaInline time={clock} pinned={pinned} silent={silent} />
      </div>
    ) : null;

    const separateDelivery =
      effectiveLayout === "separate" || albumButtonsSeparate;

    if (effectiveVideoCircle && videoNoteBlock) {
      const textStack = (textWithMeta || hasButtons) && (
        <TelegramMessageStack buttons={hasButtons ? buttons : undefined}>
          {textWithMeta}
        </TelegramMessageStack>
      );
      const order = mediaOrder;
      return order === "text_first" ? (
        <div className="flex flex-col gap-1">
          {textStack}
          {videoNoteBlock}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {videoNoteBlock}
          {textStack}
        </div>
      );
    }

    if (separateDelivery) {
      const mediaOnly = mediaBlock && (
        <TelegramMediaMessage time={clock} silent={silent} pinned={pinned} className="mb-1">
          {mediaBlock}
        </TelegramMediaMessage>
      );

      const textStack = (textWithMeta || hasButtons) && (
        <TelegramMessageStack buttons={hasButtons ? buttons : undefined}>
          {textWithMeta}
        </TelegramMessageStack>
      );

      const order = albumButtonsSeparate ? "media_first" : mediaOrder;
      return order === "text_first" ? (
        <div className="flex flex-col gap-1">
          {textStack}
          {mediaOnly}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {mediaOnly}
          {textStack}
        </div>
      );
    }

    const captionAbove =
      effectiveLayout === "caption" && captionPosition === "above" && media.length === 1;

    return (
      <TelegramMessageStack buttons={hasButtons ? buttons : undefined}>
        {captionAbove && textWithMeta}
        {mediaBlock}
        {!captionAbove && textWithMeta}
      </TelegramMessageStack>
    );
  }

  if (isMax) {
    const textWithMeta = hasText ? (
      <div className="px-3 pb-2.5 pt-2">
        {textInner}
        <div className="mt-1 flex justify-end">
          <MaxMetaInline time={clock} />
        </div>
      </div>
    ) : null;

    const maxButtonsBlock = hasMaxButtons ? <MaxInlineKeyboard buttonRows={maxButtons} /> : null;

    if (!showMedia && !textWithMeta && !maxButtonsBlock) {
      return (
        <MaxMessageCard>
          <div className="px-3 py-4 text-[13px] text-[#8a939b]">Текст поста появится здесь…</div>
        </MaxMessageCard>
      );
    }

    return (
      <MaxMessageCard>
        {showMedia && mediaBlock}
        {textWithMeta}
        {!textWithMeta && showMedia && (
          <div className="flex justify-end px-3 pb-2">
            <MaxMetaInline time={clock} />
          </div>
        )}
        {maxButtonsBlock}
      </MaxMessageCard>
    );
  }

  const textBlock = hasText ? (
    <div className="px-3 py-2.5 text-[13px] leading-5 text-zinc-900">{textInner}</div>
  ) : null;
  const timeFooter = (
    <p className="px-3 pb-2 text-right text-[10px] text-muted">{timingLabel ?? "сейчас"}</p>
  );

  if (effectiveLayout === "separate") {
    const mediaBubble = mediaBlock ? (
      <MessageBubble pinned={pinned} silent={silent} className="mb-[2px]">
        {mediaBlock}
        {timeFooter}
      </MessageBubble>
    ) : null;
    const textBubble = textBlock || buttons ? (
      <MessageBubble>
        {textBlock}
        {buttons}
        {!mediaBlock && timeFooter}
      </MessageBubble>
    ) : null;

    return mediaOrder === "text_first" ? (
      <>
        {textBubble}
        {mediaBubble}
      </>
    ) : (
      <>
        {mediaBubble}
        {textBubble}
      </>
    );
  }

  const captionAbove =
    effectiveLayout === "caption" && captionPosition === "above" && media.length === 1;

  return (
    <MessageBubble pinned={pinned} silent={silent}>
      {captionAbove && textBlock}
      {mediaBlock}
      {!captionAbove && textBlock}
      {buttons}
      {timeFooter}
    </MessageBubble>
  );
}

export function PostChannelPreview({
  channel,
  media,
  textHtml,
  textPlain,
  format,
  device,
  mediaLayout,
  captionPosition,
  mediaOrder,
  videoCircle,
  pinned,
  silent,
  detectedUrl,
  buttonRows,
  maxButtonRows,
  firstComment,
  locationName,
  articleTitle,
  articleBlocks,
  storyMediaPreviewUrl,
  timingLabel,
  linkPreviewEnabled = true,
}: PostChannelPreviewProps) {
  const canMedia = channel.publish_capabilities?.composer_media;
  const canComment = channel.publish_capabilities?.composer_first_comment;
  const canLocation = channel.publish_capabilities?.composer_location;
  const isTelegram = channel.provider === "telegram";
  const isMax = channel.provider === "max";

  const effectiveLayout = isTelegram ? mediaLayout : "caption";
  const effectiveVideoCircle =
    videoCircle &&
    media.length === 1 &&
    isVideoMime(media[0]!.mimeType, media[0]!.name) &&
    (isTelegram || format === "short_video");
  const maxRectVideo =
    videoCircle &&
    media.length === 1 &&
    isVideoMime(media[0]!.mimeType, media[0]!.name) &&
    isMax &&
    (format === "short_video" || format === "message");

  const isYouTube = channel.provider === "youtube";
  const shortsLandscapeWarning =
    isYouTube &&
    format === "shorts" &&
    media.length === 1 &&
    isVideoMime(media[0]!.mimeType, media[0]!.name) &&
    typeof media[0]!.width === "number" &&
    typeof media[0]!.height === "number" &&
    media[0]!.width > 0 &&
    media[0]!.height > 0 &&
    isLandscapeVideo({ width: media[0]!.width, height: media[0]!.height });

  const timingLabelResolved = timingLabel ?? "сейчас";

  const body =
    format === "story" ? (
      <StoryPreview mediaUrl={storyMediaPreviewUrl} textHtml={textHtml} />
    ) : (
      renderChannelBody({
        format,
        media,
        textHtml,
        textPlain,
        articleTitle,
        articleBlocks,
        detectedUrl,
        locationName,
        canMedia: Boolean(canMedia),
        canLocation: Boolean(canLocation),
        effectiveLayout,
        captionPosition,
        mediaOrder,
        effectiveVideoCircle: Boolean(effectiveVideoCircle),
        maxRectVideo: Boolean(maxRectVideo),
        pinned,
        silent,
        buttonRows,
        maxButtonRows,
        channel,
        timingLabel: timingLabelResolved,
        linkPreviewEnabled,
      })
    );

  const pinnedSnippet = textPlain.trim().slice(0, 48) || "…";

  const chatBody = (
    <>
      {isTelegram && pinned && format !== "story" && (
        <TelegramPinnedBar channelName={channelDisplayName(channel)} textSnippet={pinnedSnippet} />
      )}
      {device === "mobile" && isMax && format !== "story" && <MaxTodayPill />}
      {device === "mobile" && isTelegram && format !== "story" ? (
        <div className="flex items-end gap-2">
          <ChannelAvatar
            name={channel.name}
            metadata={channel.metadata}
            channelId={channel.id}
            provider={channel.provider}
            chatType={channel.chat_type}
            size="sm"
            className="mb-0.5 shrink-0"
          />
          <div className="min-w-0 flex-1">{body}</div>
        </div>
      ) : (
        body
      )}
    </>
  );

  return (
    <div
      className={cn(
        "mx-auto overflow-hidden border border-border bg-white",
        device === "mobile" ? "max-w-[300px]" : "max-w-full",
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-white px-3 py-2">
        <ChannelAvatar
          name={channel.name}
          metadata={channel.metadata}
          channelId={channel.id}
          provider={channel.provider}
          chatType={channel.chat_type}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold">{channelDisplayName(channel)}</p>
          <p className="text-[10px] text-muted">{PROVIDER_LABEL[channel.provider]}</p>
        </div>
      </div>
      {shortsLandscapeWarning && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900">
          Горизонтальное видео, скорее всего, попадёт в раздел «Видео» на YouTube, а не в Shorts.
        </div>
      )}
      <div
        className={cn(
          "min-h-[280px] bg-cover bg-center p-2.5",
          !isTelegram && !isMax && "bg-[#dfe6ec]",
        )}
        style={
          isTelegram
            ? { backgroundImage: `url('${TELEGRAM_PREVIEW_BG}')` }
            : isMax
              ? { backgroundImage: `url('${MAX_PREVIEW_BG}')` }
              : undefined
        }
      >
        {chatBody}
      </div>
      {firstComment && canComment && (
        <div className="border-t border-dashed border-zinc-300 bg-white/80 px-3 py-2 text-xs text-muted">
          Первый комментарий: {firstComment}
        </div>
      )}
    </div>
  );
}
