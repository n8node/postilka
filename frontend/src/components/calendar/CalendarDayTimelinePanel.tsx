"use client";

import Link from "next/link";
import { AlertCircle, CalendarClock, Copy, ImageIcon, Plus, RefreshCw, X } from "lucide-react";
import type { ChannelListItem } from "@/lib/api";
import type { Post } from "@/lib/posts-api";
import { channelCalendarColor } from "@/lib/calendar-channel-colors";
import {
  dateKey,
  formatTime,
  hourInTz,
  minuteInTz,
  postCalendarDate,
} from "@/lib/calendar-utils";
import { postHasConflict } from "@/lib/calendar-conflicts";
import { POST_STATUS_LABEL, postPreviewText } from "@/lib/posts-display";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT = 56;
const DEFAULT_DURATION_MIN = 40;

type CalendarDayTimelinePanelProps = {
  day: Date;
  timeZone: string;
  posts: Post[];
  channels: ChannelListItem[];
  selectedId: string | null;
  conflicts: ReturnType<typeof import("@/lib/calendar-conflicts").detectCalendarConflicts>;
  onSelect: (id: string) => void;
  onDuplicate: (post: Post) => void;
  onReschedule: (post: Post) => void;
  onClose: () => void;
  onDragOverHour?: (hour: number, e: React.DragEvent) => void;
  onDropHour?: (hour: number, e: React.DragEvent) => void;
  dropTargetKey?: string | null;
  invalidDrop?: boolean;
};

