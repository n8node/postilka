"use client";

import type { Post } from "@/lib/posts-api";
import type { ChannelListItem } from "@/lib/api";
import {
  dateKey,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  monthGridDays,
  postCalendarDate,
  WEEKDAY_LABELS,
} from "@/lib/calendar-utils";
import type { PostMetricsSummary } from "@/lib/calendar-metrics";
import { channelCalendarColor } from "@/lib/calendar-channel-colors";
import { canDragPost } from "@/lib/calendar-utils";
import { CalendarMonthEventRow } from "@/components/calendar/CalendarMonthEventRow";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Plus } from "lucide-react";

const MAX_VISIBLE = 4;

type CalendarMonthViewProps = {
  anchor: Date;
  selectedDay: Date;
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
  onSelectDay: (day: Date) => void;
  onDragStart: (post: Post, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOverDay: (day: Date, e: React.DragEvent) => void;
  onDropDay: (day: Date, e: React.DragEvent) => void;
  onExpandDay: (day: Date) => void;
};

export function CalendarMonthView({
  anchor,
  selectedDay,
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
  onSelectDay,
  onDragStart,
  onDragEnd,
  onDragOverDay,
  onDropDay,
  onExpandDay,
}: CalendarMonthViewProps) {
  void metricsByPost;
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

  const channelIndex = new Map(channels.map((c, i) => [c.id, i]));

  return (
    <div className="flex h-full min-h-[32rem] flex-col bg-surface">
      <div className="grid shrink-0 grid-cols-7 border-b border-border text-center text-xs font-medium text-muted">
        {WEEKDAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={cn("py-2", (i === 5 || i === 6) && "text-emerald-600")}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 auto-rows-fr grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day, timeZone);
          const dayPosts = (postsByDay.get(key) ?? []).sort(
            (a, b) => (postCalendarDate(a)?.getTime() ?? 0) - (postCalendarDate(b)?.getTime() ?? 0),
          );
          const inMonth = isSameMonth(day, anchor, timeZone);
          const today = isToday(day, timeZone);
          const selected = isSameDay(day, selectedDay, timeZone);
          const weekend = isWeekend(day, timeZone);
          const isDrop = dropTargetKey === key;
          const hidden = dayPosts.length - MAX_VISIBLE;

          return (
            <div
              key={key}
              onDragOver={(e) => onDragOverDay(day, e)}
              onDrop={(e) => onDropDay(day, e)}
              onClick={() => onSelectDay(day)}
              className={cn(
                "group/day relative min-h-[6rem] border-b border-r border-border p-1 transition-colors",
                !inMonth && "bg-zinc-50/90",
                selected && "bg-zinc-100/80",
                isDrop && !invalidDrop && "bg-accent/10 ring-2 ring-inset ring-accent/40",
                isDrop && invalidDrop && "bg-red-50 ring-2 ring-inset ring-red-300",
              )}
            >
              <div className="mb-0.5 flex items-start justify-between">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums",
                    today && "bg-accent font-semibold text-white",
                    !today && inMonth && weekend && "text-emerald-600",
                    !today && inMonth && !weekend && "text-text",
                    !inMonth && "text-muted/70",
                  )}
                >
                  {new Intl.DateTimeFormat("ru-RU", { day: "numeric", timeZone }).format(day)}
                </span>
                <Link
                  href={`/posts/new?date=${key}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded p-0.5 text-muted opacity-0 transition-opacity hover:bg-zinc-200 hover:text-text group-hover/day:opacity-100"
                  title="Создать пост на этот день"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="space-y-px">
                {dayPosts.slice(0, MAX_VISIBLE).map((post) => {
                  const chId = post.targets[0]?.channel_id;
                  const color = chId ? channelCalendarColor(chId, channelIndex.get(chId) ?? 0) : undefined;
                  return (
                    <CalendarMonthEventRow
                      key={post.id}
                      post={post}
                      timeZone={timeZone}
                      color={color}
                      selected={selectedId === post.id}
                      draggable={canDragPost(post)}
                      onSelect={() => onSelect(post.id)}
                      onDragStart={(e) => onDragStart(post, e)}
                      onDragEnd={onDragEnd}
                    />
                  );
                })}
                {hidden > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpandDay(day);
                    }}
                    className="px-0.5 text-[11px] font-medium text-accent hover:underline"
                  >
                    Ещё {hidden}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
