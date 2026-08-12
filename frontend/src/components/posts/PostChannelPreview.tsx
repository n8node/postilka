"use client";

import { BellOff, Loader2, MapPin, Pin, Play } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ChannelAvatar } from "@/components/channels/ChannelAvatar";
import { channelDisplayName } from "@/lib/channelPresentation";
import type { ChannelListItem, ChannelProvider } from "@/lib/api";
import { getCachedFileMediaUrl } from "@/lib/file-media-cache";
import { formatMediaDuration, isVideoMime } from "@/lib/file-media";
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

export type PreviewMediaItem = {
  fileId: string;
  name: string;
  mimeType: string;
  durationSeconds?: number;
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

function AlbumGrid({ items }: { items: PreviewMediaItem[] }) {
  const count = items.length;
  if (count === 0) return null;
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
        className="break-words whitespace-pre-wrap [&_blockquote]:border-l-2 [&_blockquote]:border-blue-300 [&_blockquote]:pl-2 [&_pre]:overflow-x-auto [&_pre]:bg-zinc-100 [&_pre]:p-2"
        dangerouslySetInnerHTML={{ __html: textHtml }}
      />
    );
  }
  return <span className="text-muted">Текст поста появится здесь…</span>;
}

function InlineButtons({
  channel,
  buttonRows,
  maxButtonRows,
}: {
  channel: ChannelListItem;
  buttonRows: TelegramButton[][];
  maxButtonRows: MaxButton[][];
}) {
  if (channel.provider === "max" && maxButtonRows.length > 0) {
    return (
      <div className="border-t border-zinc-200/80">
        {maxButtonRows.map((row, index) => (
          <div key={index} className="grid border-t border-zinc-200/80 first:border-t-0" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
            {row.map((button, buttonIndex) => (
              <span
                key={buttonIndex}
                className="truncate border-l border-zinc-200/80 px-2 py-2 text-center text-[11px] font-medium text-accent first:border-l-0"
              >
                {button.text || "Ссылка"}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (channel.provider !== "max" && buttonRows.length > 0) {
    return (
      <div className="border-t border-zinc-200/80">
        {buttonRows.map((row, index) => (
          <div
            key={index}
            className="grid border-t border-zinc-200/80 first:border-t-0"
            style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
          >
            {row.map((button, buttonIndex) => (
              <span
                key={buttonIndex}
                className={cn(
                  "truncate border-l border-zinc-200/80 px-2 py-2 text-center text-[11px] font-semibold text-accent first:border-l-0",
                  button.style === "primary" && "text-accent",
                  button.style === "success" && "text-emerald-600",
                  button.style === "danger" && "text-red-600",
                )}
              >
                {button.text || "Кнопка"}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return null;
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
    <div className={cn("relative overflow-hidden bg-white shadow-sm", className)}>
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
    <div className="flex justify-center bg-[#0e1621] py-4">
      <div className="relative h-[220px] w-[220px] overflow-hidden rounded-full bg-zinc-800 ring-1 ring-white/10">
        <PreviewMediaTile item={item} className="absolute inset-0 h-full w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
      </div>
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
  } = props;

  const hasText = Boolean(textPlain.trim() || format === "article" || format === "rich_message");
  const hasButtons = buttonRows.some((row) => row.length > 0);
  const albumButtonsSeparate =
    effectiveLayout === "caption" &&
    channel.provider === "telegram" &&
    media.length > 1 &&
    hasButtons;
  const showMedia = media.length > 0 && canMedia;

  const mediaBlock = showMedia
    ? effectiveVideoCircle
      ? <VideoNotePreview item={media[0]!} />
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
      {detectedUrl && (
        <div className="mt-2 border-l-2 border-accent/40 pl-2 text-[11px] text-muted">{detectedUrl}</div>
      )}
      {locationName && canLocation && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted">
          <MapPin className="h-3 w-3" />
          {locationName}
        </p>
      )}
    </>
  );

  const textBlock = hasText ? (
    <div className="px-3 py-2.5 text-[13px] leading-5 text-zinc-900">{textInner}</div>
  ) : null;

  const buttons = (
    <InlineButtons channel={channel} buttonRows={buttonRows} maxButtonRows={maxButtonRows} />
  );
  const timeFooter = (
    <p className="px-3 pb-2 text-right text-[10px] text-muted">{timingLabel ?? "сейчас"}</p>
  );

  if (
    (effectiveLayout === "separate" && channel.provider === "telegram") ||
    albumButtonsSeparate
  ) {
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

    const order = albumButtonsSeparate ? "media_first" : mediaOrder;
    return order === "text_first" ? (
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
      })
    );

  return (
    <div
      className={cn(
        "mx-auto overflow-hidden border border-border bg-[#dfe6ec]",
        device === "mobile" ? "max-w-[300px]" : "max-w-full",
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-white px-3 py-2">
        <ChannelAvatar
          name={channel.name}
          metadata={channel.metadata}
          channelId={channel.id}
          provider={channel.provider}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold">{channelDisplayName(channel)}</p>
          <p className="text-[10px] text-muted">{PROVIDER_LABEL[channel.provider]}</p>
        </div>
      </div>
      <div className="p-[2px]">{body}</div>
      {firstComment && canComment && (
        <div className="mx-[2px] mb-[2px] border-t border-dashed border-zinc-300 bg-white/80 px-3 py-2 text-xs text-muted">
          Первый комментарий: {firstComment}
        </div>
      )}
    </div>
  );
}
