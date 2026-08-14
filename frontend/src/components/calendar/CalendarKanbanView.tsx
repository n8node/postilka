"use client";

import type { Post } from "@/lib/posts-api";
import type { ChannelListItem } from "@/lib/api";
import type { PostMetricsSummary } from "@/lib/calendar-metrics";
import { postCalendarDate } from "@/lib/calendar-utils";
import { postHasConflict } from "@/lib/calendar-conflicts";
import { CalendarEventCard } from "@/components/calendar/CalendarEventCard";
import { cn } from "@/lib/utils";

export type KanbanColumnId = "draft" | "pending_approval" | "scheduled" | "published" | "issues";

const KANBAN_COLUMNS: {
  id: KanbanColumnId;
  label: string;
  statuses: Post["status"][];
}[] = [
  { id: "draft", label: "Черновик", statuses: ["draft"] },
  { id: "pending_approval", label: "Согласование", statuses: ["pending_approval"] },
  { id: "scheduled", label: "Запланирован", statuses: ["scheduled", "publishing"] },
  { id: "published", label: "Опубликован", statuses: ["published"] },
  { id: "issues", label: "Проблемы", statuses: ["failed", "canceled"] },
];

type CalendarKanbanViewProps = {
  posts: Post[];
  channels: ChannelListItem[];
  timeZone: string;
  selectedId: string | null;
  metricsByPost: Map<string, PostMetricsSummary>;
  conflicts: ReturnType<typeof import("@/lib/calendar-conflicts").detectCalendarConflicts>;
  draggingId: string | null;
  dropColumn: KanbanColumnId | null;
  onSelect: (id: string) => void;
  onDragStart: (post: Post, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOverColumn: (column: KanbanColumnId, e: React.DragEvent) => void;
  onDropColumn: (column: KanbanColumnId, e: React.DragEvent) => void;
};

function columnForPost(post: Post): KanbanColumnId {
  for (const col of KANBAN_COLUMNS) {
    if (col.statuses.includes(post.status)) return col.id;
  }
  return "draft";
}

export function CalendarKanbanView({
  posts,
  channels,
  timeZone,
  selectedId,
  metricsByPost,
  conflicts,
  draggingId,
  dropColumn,
  onSelect,
  onDragStart,
  onDragEnd,
  onDragOverColumn,
  onDropColumn,
}: CalendarKanbanViewProps) {
  const grouped = new Map<KanbanColumnId, Post[]>();
  for (const col of KANBAN_COLUMNS) grouped.set(col.id, []);

  for (const post of posts) {
    const col = columnForPost(post);
    grouped.get(col)!.push(post);
  }

  for (const [, list] of grouped) {
    list.sort((a, b) => (postCalendarDate(a)?.getTime() ?? 0) - (postCalendarDate(b)?.getTime() ?? 0));
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {KANBAN_COLUMNS.map((col) => {
        const items = grouped.get(col.id) ?? [];
        const isDrop = dropColumn === col.id;

        return (
          <div
            key={col.id}
            className="flex w-56 shrink-0 flex-col rounded-xl border border-border bg-zinc-50/80 sm:w-64"
            onDragOver={(e) => onDragOverColumn(col.id, e)}
            onDrop={(e) => onDropColumn(col.id, e)}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <h3 className="text-xs font-semibold text-text">{col.label}</h3>
              <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted">
                {items.length}
              </span>
            </div>
            <div
              className={cn(
                "flex min-h-[12rem] flex-1 flex-col gap-1.5 p-2 transition-colors duration-150",
                isDrop && "bg-accent/10 ring-2 ring-inset ring-accent/40",
              )}
            >
              {items.length === 0 ? (
                <p className="py-6 text-center text-[10px] text-muted">Пусто</p>
              ) : (
                items.map((post) => (
                  <CalendarEventCard
                    key={post.id}
                    post={post}
                    channels={channels}
                    timeZone={timeZone}
                    selected={selectedId === post.id}
                    hasConflict={postHasConflict(post.id, conflicts)}
                    dragging={draggingId === post.id}
                    metrics={metricsByPost.get(post.id)}
                    onSelect={() => onSelect(post.id)}
                    onDragStart={(e) => onDragStart(post, e)}
                    onDragEnd={onDragEnd}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { KANBAN_COLUMNS, columnForPost };
