import type { Post, PostSaveInput } from "@/lib/posts-api";

export const POST_STATUS_LABEL: Record<Post["status"], string> = {
  draft: "Черновик",
  pending_approval: "На согласовании",
  scheduled: "Запланирован",
  publishing: "Публикуется",
  published: "Опубликован",
  failed: "Ошибка",
  canceled: "Отменён",
};

export const POST_STATUS_CLASS: Record<Post["status"], string> = {
  draft: "bg-zinc-100 text-zinc-700",
  pending_approval: "bg-amber-50 text-amber-800",
  scheduled: "bg-blue-50 text-blue-700",
  publishing: "bg-violet-50 text-violet-700",
  published: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  canceled: "bg-zinc-100 text-zinc-500",
};

const FORMAT_LABEL: Record<string, string> = {
  message: "Пост",
  rich_message: "Статья",
  article: "Статья",
  story: "История",
  short_video: "Короткое видео",
  video: "Видео",
  shorts: "Shorts",
};

export function postFormatLabel(format: string | undefined) {
  if (!format) return "Пост";
  return FORMAT_LABEL[format] ?? format;
}

export function htmlToPlainText(html: string) {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, "").trim();
  const node = document.createElement("div");
  node.innerHTML = html;
  return (node.innerText || node.textContent || "").trim();
}

export function postPreviewText(post: Post) {
  const text =
    post.content.text ||
    post.content.rich_message?.title ||
    post.content.title ||
    post.content.rich_message?.blocks?.[0]?.text ||
    "";
  const plain = htmlToPlainText(text);
  return plain || "Без текста";
}

export function postDisplayDate(post: Post) {
  if (post.status === "scheduled" && post.due_at) {
    return { label: "Запланирован", value: post.due_at };
  }
  if (post.status === "published" && post.published_at) {
    return { label: "Опубликован", value: post.published_at };
  }
  return { label: "Изменён", value: post.updated_at };
}

export function canEditPost(status: Post["status"]) {
  return ["draft", "failed", "canceled", "pending_approval"].includes(status);
}

export function canDeletePost(status: Post["status"]) {
  return status === "draft" || status === "canceled" || status === "failed";
}

export function canCancelPost(status: Post["status"]) {
  return ["draft", "scheduled", "failed", "pending_approval"].includes(status);
}

export function canRetryPost(status: Post["status"]) {
  return status === "failed";
}

export function postToSaveInput(post: Post): PostSaveInput {
  return {
    content: post.content,
    settings: post.settings,
    targets: post.targets.map((target) => ({
      channel_id: target.channel_id,
      settings: target.settings ?? {},
    })),
    media: post.media.map((item) => ({
      file_id: item.file_id,
      settings: item.settings ?? {},
    })),
  };
}
