"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { CalendarView } from "@/lib/calendar-utils";
import { CALENDAR_VIEWS, formatPeriodTitle } from "@/lib/calendar-utils";
import { CalendarFiltersBar, type StatusFilter } from "@/components/calendar/CalendarFiltersBar";
import type { ChannelListItem } from "@/lib/api";
import { ChevronLeft, ChevronRight, Plus, SlidersHorizontal } from "lucide-react";
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
  onExportIcal?: () => void;
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  channels: ChannelListItem[];
  status: StatusFilter;
  channelId: string;
  query: string;
  hidePublished: boolean;
  origin: "" | "user" | "agent";
  onStatusChange: (status: StatusFilter) => void;
  onChannelChange: (channelId: string) => void;
  onQueryChange: (query: string) => void;
  onHidePublishedChange: (hide: boolean) => void;
  onOriginChange: (origin: "" | "user" | "agent") => void;
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
  onExportIcal,
  filtersOpen,
  onFiltersOpenChange,
  channels,
  status,
  channelId,
  query,
  hidePublished,
  origin,
  onStatusChange,
  onChannelChange,
  onQueryChange,
  onHidePublishedChange,
  onOriginChange,
}: CalendarToolbarProps) {
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filtersOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        onFiltersOpenChange(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filtersOpen, onFiltersOpenChange]);

  return (
    <div className="flex flex-col border-b border-border bg-surface">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:px-4">
        <Link
          href="/posts/new"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-zinc-50"
        >
          <Plus className="h-4 w-4" />
          Новый пост
        </Link>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToday}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-text hover:bg-zinc-100"
          >
            Сегодня
          </button>
          <button
            type="button"
            onClick={onPrev}
            className="rounded-full p-2 text-muted hover:bg-zinc-100 hover:text-text"
            aria-label="Предыдущий период"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-full p-2 text-muted hover:bg-zinc-100 hover:text-text"
            aria-label="Следующий период"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <h2 className="min-w-[5rem] pl-1 text-lg font-normal capitalize text-text">
            {formatPeriodTitle(view, anchor, timeZone)}
            {loading ? <span className="ml-2 text-xs text-muted">…</span> : null}
          </h2>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-1 sm:gap-3">
          {CALENDAR_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onViewChange(v.id)}
              className={cn(
                "px-2 py-1.5 text-sm transition-colors sm:px-3",
                view === v.id
                  ? "font-medium text-accent underline decoration-2 underline-offset-4"
                  : "text-muted hover:text-text",
              )}
            >
              {v.label}
            </button>
          ))}

          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => onFiltersOpenChange(!filtersOpen)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1.5 text-sm sm:px-3",
                filtersOpen ? "font-medium text-accent" : "text-muted hover:text-text",
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Фильтр
            </button>
            {filtersOpen ? (
              <div className="absolute right-0 top-full z-30 mt-1 w-[min(100vw-2rem,22rem)] rounded-xl border border-border bg-surface p-3 shadow-lg">
                <CalendarFiltersBar
                  channels={channels}
                  status={status}
                  channelId={channelId}
                  query={query}
                  hidePublished={hidePublished}
                  origin={origin}
                  onStatusChange={onStatusChange}
                  onChannelChange={onChannelChange}
                  onQueryChange={onQueryChange}
                  onHidePublishedChange={onHidePublishedChange}
                  onOriginChange={onOriginChange}
                  layout="stack"
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                  <span className="whitespace-nowrap">Часовой пояс</span>
                  <select
                    value={displayTimeZone}
                    onChange={(e) => onDisplayTimeZoneChange(e.target.value)}
                    className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text"
                  >
                    {timezoneOptions.map((tz) => (
                      <option key={tz.id} value={tz.id}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </label>
                {onExportIcal ? (
                  <button
                    type="button"
                    onClick={onExportIcal}
                    className="mt-2 w-full rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-zinc-50"
                  >
                    Скачать iCal (.ics)
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
