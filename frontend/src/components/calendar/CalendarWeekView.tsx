"use client";

import type { Post } from "@/lib/posts-api";
import type { ChannelListItem } from "@/lib/api";
import {
  dateKey,
  dateKey,
  isToday,
  postCalendarDate,
  weekDays,
  WEEKDAY_LABELS,
  WORK_HOUR_END,
  WORK_HOUR_START,
} from "@/lib/calendar-utils";
import { postHasConflict } from "@/lib/calendar-conflicts";
import { CalendarEventCard } from "@/components/calendar/CalendarEventCard";
import { cn } from "@/lib/utils";

type CalendarWeekViewProps = {
  anchor: Date;
  timeZone: string;
  posts: Post[];
  channels: ChannelListItem[];
  selectedId: string | null;
  conflicts: ReturnType<typeof import("@/lib/calendar-conflicts").detectCalendarConflicts>;
  draggingId: string | null;
  dropTargetKey: string | null;
  invalidDrop: boolean;
  onSelect: (id: string) => void;
  onDragStart: (post: Post, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOverDay: (day: Date, e: React.DragEvent) => void;
  onDropDay: (day: Date, e: React.DragEvent) => void;
};

export function CalendarWeekView({
  anchor,
  timeZone,
  posts,
  channels,
  selectedId,
  conflicts,
  draggingId,
  dropTargetKey,
  invalidDrop,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOverDay,
  onDropDay,
}: CalendarWeekViewProps) {
  const days = weekDays(anchor, timeZone);
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
      <div className="grid grid-cols-7 border-b border-border bg-zinc-50">
        {days.map((day, i) => {
          const today = isToday(day, timeZone);
          return (
            <div
              key={dateKey(day, timeZone)}
              className={cn("border-r border-border px-2 py-2 text-center last:border-r-0", today && "bg-accent/5")}
            >
              <div className="text-[10px] font-medium uppercase text-muted">{WEEKDAY_LABELS[i]}</div>
              <div
                className={cn(
                  "mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                  today ? "bg-accent text-white" : "text-text",
                )}
              >
                {new Intl.DateTimeFormat("ru-RU", { day: "numeric", timeZone }).format(day)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid min-h-[24rem] grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day, timeZone);
          const dayPosts = (postsByDay.get(key) ?? []).sort(
            (a, b) => (postCalendarDate(a)?.getTime() ?? 0) - (postCalendarDate(b)?.getTime() ?? 0),
          );
          const isDrop = dropTargetKey === key;

          return (
            <div
              key={key}
              onDragOver={(e) => onDragOverDay(day, e)}
              onDrop={(e) => onDropDay(day, e)}
              className={cn(
                "relative border-r border-border p-1.5 last:border-r-0",
                isDrop && !invalidDrop && "bg-accent/10 ring-2 ring-inset ring-accent/40",
                isDrop && invalidDrop && "bg-red-50 ring-2 ring-inset ring-red-300",
              )}
            >
              <div
                className="pointer-events-none absolute inset-x-1 top-1 bottom-1 rounded-md opacity-30"
                style={{
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 2.4rem, rgb(228 228 231 / 0.5) 2.4rem, rgb(228 228 231 / 0.5) calc(2.4rem + 1px))`,
                }}
              />
              <div className="relative space-y-1">
                {dayPosts.map((post) => {
                  const at = postCalendarDate(post);
                  const hour = at
                    ? Number(
                        new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone }).format(at),
                      )
                    : WORK_HOUR_START;
                  const isWork = hour >= WORK_HOUR_START && hour < WORK_HOUR_END;
                  return (
                    <div key={post.id} className={cn(!isWork && "opacity-90")}>
                      <CalendarEventCard
                        post={post}
                        channels={channels}
                        timeZone={timeZone}
                        selected={selectedId === post.id}
                        hasConflict={postHasConflict(post.id, conflicts)}
                        dragging={draggingId === post.id}
                        onSelect={() => onSelect(post.id)}
                        onDragStart={(e) => onDragStart(post, e)}
                        onDragEnd={onDragEnd}
                      />
                    </div>
                  );
                })}
                {dayPosts.length === 0 ? (
                  <p className="py-4 text-center text-[10px] text-muted">Пусто</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarDayView({
  anchor,
  timeZone,
  posts,
  channels,
  selectedId,
  conflicts,
  draggingId,
  dropTargetKey,
  invalidDrop,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOverHour,
  onDropHour,
}: {
  anchor: Date;
  timeZone: string;
  posts: Post[];
  channels: ChannelListItem[];
  selectedId: string | null;
  conflicts: ReturnType<typeof import("@/lib/calendar-conflicts").detectCalendarConflicts>;
  draggingId: string | null;
  dropTargetKey: string | null;
  invalidDrop: boolean;
  onSelect: (id: string) => void;
  onDragStart: (post: Post, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOverHour: (hour: number, e: React.DragEvent) => void;
  onDropHour: (hour: number, e: React.DragEvent) => void;
}) {
  const dayKey = dateKey(anchor, timeZone);
  const dayPosts = posts.filter((post) => {
    const at = postCalendarDate(post);
    return at && dateKey(at, timeZone) === dayKey;
  });

  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold capitalize">
          {new Intl.DateTimeFormat("ru-RU", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone,
          }).format(anchor)}
        </h3>
      </div>
      <div className="max-h-[32rem] overflow-y-auto">
        {hours.map((hour) => {
          const hourPosts = dayPosts.filter((post) => {
            const at = postCalendarDate(post);
            if (!at) return false;
            const h = Number(
              new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone }).format(at),
            );
            return h === hour;
          });
          const slotKey = `${dayKey}-${hour}`;
          const isWork = hour >= WORK_HOUR_START && hour < WORK_HOUR_END;
          const isDrop = dropTargetKey === slotKey;

          return (
            <div
              key={hour}
              onDragOver={(e) => onDragOverHour(hour, e)}
              onDrop={(e) => onDropHour(hour, e)}
              className={cn(
                "grid grid-cols-[3.5rem_1fr] border-b border-border/60",
                !isWork && "bg-zinc-50/50",
                isDrop && !invalidDrop && "bg-accent/10",
                isDrop && invalidDrop && "bg-red-50",
              )}
            >
              <div className="border-r border-border/60 py-2 pr-2 text-right text-[11px] tabular-nums text-muted">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="min-h-[2.75rem] space-y-1 p-1.5">
                {hourPosts.map((post) => (
                  <CalendarEventCard
                    key={post.id}
                    post={post}
                    channels={channels}
                    timeZone={timeZone}
                    selected={selectedId === post.id}
                    hasConflict={postHasConflict(post.id, conflicts)}
                    dragging={draggingId === post.id}
                    showTime={false}
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
