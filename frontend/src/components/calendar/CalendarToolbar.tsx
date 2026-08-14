"use client";

import { cn } from "@/lib/utils";
import type { CalendarView } from "@/lib/calendar-utils";
import { CALENDAR_VIEWS, formatPeriodTitle } from "@/lib/calendar-utils";
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

type CalendarToolbarProps = {
  view: CalendarView;
  anchor: Date;
  timeZone: string;
  displayTimeZone: string;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onDisplayTimeZoneChange: (tz: string) => void;
  timezoneOptions: { id: string; label: string }[];
  loading?: boolean;
};

export function CalendarToolbar({
  view,
  anchor,
  timeZone,
  displayTimeZone,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onDisplayTimeZoneChange,
  timezoneOptions,
  loading,
}: CalendarToolbarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-border bg-surface p-0.5 shadow-sm">
          {CALENDAR_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onViewChange(v.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                view === v.id ? "bg-accent text-white shadow-sm" : "text-muted hover:text-text",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-md border border-border p-1.5 text-muted hover:bg-zinc-50 hover:text-text"
            aria-label="Предыдущий период"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-50"
          >
            <Calendar className="h-3.5 w-3.5" />
            Сегодня
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-md border border-border p-1.5 text-muted hover:bg-zinc-50 hover:text-text"
            aria-label="Следующий период"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <h2 className="text-sm font-semibold capitalize text-text sm:text-base">
          {formatPeriodTitle(view, anchor, timeZone)}
          {loading ? <span className="ml-2 text-xs font-normal text-muted">загрузка…</span> : null}
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-muted">
          <span className="whitespace-nowrap">Часовой пояс</span>
          <select
            value={displayTimeZone}
            onChange={(e) => onDisplayTimeZoneChange(e.target.value)}
            className="max-w-[12rem] rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text"
          >
            {timezoneOptions.map((tz) => (
              <option key={tz.id} value={tz.id}>
                {tz.label}
              </option>
            ))}
          </select>
        </label>
        <Link
          href="/posts/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" />
          Новый пост
        </Link>
      </div>
    </div>
  );
}
