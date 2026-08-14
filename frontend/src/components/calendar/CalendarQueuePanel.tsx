"use client";

import type { Post } from "@/lib/posts-api";
import { CalendarEventCard } from "@/components/calendar/CalendarEventCard";
import type { ChannelListItem } from "@/lib/api";
import { Inbox } from "lucide-react";

type CalendarQueuePanelProps = {
  posts: Post[];
  channels: ChannelListItem[];
  timeZone: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDragStart: (post: Post, e: React.DragEvent) => void;
  onDragEnd: () => void;
};

export function CalendarQueuePanel({
  posts,
  channels,
  timeZone,
  selectedId,
  onSelect,
  onDragStart,
  onDragEnd,
}: CalendarQueuePanelProps) {
  if (posts.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Inbox className="h-4 w-4 text-muted" />
        <h3 className="text-sm font-semibold">Очередь без даты</h3>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-muted">{posts.length}</span>
      </div>
      <p className="mb-2 text-[11px] text-muted">Перетащите черновик на день в календаре, чтобы запланировать</p>
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {posts.map((post) => (
          <CalendarEventCard
            key={post.id}
            post={post}
            channels={channels}
            timeZone={timeZone}
            showTime={false}
            selected={selectedId === post.id}
            onSelect={() => onSelect(post.id)}
            onDragStart={(e) => onDragStart(post, e)}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}
