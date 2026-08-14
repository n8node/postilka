"use client";

import type { Post } from "@/lib/posts-api";
import type { ChannelListItem } from "@/lib/api";
import {
  dateKey,
  dayDensity,
  isSameMonth,
  isToday,
  monthGridDays,
  postCalendarDate,
  WEEKDAY_LABELS,
} from "@/lib/calendar-utils";
import type { PostMetricsSummary } from "@/lib/calendar-metrics";
import { postHasConflict } from "@/lib/calendar-conflicts";
import { CalendarEventCard } from "@/components/calendar/CalendarEventCard";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 3;

type CalendarMonthViewProps = {
  anchor: Date;
  timeZone: string;
  posts: Post[];
  channels: ChannelListItem[];
  selectedId: string | null;
  conflicts: ReturnType<typeof import("@/lib/calendar-conflicts").detectCalendarConflicts>;
  metricsByPost: Map<string, PostMetricsSummary>;
  draggingId: string | null;
  dropTargetKey: string | null;
  invalidDrop: boolean;
  onSelect: (id: string) => void;
  onDragStart: (post: Post, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOverDay: (day: Date, e: React.DragEvent) => void;
  onDropDay: (day: Date, e: React.DragEvent) => void;
  onExpandDay: (day: Date) => void;
};

export function CalendarMonthView({
  anchor,
  timeZone,
  posts,
  channels,
  selectedId,
  conflicts,
  metricsByPost,
  draggingId,
  dropTargetKey,
  invalidDrop,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOverDay,
  onDropDay,
  onExpandDay,
}: CalendarMonthViewProps) {
  const days = monthGridDays(anchor, timeZone);
  const postsByDay = new Map<string, Post[]>();
  for (const post of posts) {
    const at = postCalendarDate(post);
    if (!at) continue;
    const key = dateKey(at, timeZone);
    const list = postsByDay.get(key) ?? [];
    list.push(post);
    postsByDay.set(key, list);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="grid grid-cols-7 border-b border-border bg-zinc-50 text-center text-xs font-medium text-muted">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day, timeZone);
          const dayPosts = (postsByDay.get(key) ?? []).sort(
            (a, b) => (postCalendarDate(a)?.getTime() ?? 0) - (postCalendarDate(b)?.getTime() ?? 0),
          );
          const inMonth = isSameMonth(day, anchor, timeZone);
          const today = isToday(day, timeZone);
          const isDrop = dropTargetKey === key;
          const density = dayDensity(dayPosts.length);

          return (
            <div
              key={key}
              onDragOver={(e) => onDragOverDay(day, e)}
              onDrop={(e) => onDropDay(day, e)}
              className={cn(
                "min-h-[5.5rem] border-b border-r border-border p-1 transition-colors duration-150",
                !inMonth && "bg-zinc-50/80",
                today && "ring-1 ring-inset ring-accent/40",
                isDrop && !invalidDrop && "bg-accent/10 ring-2 ring-inset ring-accent/50",
                isDrop && invalidDrop && "bg-red-50 ring-2 ring-inset ring-red-300",
              )}
              style={
                density > 0
                  ? { backgroundImage: `linear-gradient(to bottom, rgb(37 99 235 / ${density * 0.08}), transparent)` }
                  : undefined
              }
            >
              <div className="mb-0.5 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                    today ? "bg-accent font-semibold text-white" : inMonth ? "text-text" : "text-muted",
                  )}
                >
                  {new Intl.DateTimeFormat("ru-RU", { day: "numeric", timeZone }).format(day)}
                </span>
                {dayPosts.length > MAX_VISIBLE ? (
                  <button
                    type="button"
                    onClick={() => onExpandDay(day)}
                    className="text-[9px] font-medium text-accent hover:underline"
                  >
                    +{dayPosts.length - MAX_VISIBLE}
                  </button>
                ) : null}
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, MAX_VISIBLE).map((post) => (
                  <CalendarEventCard
                    key={post.id}
                    post={post}
                    channels={channels}
                    timeZone={timeZone}
                    compact
                    selected={selectedId === post.id}
                    hasConflict={postHasConflict(post.id, conflicts)}
                    metrics={metricsByPost.get(post.id)}
                    dragging={draggingId === post.id}
                    onSelect={() => onSelect(post.id)}
                    onDragStart={(e) => onDragStart(post, e)}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
