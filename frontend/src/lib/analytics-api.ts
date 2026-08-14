import { apiFetch } from "@/lib/api";

export type PostTargetMetrics = {
  target_id: string;
  post_id: string;
  channel_id: string;
  provider: string;
  provider_label: string;
  channel_name?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  clicks: number;
  clicks_unique: number;
  metrika_visits: number;
  metrika_users: number;
  metrika_goals: number;
  subscriber_count?: number | null;
  measurability: "auto" | "partial" | "manual";
  provider_note?: string;
  has_data: boolean;
  first_data_at?: string | null;
  fetched_at?: string | null;
  updated_at: string;
};

export type AnalyticsOverview = {
  from: string;
  to: string;
  published_posts: number;
  posts_with_data: number;
  total_views: number;
  total_reach: number;
  total_engagement: number;
  total_clicks: number;
  total_clicks_unique: number;
  metrika_visits: number;
  metrika_goals: number;
  metrika_connected: boolean;
};

export type AnalyticsDailyPoint = {
  date: string;
  views: number;
  clicks: number;
  engagement: number;
  metrika_visits: number;
};

export type AnalyticsProviderBreakdown = {
  provider: string;
  provider_label: string;
  posts: number;
  views: number;
  clicks: number;
  engagement: number;
};

export type AnalyticsPostSummary = {
  post_id: string;
  preview: string;
  published_at?: string | null;
  has_data: boolean;
  views: number;
  clicks: number;
  engagement: number;
  channels_count: number;
};

export type PostAnalyticsResponse = {
  post_id: string;
  status: string;
  preview: string;
  published_at?: string | null;
  has_data: boolean;
  visible: boolean;
  explanation?: string;
  targets: PostTargetMetrics[];
  timeline: {
    snapshot_at: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    clicks: number;
    metrika_visits: number;
    metrika_goals: number;
  }[];
  totals: PostTargetMetrics;
};

export type MetrikaStatus = {
  connected: boolean;
  enabled: boolean;
  counter_id?: number;
  connected_at?: string | null;
  oauth_ready: boolean;
};

export async function fetchAnalyticsOverview(params: { from: string; to: string }) {
  const q = new URLSearchParams(params);
  return apiFetch<{
    overview: AnalyticsOverview;
    series: AnalyticsDailyPoint[];
    providers: AnalyticsProviderBreakdown[];
  }>(`/analytics/overview?${q.toString()}`);
}

export async function fetchAnalyticsPosts(params: {
  from: string;
  to: string;
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams({
    from: params.from,
    to: params.to,
    limit: String(params.limit ?? 25),
    offset: String(params.offset ?? 0),
  });
  return apiFetch<{ items: AnalyticsPostSummary[]; total: number }>(`/analytics/posts?${q.toString()}`);
}

export async function fetchPostAnalytics(postId: string) {
  return apiFetch<PostAnalyticsResponse>(`/posts/${postId}/analytics`);
}

export async function fetchMetrikaStatus() {
  return apiFetch<MetrikaStatus>("/analytics/metrika/status");
}

export async function connectMetrika(workspaceId: string, counterId: number) {
  return apiFetch<{ authorize_url: string; state: string }>("/analytics/metrika/connect", {
    method: "POST",
    body: JSON.stringify({ workspace_id: workspaceId, counter_id: counterId }),
  });
}

export async function completeMetrikaConnect(state: string, code: string) {
  return apiFetch<{ ok: boolean }>("/analytics/metrika/connect/complete", {
    method: "POST",
    body: JSON.stringify({ state, code }),
  });
}

export async function disconnectMetrika() {
  return apiFetch<{ ok: boolean }>("/analytics/metrika/disconnect", { method: "DELETE" });
}

export function measurabilityLabel(value: PostTargetMetrics["measurability"]) {
  switch (value) {
    case "auto":
      return "Автоматически";
    case "manual":
      return "Вручную";
    default:
      return "Частично";
  }
}

export function formatMetric(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}
