import type { AnalyticsPostSummary } from "@/lib/analytics-api";
import { formatMetric } from "@/lib/analytics-api";

export type PostMetricsSummary = {
  views: number;
  clicks: number;
  engagement: number;
  has_data: boolean;
};

export function metricsMapFromAnalytics(items: AnalyticsPostSummary[]) {
  const map = new Map<string, PostMetricsSummary>();
  for (const item of items) {
    map.set(item.post_id, {
      views: item.views,
      clicks: item.clicks,
      engagement: item.engagement,
      has_data: item.has_data,
    });
  }
  return map;
}

export function formatCompactMetric(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return formatMetric(value);
}
