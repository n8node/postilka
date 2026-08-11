import { apiFetch } from "@/lib/api";

export type TelegramEntity = {
  type: string;
  offset: number;
  length: number;
  url?: string;
  language?: string;
  custom_emoji_id?: string;
};

export type TelegramButton = {
  text: string;
  style?: "default" | "primary" | "success" | "danger";
  icon_custom_emoji_id?: string;
  url?: string;
  callback_data?: string;
  copy_text?: string;
  web_app_url?: string;
};

export type TelegramRichTableCell = {
  text: string;
  align?: "left";
  valign?: "top";
};

export type TelegramRichBlock = {
  type:
    | "paragraph"
    | "heading"
    | "code"
    | "quote"
    | "footer"
    | "divider"
    | "list"
    | "pullquote"
    | "details"
    | "table"
    | "mathematical_expression";
  text?: string;
  entities?: TelegramEntity[];
  size?: number;
  language?: string;
  credit?: string;
  items?: { blocks: TelegramRichBlock[] }[];
  summary?: string;
  blocks?: TelegramRichBlock[];
  is_open?: boolean;
  rows?: TelegramRichTableCell[][];
  bordered?: boolean;
  striped?: boolean;
  expression?: string;
};

export type TelegramRichMessage = {
  title?: string;
  blocks: TelegramRichBlock[];
  buttons?: TelegramButton[][];
};

export type PostContent = {
  format: "message" | "rich_message" | "article" | "story" | "short_video";
  text: string;
  parse_mode: "HTML";
  entities: TelegramEntity[];
  buttons: TelegramButton[][];
  rich_message?: TelegramRichMessage;
};

export type PostRecurrenceSettings = {
  enabled?: boolean;
  interval_days?: number;
  max_runs?: number;
  ends_at?: string;
  source_post_id?: string;
  run_number?: number;
};

export type PostSettings = {
  first_comment?: string;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  link?: {
    url?: string;
    preview_enabled?: boolean;
  };
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    shorten?: boolean;
  };
  approval_required?: boolean;
  recurrence?: PostRecurrenceSettings;
  /** separate = media then text; caption = text on media (Telegram only) */
  telegram_media_layout?: "separate" | "caption";
  /** above | below — caption position when telegram_media_layout is caption */
  telegram_caption_position?: "above" | "below";
  /** media_first | text_first — message order when telegram_media_layout is separate */
  telegram_media_order?: "media_first" | "text_first";
  /** MAX-only inline link buttons */
  max_buttons?: TelegramButton[][];
};

export type PostTargetSettings = {
  detached?: boolean;
  content?: Partial<PostContent>;
  settings?: Partial<PostSettings>;
};

export type PostTarget = {
  id: string;
  channel_id: string;
  status: string;
  settings: PostTargetSettings;
  provider_post_id?: string;
  last_error?: string;
};

export type PostMedia = {
  id: string;
  file_id: string;
  position: number;
  settings: { alt_text?: string };
};

export type Post = {
  id: string;
  workspace_id: string;
  status:
    | "draft"
    | "pending_approval"
    | "scheduled"
    | "publishing"
    | "published"
    | "failed"
    | "canceled";
  content: PostContent;
  settings: PostSettings;
  due_at?: string;
  published_at?: string;
  last_error?: string;
  targets: PostTarget[];
  media: PostMedia[];
  created_at: string;
  updated_at: string;
};

export type PostApprovalEvent = {
  id: string;
  post_id: string;
  workspace_id: string;
  actor_user_id?: string;
  action: "submit" | "approve" | "reject" | "comment";
  comment?: string;
  created_at: string;
};

export type PostSaveInput = {
  content: PostContent;
  settings: PostSettings;
  targets: { channel_id: string; settings: PostTargetSettings }[];
  media: { file_id: string; settings: { alt_text?: string } }[];
};

export function fetchPosts(limit = 50, offset = 0) {
  return apiFetch<{ items: Post[] }>(`/posts?limit=${limit}&offset=${offset}`);
}

export function fetchPost(id: string) {
  return apiFetch<Post>(`/posts/${encodeURIComponent(id)}`);
}

export function createPost(input: PostSaveInput) {
  return apiFetch<Post>("/posts", { method: "POST", body: JSON.stringify(input) });
}

export function updatePost(id: string, input: PostSaveInput) {
  return apiFetch<Post>(`/posts/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deletePost(id: string) {
  return apiFetch<void>(`/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function schedulePost(id: string, dueAt: string) {
  return apiFetch<Post>(`/posts/${encodeURIComponent(id)}/schedule`, {
    method: "POST",
    body: JSON.stringify({ due_at: dueAt }),
  });
}

export function publishPost(id: string) {
  return apiFetch<Post>(`/posts/${encodeURIComponent(id)}/publish`, { method: "POST" });
}

export function cancelPost(id: string) {
  return apiFetch<Post>(`/posts/${encodeURIComponent(id)}/cancel`, { method: "POST" });
}

export function fetchPostApprovalEvents(id: string) {
  return apiFetch<{ items: PostApprovalEvent[] }>(
    `/posts/${encodeURIComponent(id)}/approval-events`,
  );
}

export function submitPostApproval(id: string, body: { comment?: string; due_at?: string } = {}) {
  return apiFetch<Post>(`/posts/${encodeURIComponent(id)}/submit-approval`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function approvePost(
  id: string,
  body: { comment?: string; due_at?: string; publish?: boolean } = {},
) {
  return apiFetch<Post>(`/posts/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function rejectPost(id: string, body: { comment?: string } = {}) {
  return apiFetch<Post>(`/posts/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function commentPost(id: string, comment: string) {
  return apiFetch<PostApprovalEvent>(`/posts/${encodeURIComponent(id)}/comments`, {
    method: "POST",
    body: JSON.stringify({ comment }),
  });
}
