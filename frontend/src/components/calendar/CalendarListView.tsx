"use client";

import Link from "next/link";
import type { Post } from "@/lib/posts-api";
import type { ChannelListItem } from "@/lib/api";
import { formatDateTime, postCalendarDate } from "@/lib/calendar-utils";
import { postHasConflict } from "@/lib/calendar-conflicts";
import { ChannelAvatar } from "@/components/channels/ChannelAvatar";
import {
  postPreviewText,
  POST_STATUS_CLASS,
  POST_STATUS_LABEL,
} from "@/lib/posts-display";
import { CalendarEventMetrics } from "@/components/calendar/CalendarEventMetrics";
import type { PostMetricsSummary } from "@/lib/calendar-metrics";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

type CalendarListViewProps = {
  posts: Post[];
  channels: ChannelListItem[];
  timeZone: string;
  selectedId: string | null;
  conflicts: ReturnType<typeof import("@/lib/calendar-conflicts").detectCalendarConflicts>;
  metricsByPost: Map<string, PostMetricsSummary>;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
};

export function CalendarListView({
  posts,
  channels,
  timeZone,
  selectedId,
  conflicts,
  metricsByPost,
  selectedIds,
  onSelect,
  onToggleSelect,
}: CalendarListViewProps) {
  const sorted = [...posts].sort(
    (a, b) => (postCalendarDate(a)?.getTime() ?? 0) - (postCalendarDate(b)?.getTime() ?? 0),
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center text-sm text-muted">
        Нет публикаций в выбранном периоде
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-border bg-zinc-50 text-muted">
          <tr>
            <th className="w-8 px-3 py-2" />
            <th className="px-3 py-2 font-medium">Дата</th>
            <th className="px-3 py-2 font-medium">Публикация</th>
            <th className="px-3 py-2 font-medium">Каналы</th>
            <th className="px-3 py-2 font-medium">Статус</th>
            <th className="px-3 py-2 font-medium">Метрики</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((post) => {
            const at = postCalendarDate(post);
            const targetChannels = post.targets
              .map((t) => channels.find((c) => c.id === t.channel_id))
              .filter(Boolean) as ChannelListItem[];
            const conflict = postHasConflict(post.id, conflicts);

            return (
              <tr
                key={post.id}
                onClick={() => onSelect(post.id)}
                className={cn(
                  "cursor-pointer border-b border-border/60 transition-colors hover:bg-zinc-50",
                  selectedId === post.id && "bg-accent/5",
                )}
              >
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(post.id)}
                    onChange={() => onToggleSelect(post.id)}
                    className="rounded border-border"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted">
                  {at ? formatDateTime(at.toISOString(), timeZone) : "—"}
                </td>
                <td className="max-w-xs px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {conflict ? <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" /> : null}
                    <Link
                      href={`/posts/${post.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="truncate font-medium text-text hover:text-accent"
                    >
                      {postPreviewText(post)}
                    </Link>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex -space-x-1">
                    {targetChannels.slice(0, 4).map((ch) => (
                      <ChannelAvatar
                        key={ch.id}
                        channelId={ch.id}
                        name={ch.name}
                        metadata={ch.metadata}
                        provider={ch.provider}
                        size="sm"
                        className="!h-6 !w-6 ring-2 ring-surface"
                      />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      POST_STATUS_CLASS[post.status],
                    )}
                  >
                    {POST_STATUS_LABEL[post.status]}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {post.status === "published" ? (
                    <CalendarEventMetrics metrics={metricsByPost.get(post.id)} compact />
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
