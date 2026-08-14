"use client";

import type { Post } from "@/lib/posts-api";
import type { ChannelListItem } from "@/lib/api";
import type { PostMetricsSummary } from "@/lib/calendar-metrics";
import {
  addDays,
  dateKey,
  formatTime,
  postCalendarDate,
  startOfWeek,
  WEEKDAY_LABELS,
} from "@/lib/calendar-utils";
import { postPreviewText, POST_STATUS_CLASS } from "@/lib/posts-display";
import { CalendarEventMetrics } from "@/components/calendar/CalendarEventMetrics";
import { cn } from "@/lib/utils";

type CalendarTimelineViewProps = {
  anchor: Date;
  timeZone: string;
  posts: Post[];
  channels: ChannelListItem[];
  selectedId: string | null;
  metricsByPost: Map<string, PostMetricsSummary>;
  onSelect: (id: string) => void;
};

export function CalendarTimelineView({
  anchor,
  timeZone,
  posts,
  channels,
  selectedId,
  metricsByPost,
  onSelect,
}: CalendarTimelineViewProps) {
  const start = startOfWeek(anchor, timeZone);
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i, timeZone));
  const dayKeys = days.map((d) => dateKey(d, timeZone));

  const timed = posts
    .map((post) => ({ post, at: postCalendarDate(post) }))
    .filter((item): item is { post: Post; at: Date } => item.at != null)
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  const todayKey = dateKey(new Date(), timeZone);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <div className="min-w-[48rem]">
          <div className="grid border-b border-border bg-zinc-50" style={{ gridTemplateColumns: "10rem repeat(14, 1fr)" }}>
            <div className="border-r border-border px-3 py-2 text-xs font-medium text-muted">Публикация</div>
            {days.map((day, i) => {
              const key = dayKeys[i]!;
              return (
                <div
                  key={key}
                  className={cn(
                    "border-r border-border px-1 py-2 text-center last:border-r-0",
                    key === todayKey && "bg-accent/5",
                  )}
                >
                  <div className="text-[9px] font-medium uppercase text-muted">{WEEKDAY_LABELS[i % 7]}</div>
                  <div className="text-[11px] font-semibold tabular-nums">
                    {new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", timeZone }).format(day)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="divide-y divide-border">
            {timed.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted">Нет публикаций на timeline</div>
            ) : (
              timed.map(({ post, at }) => {
                const key = dateKey(at, timeZone);
                const dayIndex = dayKeys.indexOf(key);
                const metrics = metricsByPost.get(post.id);
                const targetCount = post.targets.length;

                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => onSelect(post.id)}
                    className={cn(
                      "grid w-full text-left transition-colors hover:bg-zinc-50",
                      selectedId === post.id && "bg-accent/5",
                    )}
                    style={{ gridTemplateColumns: "10rem repeat(14, 1fr)" }}
                  >
                    <div className="border-r border-border px-3 py-2.5">
                      <p className="truncate text-xs font-medium">{postPreviewText(post)}</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {formatTime(at.toISOString(), timeZone)}
                        {targetCount > 0 ? ` · ${targetCount} кан.` : ""}
                      </p>
                      {post.status === "published" ? (
                        <CalendarEventMetrics metrics={metrics} compact className="mt-1" />
                      ) : null}
                    </div>
                    {days.map((day, i) => {
                      const cellKey = dayKeys[i]!;
                      const active = cellKey === key;
                      return (
                        <div
                          key={cellKey}
                          className={cn(
                            "relative border-r border-border/60 py-2.5 last:border-r-0",
                            cellKey === todayKey && "bg-accent/[0.03]",
                          )}
                        >
                          {active ? (
                            <div
                              className={cn(
                                "mx-1 h-2 rounded-full shadow-sm transition-transform hover:scale-y-125",
                                POST_STATUS_CLASS[post.status],
                              )}
                              title={`${postPreviewText(post)} — ${formatTime(at.toISOString(), timeZone)}`}
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