export function CalendarDayTimelinePanel({
  day,
  timeZone,
  posts,
  channels,
  selectedId,
  conflicts,
  onSelect,
  onDuplicate,
  onReschedule,
  onClose,
  onDragOverHour,
  onDropHour,
  dropTargetKey,
  invalidDrop,
}: CalendarDayTimelinePanelProps) {
  const dayKey = dateKey(day, timeZone);
  const dayPosts = posts
    .filter((post) => {
      const at = postCalendarDate(post);
      return at && dateKey(at, timeZone) === dayKey;
    })
    .sort((a, b) => (postCalendarDate(a)?.getTime() ?? 0) - (postCalendarDate(b)?.getTime() ?? 0));

  const title = new Intl.DateTimeFormat("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(day);

  const channelPosts = channels
    .map((channel, index) => ({
      channel,
      count: dayPosts.filter((post) => post.targets.some((target) => target.channel_id === channel.id)).length,
      color: channelCalendarColor(channel.id, index),
    }))
    .filter((item) => item.count > 0);
  const firstPost = dayPosts[0];
  const lastPost = dayPosts.at(-1);
  const attentionCount = dayPosts.filter(
    (post) => post.status === "failed" || post.status === "pending_approval" || post.last_error,
  ).length;
  const loadPeriods = [
    { label: "Утро", count: countPostsInHours(dayPosts, timeZone, 6, 12) },
    { label: "День", count: countPostsInHours(dayPosts, timeZone, 12, 18) },
    { label: "Вечер", count: countPostsInHours(dayPosts, timeZone, 18, 24) },
  ];
  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-l border-border bg-surface xl:w-72">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold capitalize leading-snug">{title}</h2>
            <p className="mt-0.5 text-[11px] text-muted">
              {dayPosts.length === 0
                ? "Свободный день"
                : `${dayPosts.length} ${pluralizePosts(dayPosts.length)} · ${channelPosts.length} ${pluralizeChannels(channelPosts.length)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-zinc-100 hover:text-text"
            aria-label="Скрыть панель дня"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {channelPosts.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {channelPosts.map(({ channel, count, color }) => (
              <span
                key={channel.id}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-700"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate">{channel.name}</span>
                <span className="tabular-nums text-muted">· {count}</span>
              </span>
            ))}
          </div>
        ) : null}

        {firstPost && lastPost ? (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
            <span>
              {dayPosts.length === 1
                ? `Публикация в ${formatTime(postCalendarDate(firstPost)!.toISOString(), timeZone)}`
                : `С ${formatTime(postCalendarDate(firstPost)!.toISOString(), timeZone)} до ${formatTime(postCalendarDate(lastPost)!.toISOString(), timeZone)}`}
            </span>
          </div>
        ) : null}

        {dayPosts.length > 0 ? (
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {loadPeriods.map(({ label, count }) => (
              <div key={label} className="rounded-md bg-zinc-50 px-1.5 py-1 text-center">
                <p className="text-[9px] text-muted">{label}</p>
                <p className={cn("text-xs font-semibold tabular-nums", count > 0 ? "text-text" : "text-muted/60")}>
                  {count}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {attentionCount > 0 ? (
          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-900">
            <AlertCircle className="h-3.5 w-3.5" />
            Требует внимания: {attentionCount}
          </div>
        ) : null}

        <Link
          href={`/posts/new?date=${dayKey}`}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Создать пост на этот день
        </Link>

        {dayPosts.length > 0 ? (
          <details className="group mt-2">
            <summary className="cursor-pointer text-[11px] font-medium text-muted hover:text-text">
              Предпросмотр публикаций
            </summary>
            <div className="mt-2 space-y-1.5">
              {dayPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onSelect(post.id)}
                  className="block w-full rounded-md border border-border bg-zinc-50 px-2 py-1.5 text-left hover:bg-zinc-100"
                >
                  <span className="block truncate text-[10px] font-medium">{postPreviewText(post)}</span>
                  <span className="mt-0.5 block text-[9px] text-muted">
                    {formatTime(postCalendarDate(post)!.toISOString(), timeZone)} · {POST_STATUS_LABEL[post.status]}
                  </span>
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </div>

      <div className="relative flex-1 overflow-y-auto">
        <div className="relative" style={{ height: hours.length * HOUR_HEIGHT }}>
          {hours.map((hour) => {
            const slotKey = `${dayKey}-${hour}`;
            const isDrop = dropTargetKey === slotKey;
            return (
              <div
                key={hour}
                onDragOver={onDragOverHour ? (e) => onDragOverHour(hour, e) : undefined}
                onDrop={onDropHour ? (e) => onDropHour(hour, e) : undefined}
                className={cn(
                  "absolute inset-x-0 border-b border-border/50",
                  isDrop && !invalidDrop && "bg-accent/10",
                  isDrop && invalidDrop && "bg-red-50",
                )}
                style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              >
                <span className="absolute -left-0 top-0 w-12 -translate-y-1/2 pr-2 text-right text-[10px] tabular-nums text-muted">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
            );
          })}

          <div className="absolute inset-y-0 left-12 right-2">
            {dayPosts.map((post) => {
              const at = postCalendarDate(post);
              if (!at) return null;
              const h = hourInTz(at, timeZone);
              const m = minuteInTz(at, timeZone);
              const top = h * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
              const height = Math.max(38, (DEFAULT_DURATION_MIN / 60) * HOUR_HEIGHT);
              const chIndex = channels.findIndex((c) => post.targets.some((t) => t.channel_id === c.id));
              const chId = post.targets[0]?.channel_id ?? post.id;
              const color = channelCalendarColor(chId, Math.max(0, chIndex));
              const hasConflict = postHasConflict(post.id, conflicts);
              const postChannels = post.targets
                .map((target) => channels.find((channel) => channel.id === target.channel_id))
                .filter(Boolean) as ChannelListItem[];

              return (
                <div
                  key={post.id}
                  className={cn(
                    "group absolute inset-x-0 overflow-hidden rounded border border-blue-200/80 text-left text-[11px] shadow-sm transition-shadow hover:shadow-md",
                    selectedId === post.id && "ring-2 ring-accent ring-offset-1",
                    hasConflict && "border-red-300",
                  )}
                  style={{
                    top,
                    height,
                    backgroundColor: `${color}18`,
                    borderLeftColor: color,
                    borderLeftWidth: 3,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(post.id)}
                    className="block h-full w-full overflow-hidden px-2 py-1 pr-12 text-left"
                    aria-label={`Открыть публикацию: ${postPreviewText(post)}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="shrink-0 tabular-nums text-[10px] font-medium opacity-75">
                        {formatTime(at.toISOString(), timeZone)}
                      </span>
                      <span className="truncate font-medium">{postPreviewText(post)}</span>
                      {post.media.length > 0 ? <ImageIcon className="ml-auto h-3 w-3 shrink-0 opacity-60" /> : null}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10px] opacity-80">
                      <span className="truncate">
                        {postChannels.length > 0 ? postChannels.map((channel) => channel.name).join(", ") : "Без канала"}
                      </span>
                      <span className="ml-auto shrink-0 rounded bg-white/60 px-1 py-px text-[9px]">
                        {POST_STATUS_LABEL[post.status]}
                      </span>
                    </span>
                  </button>
                  {post.status !== "published" && post.status !== "publishing" ? (
                    <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => onReschedule(post)}
                        className="rounded bg-white/80 p-1 text-muted shadow-sm hover:text-text"
                        aria-label="Перенести публикацию"
                        title="Перенести"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicate(post)}
                        className="rounded bg-white/80 p-1 text-muted shadow-sm hover:text-text"
                        aria-label="Дублировать публикацию"
                        title="Дублировать"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {dayPosts.length === 0 ? (
              <div className="absolute left-0 right-0 top-16 rounded-lg border border-dashed border-border bg-zinc-50/70 p-3 text-center text-[11px] text-muted">
                Нет публикаций
                <span className="mt-1 block text-[10px]">Перетащите сюда черновик или создайте новый пост</span>
                <Link
                  href={`/posts/new?date=${dayKey}`}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-accent hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Создать пост
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

function pluralizePosts(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "публикаций";
  if (last === 1) return "публикация";
  if (last >= 2 && last <= 4) return "публикации";
  return "публикаций";
}

function pluralizeChannels(count: number) {
  if (count === 1) return "канал";
  if (count >= 2 && count <= 4) return "канала";
  return "каналов";
}

function countPostsInHours(posts: Post[], timeZone: string, from: number, to: number) {
  return posts.filter((post) => {
    const at = postCalendarDate(post);
    if (!at) return false;
    const hour = hourInTz(at, timeZone);
    return hour >= from && hour < to;
  }).length;
}
