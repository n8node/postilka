"use client";

// Hidden until agents return: import Link from "next/link";
import {
  Ban,
  Copy,
  ExternalLink,
  Loader2,
  PenSquare,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ChannelAvatar } from "@/components/channels/ChannelAvatar";
import type { ChannelListItem } from "@/lib/api";
import { channelDisplayName } from "@/lib/channelPresentation";
import type { Post } from "@/lib/posts-api";
import { formatDateTime, postCalendarDate } from "@/lib/calendar-utils";
import {
  canCancelPost,
  canDeletePost,
  canEditPost,
  canRetryPost,
  postFormatLabel,
  postPreviewText,
  POST_STATUS_LABEL,
} from "@/lib/posts-display";
import { CalendarEventMetrics } from "@/components/calendar/CalendarEventMetrics";
import type { PostMetricsSummary } from "@/lib/calendar-metrics";
import { cn } from "@/lib/utils";

type CalendarInspectorProps = {
  post: Post;
  channels: ChannelListItem[];
  timeZone: string;
  metrics?: PostMetricsSummary | null;
  busy?: boolean;
  onReschedule: () => void;
  onCancel: () => void;
  onPublish: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function CalendarInspector({
  post,
  channels,
  timeZone,
  metrics,
  busy,
  onReschedule,
  onCancel,
  onPublish,
  onDuplicate,
  onDelete,
}: CalendarInspectorProps) {
  const at = postCalendarDate(post);
  const targetChannels = post.targets
    .map((t) => channels.find((c) => c.id === t.channel_id))
    .filter(Boolean) as ChannelListItem[];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted">Публикация</p>
        <p className="font-medium leading-snug">{postPreviewText(post)}</p>
        <p className="mt-1 text-[11px] text-muted">
          {postFormatLabel(post.content.format)} · {POST_STATUS_LABEL[post.status]}
          {/* Hidden until agents return: {post.origin === "agent" ? " · Агент" : " · Вручную"} */}
          {/* Hidden until agents return: {post.plan_manually_changed ? " · ход изменён вручную" : ""} */}
        </p>
        {/* Hidden until agents return:
        {post.mission_id ? (
          <Link
            href={`/missions/${post.mission_id}`}
            className="mt-2 inline-block text-xs text-accent hover:underline"
          >
            Открыть Ai агента
          </Link>
        ) : null}
        */}
      </div>

      <div>
        <p className="text-xs text-muted">Время</p>
        <p className="font-medium tabular-nums">{at ? formatDateTime(at.toISOString(), timeZone) : "Не запланировано"}</p>
      </div>

      {targetChannels.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs text-muted">Каналы</p>
          <div className="space-y-1.5">
            {targetChannels.map((ch) => (
              <div key={ch.id} className="flex items-center gap-2">
                <ChannelAvatar
                  channelId={ch.id}
                  name={ch.name}
                  metadata={ch.metadata}
                  provider={ch.provider}
                  size="sm"
                />
                <span className="text-xs">{channelDisplayName({ name: ch.name, metadata: ch.metadata })}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {post.settings.recurrence?.enabled ? (
        <div className="rounded-md bg-violet-50 px-3 py-2 text-xs text-violet-800">
          Повтор каждые {post.settings.recurrence.interval_days ?? "?"} дн.
        </div>
      ) : null}

      {post.last_error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">{post.last_error}</div>
      ) : null}

      {post.status === "published" ? (
        <div>
          <p className="mb-1.5 text-xs text-muted">Результаты</p>
          <CalendarEventMetrics metrics={metrics} />
          {!metrics?.has_data ? (
            <p className="mt-1 text-[11px] text-muted">Данные появятся после сбора метрик с каналов</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {canEditPost(post.status) ? (
          <Link
            href={`/posts/${post.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            <PenSquare className="h-4 w-4" />
            Редактировать
          </Link>
        ) : (
          <Link
            href={`/posts/${post.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            <ExternalLink className="h-4 w-4" />
            Открыть
          </Link>
        )}

        {canEditPost(post.status) ? (
          <button
            type="button"
            disabled={busy}
            onClick={onPublish}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Опубликовать сейчас
          </button>
        ) : null}

        {post.status === "scheduled" ? (
          <button
            type="button"
            disabled={busy}
            onClick={onReschedule}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Перенести…
          </button>
        ) : null}

        {canRetryPost(post.status) || canEditPost(post.status) ? (
          <button
            type="button"
            disabled={busy}
            onClick={onDuplicate}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            Дублировать
          </button>
        ) : null}

        {canCancelPost(post.status) ? (
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-200 px-3 py-2 text-sm text-amber-900 hover:bg-amber-50 disabled:opacity-50"
          >
            <Ban className="h-4 w-4" />
            Отменить
          </button>
        ) : null}

        {canDeletePost(post.status) ? (
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50",
            )}
          >
            <Trash2 className="h-4 w-4" />
            Удалить
          </button>
        ) : null}
      </div>
    </div>
  );
}
