import type { Post } from "@/lib/posts-api";
import type { ChannelListItem } from "@/lib/api";
import { postCalendarDate } from "@/lib/calendar-utils";

export type CalendarConflict = {
  id: string;
  type: "channel_overlap" | "density";
  message: string;
  postIds: string[];
};

const OVERLAP_MINUTES = 30;
const DENSITY_THRESHOLD = 5;

function isConflictEligible(post: Post, at: Date) {
  if (post.status === "published") return false;
  return at.getTime() > Date.now();
}

export function detectCalendarConflicts(
  posts: Post[],
  channels: ChannelListItem[],
  timeZone: string,
): CalendarConflict[] {
  const conflicts: CalendarConflict[] = [];
  const channelMap = new Map(channels.map((c) => [c.id, c]));

  const timed = posts
    .map((post) => ({ post, at: postCalendarDate(post) }))
    .filter((item): item is { post: Post; at: Date } => item.at != null && isConflictEligible(item.post, item.at))
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i]!;
      const b = timed[j]!;
      const diffMin = Math.abs(a.at.getTime() - b.at.getTime()) / 60_000;
      if (diffMin > OVERLAP_MINUTES) continue;
      const shared = a.post.targets
        .map((t) => t.channel_id)
        .filter((id) => b.post.targets.some((t) => t.channel_id === id));
      if (shared.length === 0) continue;
      const chName = channelMap.get(shared[0]!)?.name ?? "канал";
      conflicts.push({
        id: `${a.post.id}-${b.post.id}-${shared[0]}`,
        type: "channel_overlap",
        message: `Пересечение в ${chName}: два поста в пределах ${OVERLAP_MINUTES} мин`,
        postIds: [a.post.id, b.post.id],
      });
    }
  }

  const byDay = new Map<string, Post[]>();
  for (const { post, at } of timed) {
    const key = new Intl.DateTimeFormat("en-CA", { timeZone }).format(at);
    const list = byDay.get(key) ?? [];
    list.push(post);
    byDay.set(key, list);
  }
  for (const [day, dayPosts] of byDay) {
    if (dayPosts.length >= DENSITY_THRESHOLD) {
      conflicts.push({
        id: `density-${day}`,
        type: "density",
        message: `${dayPosts.length} публикаций в один день — проверьте нагрузку каналов`,
        postIds: dayPosts.map((p) => p.id),
      });
    }
  }

  return conflicts;
}

export function postHasConflict(postId: string, conflicts: CalendarConflict[]) {
  return conflicts.some((c) => c.postIds.includes(postId));
}
