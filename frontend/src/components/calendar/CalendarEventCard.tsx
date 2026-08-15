"use client";

import { GripVertical, Repeat, AlertCircle } from "lucide-react";
// Hidden until agents return: import { Bot } from "lucide-react";
import { ChannelAvatar } from "@/components/channels/ChannelAvatar";
import type { ChannelListItem } from "@/lib/api";
import { channelDisplayName } from "@/lib/channelPresentation";
import type { Post } from "@/lib/posts-api";
import {
  canDragPost,
  formatTime,
  postCalendarDate,
} from "@/lib/calendar-utils";
import {
  postPreviewText,
  POST_STATUS_CLASS,
  POST_STATUS_LABEL,
} from "@/lib/posts-display";
import { CalendarEventMetrics } from "@/components/calendar/CalendarEventMetrics";
import type { PostMetricsSummary } from "@/lib/calendar-metrics";
import { cn } from "@/lib/utils";

type CalendarEventCardProps = {
  post: Post;
  channels: ChannelListItem[];
  timeZone: string;
  selected?: boolean;
  compact?: boolean;
  hasConflict?: boolean;
  dragging?: boolean;
  showTime?: boolean;
  metrics?: PostMetricsSummary | null;
  onSelect?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
};

export function CalendarEventCard({
  post,
  channels,
  timeZone,
  selected,
  compact,
  hasConflict,
  dragging,
  showTime = true,
  metrics,
  onSelect,
  onDragStart,
  onDragEnd,
}: CalendarEventCardProps) {
  const draggable = canDragPost(post);
  const at = postCalendarDate(post);
  const title = postPreviewText(post);
  const targetChannels = post.targets
    .map((t) => channels.find((c) => c.id === t.channel_id))
    .filter(Boolean) as ChannelListItem[];
  const recurrence = post.settings.recurrence?.enabled;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        "group calendar-event-card relative flex w-full items-start gap-1 rounded-md border px-1.5 py-1 text-left transition-all duration-150",
        "hover:scale-[1.02] hover:shadow-md active:scale-[0.99]",
        POST_STATUS_CLASS[post.status],
        // Hidden until agents return: post.origin === "agent" && "border-l-2 border-l-violet-500",
        selected && "ring-2 ring-accent ring-offset-1",
        dragging && "scale-[1.03] opacity-60 shadow-lg",
        hasConflict && "border-red-300 ring-1 ring-red-200",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        compact ? "text-[10px]" : "text-[11px]",
      )}
    >
      {draggable ? (
        <GripVertical
          className={cn(
            "mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-40",
            compact ? "h-2.5 w-2.5" : "h-3 w-3",
          )}
          aria-hidden
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {showTime && at ? (
            <span className="shrink-0 font-semibold tabular-nums">{formatTime(at.toISOString(), timeZone)}</span>
          ) : null}
          {recurrence ? <Repeat className="h-2.5 w-2.5 shrink-0 opacity-60" aria-label="Повтор" /> : null}
          {/* Hidden until agents return:
          {post.origin === "agent" ? (
            <Bot className="h-2.5 w-2.5 shrink-0 text-violet-600" aria-label="Агент" />
          ) : null}
          */}
          {hasConflict ? <AlertCircle className="h-2.5 w-2.5 shrink-0 text-red-600" aria-label="Конфликт" /> : null}
          {post.last_error ? (
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-500" title={post.last_error} />
          ) : null}
        </div>
        <p className={cn("truncate font-medium leading-tight", compact ? "text-[10px]" : "text-[11px]")}>{title}</p>
        {!compact ? (
          <div className="mt-0.5 flex items-center gap-0.5">
            {targetChannels.slice(0, 3).map((ch) => (
              <ChannelAvatar
                key={ch.id}
                channelId={ch.id}
                name={ch.name}
                metadata={ch.metadata}
                provider={ch.provider}
                chatType={ch.chat_type}
                size="sm"
                className="!h-4 !w-4 !text-[8px]"
              />
            ))}
            {targetChannels.length > 3 ? (
              <span className="text-[9px] text-muted">+{targetChannels.length - 3}</span>
            ) : null}
          </div>
        ) : null}
        {!compact ? (
          <span className="mt-0.5 inline-block truncate text-[9px] opacity-70">
            {POST_STATUS_LABEL[post.status]}
            {/* Hidden until agents return: {post.origin === "agent" ? " · Агент" : ""} */}
            {post.plan_manually_changed ? " · правлен вручную" : ""}
            {targetChannels.length === 1
              ? ` · ${channelDisplayName({ name: targetChannels[0]!.name, metadata: targetChannels[0]!.metadata })}`
              : targetChannels.length > 1
                ? ` · ${targetChannels.length} канала`
                : ""}
          </span>
        ) : null}
        {post.status === "published" ? (
          <CalendarEventMetrics metrics={metrics} compact={compact} className="mt-0.5" />
        ) : null}
      </div>
    </div>
  );
}
