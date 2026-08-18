"use client";

import { Search } from "lucide-react";
import type { Post } from "@/lib/posts-api";
import type { ChannelListItem } from "@/lib/api";
import { POST_STATUS_LABEL } from "@/lib/posts-display";
import { cn } from "@/lib/utils";

type StatusFilter = Post["status"] | "";

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "", label: "Все статусы" },
  { id: "scheduled", label: POST_STATUS_LABEL.scheduled },
  { id: "pending_approval", label: POST_STATUS_LABEL.pending_approval },
  { id: "draft", label: POST_STATUS_LABEL.draft },
  { id: "published", label: POST_STATUS_LABEL.published },
  { id: "failed", label: POST_STATUS_LABEL.failed },
];

type CalendarFiltersBarProps = {
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
  layout?: "inline" | "stack";
};

export function CalendarFiltersBar({
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
  layout = "inline",
}: CalendarFiltersBarProps) {
  void origin;
  void onOriginChange;
  const stack = layout === "stack";
  return (
    <div className={cn("flex gap-2", stack ? "flex-col" : "mb-3 flex-wrap items-center")}>
      <div className="relative min-w-[10rem] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Поиск по тексту…"
          className="w-full rounded-md border border-border bg-surface py-1.5 pl-8 pr-3 text-xs"
        />
      </div>
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.id || "all"} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        value={channelId}
        onChange={(e) => onChannelChange(e.target.value)}
        className="max-w-[10rem] rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
      >
        <option value="">Все каналы</option>
        {channels.map((ch) => (
          <option key={ch.id} value={ch.id}>
            {ch.name}
          </option>
        ))}
      </select>
      {/* Hidden until agents return:
      <select
        value={origin}
        onChange={(e) => onOriginChange(e.target.value as "" | "user" | "agent")}
        className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs"
      >
        <option value="">Все авторы</option>
        <option value="user">Мои</option>
        <option value="agent">Агент</option>
      </select>
      */}
      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
        <input
          type="checkbox"
          checked={hidePublished}
          onChange={(e) => onHidePublishedChange(e.target.checked)}
          className="rounded border-border"
        />
        Скрыть опубликованные
      </label>
    </div>
  );
}

export type { StatusFilter };
