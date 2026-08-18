"use client";

import type { Post } from "@/lib/posts-api";
import {
  dateKey,
  isSameMonth,
  isToday,
  monthGridDays,
  postCalendarDate,
  shiftAnchor,
  WEEKDAY_LABELS,
} from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

type CalendarYearViewProps = {
  anchor: Date;
  timeZone: string;
  posts: Post[];
  onPickMonth: (monthAnchor: Date) => void;
};

export function CalendarYearView({ anchor, timeZone, posts, onPickMonth }: CalendarYearViewProps) {
  const currentMonth = Number(
    new Intl.DateTimeFormat("en-GB", { month: "numeric", timeZone }).format(anchor),
  );
  const january = shiftAnchor("month", anchor, -(currentMonth - 1), timeZone);
  const monthAnchors = Array.from({ length: 12 }, (_, i) => shiftAnchor("month", january, i, timeZone));

  const postsByDay = new Map<string, number>();
  for (const post of posts) {
    const at = postCalendarDate(post);
    if (!at) continue;
    const key = dateKey(at, timeZone);
    postsByDay.set(key, (postsByDay.get(key) ?? 0) + 1);
  }

  return (
    <div className="grid gap-4 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {monthAnchors.map((monthAnchor) => {
        const monthLabel = new Intl.DateTimeFormat("ru-RU", { month: "long", timeZone }).format(monthAnchor);
        const days = monthGridDays(monthAnchor, timeZone).slice(0, 42);

        return (
          <button
            key={monthLabel}
            type="button"
            onClick={() => onPickMonth(monthAnchor)}
            className="rounded-lg border border-border bg-surface p-2 text-left transition-colors hover:border-accent/40 hover:bg-zinc-50"
          >
            <p className="mb-1 text-xs font-semibold capitalize">{monthLabel}</p>
            <div className="grid grid-cols-7 gap-px text-center text-[8px] text-muted">
              {WEEKDAY_LABELS.map((d) => (
                <span key={d}>{d.charAt(0)}</span>
              ))}
            </div>
            <div className="mt-0.5 grid grid-cols-7 gap-px">
              {days.map((day) => {
                const key = dateKey(day, timeZone);
                const inMonth = isSameMonth(day, monthAnchor, timeZone);
                const today = isToday(day, timeZone);
                const count = postsByDay.get(key) ?? 0;

                return (
                  <span
                    key={key}
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full text-[8px] tabular-nums",
                      !inMonth && "text-transparent",
                      inMonth && count > 0 && "bg-accent/15 font-medium text-accent",
                      today && inMonth && "bg-accent font-semibold text-white",
                    )}
                  >
                    {inMonth
                      ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", timeZone }).format(day)
                      : ""}
                  </span>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
