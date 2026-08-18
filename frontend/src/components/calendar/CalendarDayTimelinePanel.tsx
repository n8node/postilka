"use client";

import { X } from "lucide-react";
import type { ChannelListItem } from "@/lib/api";
import type { Post } from "@/lib/posts-api";
import type { PostMetricsSummary } from "@/lib/calendar-metrics";
import { channelCalendarColor } from "@/lib/calendar-channel-colors";
import {
  dateKey,
  formatTime,
  hourInTz,
  minuteInTz,
  postCalendarDate,
} from "@/lib/calendar-utils";
import { postHasConflict } from "@/lib/calendar-conflicts";
import { postPreviewText } from "@/lib/posts-display";
import { cn } from "@/lib/utils";

const HOUR_HEIGHT = 48;
const DEFAULT_DURATION_MIN = 30;

type CalendarDayTimelinePanelProps = {
  day: Date;
  timeZone: string;
  posts: Post[];
  channels: ChannelListItem[];
  selectedId: string | null;
  conflicts: ReturnType<typeof import("@/lib/calendar-conflicts").detectCalendarConflicts>;
  onSelect: (id: string) => void;
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

  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-border bg-surface xl:w-72">
      <div className="flex items-start justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold capitalize leading-snug">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted hover:bg-zinc-100 hover:text-text"
          aria-label="Скрыть панель дня"
        >
          <X className="h-4 w-4" />
        </button>
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
              const height = Math.max(22, (DEFAULT_DURATION_MIN / 60) * HOUR_HEIGHT);
              const chIndex = channels.findIndex((c) => post.targets.some((t) => t.channel_id === c.id));
              const chId = post.targets[0]?.channel_id ?? post.id;
              const color = channelCalendarColor(chId, Math.max(0, chIndex));
              const hasConflict = postHasConflict(post.id, conflicts);

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onSelect(post.id)}
                  className={cn(
                    "absolute inset-x-0 overflow-hidden rounded border border-blue-200/80 px-2 py-0.5 text-left text-[11px] shadow-sm transition-shadow hover:shadow-md",
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
                  <span className="block truncate font-medium">{postPreviewText(post)}</span>
                  <span className="block truncate text-[10px] opacity-75">
                    {formatTime(at.toISOString(), timeZone)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
