"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import type { ChannelListItem } from "@/lib/api";
import type { Post } from "@/lib/posts-api";
import { channelCalendarColor } from "@/lib/calendar-channel-colors";
import {
  dateKey,
  isSameDay,
  isSameMonth,
  isToday,
  miniMonthGridDays,
  shiftAnchor,
  WEEKDAY_LABELS,
} from "@/lib/calendar-utils";
import { CalendarEventCard } from "@/components/calendar/CalendarEventCard";
import { cn } from "@/lib/utils";

type CalendarSidebarProps = {
  anchor: Date;
  selectedDay: Date;
  timeZone: string;
  channels: ChannelListItem[];
  hiddenChannels: Set<string>;
  queuePosts: Post[];
  selectedId: string | null;
  onAnchorChange: (date: Date) => void;
  onSelectedDayChange: (date: Date) => void;
  onToggleChannel: (channelId: string) => void;
  onSelectPost: (id: string) => void;
  onDragStart: (post: Post, e: React.DragEvent) => void;
  onDragEnd: () => void;
};

export function CalendarSidebar({
  anchor,
  selectedDay,
  timeZone,
  channels,
  hiddenChannels,
  queuePosts,
  selectedId,
  onAnchorChange,
  onSelectedDayChange,
  onToggleChannel,
  onSelectPost,
  onDragStart,
  onDragEnd,
}: CalendarSidebarProps) {
  const days = miniMonthGridDays(anchor, timeZone);
  const monthTitle = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric", timeZone }).format(anchor);

  const pickDay = (day: Date) => {
    onSelectedDayChange(day);
    onAnchorChange(day);
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-surface lg:w-60">
      <div className="border-b border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onAnchorChange(shiftAnchor("month", anchor, -1, timeZone))}
            className="rounded p-1 text-muted hover:bg-zinc-100 hover:text-text"
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-semibold capitalize">{monthTitle}</span>
          <button
            type="button"
            onClick={() => onAnchorChange(shiftAnchor("month", anchor, 1, timeZone))}
            className="rounded p-1 text-muted hover:bg-zinc-100 hover:text-text"
            aria-label="Следующий месяц"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-muted">
          {WEEKDAY_LABELS.map((d) => (
            <div key={d} className="py-0.5">
              {d.slice(0, 2)}
            </div>
          ))}
        </div>
        <div className="mt-0.5 grid grid-cols-7 gap-0.5">
          {days.map((day) => {
            const key = dateKey(day, timeZone);
            const inMonth = isSameMonth(day, anchor, timeZone);
            const today = isToday(day, timeZone);
            const selected = isSameDay(day, selectedDay, timeZone);

            return (
              <button
                key={key}
                type="button"
                onClick={() => pickDay(day)}
                className={cn(
                  "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] tabular-nums transition-colors",
                  !inMonth && "text-muted/60",
                  inMonth && !today && !selected && "text-text hover:bg-zinc-100",
                  today && "bg-accent font-semibold text-white",
                  selected && !today && "font-bold text-text ring-1 ring-text/20",
                )}
              >
                {new Intl.DateTimeFormat("ru-RU", { day: "numeric", timeZone }).format(day)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <details open className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-text [&::-webkit-details-marker]:hidden">
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-0 -rotate-90" />
            Каналы
          </summary>
          <ul className="mt-2 space-y-1.5 pl-1">
            {channels.map((ch, i) => {
              const color = channelCalendarColor(ch.id, i);
              const visible = !hiddenChannels.has(ch.id);
              return (
                <li key={ch.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => onToggleChannel(ch.id)}
                      className="rounded border-border"
                      style={{ accentColor: color }}
                    />
                    <span className="truncate" style={{ color: visible ? color : undefined }}>
                      {ch.name}
                    </span>
                  </label>
                </li>
              );
            })}
            {channels.length === 0 ? (
              <li className="text-[11px] text-muted">
                <Link href="/channels" className="text-accent hover:underline">
                  Подключить канал
                </Link>
              </li>
            ) : null}
          </ul>
        </details>

        {queuePosts.length > 0 ? (
          <details open className="group mt-4">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-text [&::-webkit-details-marker]:hidden">
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-0 -rotate-90" />
              Без даты
              <span className="ml-auto rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-normal text-muted">
                {queuePosts.length}
              </span>
            </summary>
            <p className="mt-1 pl-1 text-[10px] text-muted">Перетащите на день в календаре</p>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto pl-1">
              {queuePosts.map((post) => (
                <CalendarEventCard
                  key={post.id}
                  post={post}
                  channels={channels}
                  timeZone={timeZone}
                  compact
                  showTime={false}
                  selected={selectedId === post.id}
                  onSelect={() => onSelectPost(post.id)}
                  onDragStart={(e) => onDragStart(post, e)}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>
          </details>
        ) : null}

        <div className="mt-4 pl-1">
          <Link
            href="/channels"
            className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
          >
            <Plus className="h-3 w-3" />
            Подключить канал
          </Link>
        </div>
      </div>
    </aside>
  );
}
