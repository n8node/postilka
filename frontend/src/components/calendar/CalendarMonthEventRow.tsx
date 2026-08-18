"use client";

import type { Post } from "@/lib/posts-api";
import { formatTime, postCalendarDate } from "@/lib/calendar-utils";
import { postPreviewText } from "@/lib/posts-display";
import { cn } from "@/lib/utils";

type CalendarMonthEventRowProps = {
  post: Post;
  timeZone: string;
  color?: string;
  selected?: boolean;
  onSelect: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  draggable?: boolean;
};

export function CalendarMonthEventRow({
  post,
  timeZone,
  color,
  selected,
  onSelect,
  onDragStart,
  onDragEnd,
  draggable,
}: CalendarMonthEventRowProps) {
  const at = postCalendarDate(post);
  const title = postPreviewText(post);

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        "group/event flex w-full min-w-0 items-baseline gap-1 rounded px-0.5 py-px text-left text-[11px] leading-snug transition-colors hover:bg-zinc-100",
        selected && "bg-accent/10 ring-1 ring-accent/30",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
      style={color ? { color } : undefined}
    >
      {at ? (
        <span className="shrink-0 tabular-nums opacity-80">{formatTime(at.toISOString(), timeZone)}</span>
      ) : null}
      <span className="min-w-0 truncate font-normal">{title}</span>
    </button>
  );
}
