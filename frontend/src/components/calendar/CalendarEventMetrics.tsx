"use client";

import { Eye, MousePointerClick, Heart } from "lucide-react";
import type { PostMetricsSummary } from "@/lib/calendar-metrics";
import { formatCompactMetric } from "@/lib/calendar-metrics";
import { cn } from "@/lib/utils";

type CalendarEventMetricsProps = {
  metrics?: PostMetricsSummary | null;
  compact?: boolean;
  className?: string;
};

export function CalendarEventMetrics({ metrics, compact, className }: CalendarEventMetricsProps) {
  if (!metrics?.has_data && metrics?.views === 0 && metrics?.clicks === 0 && metrics?.engagement === 0) {
    return null;
  }

  const items = [
    metrics && metrics.views > 0
      ? { icon: Eye, label: "просмотры", value: formatCompactMetric(metrics.views) }
      : null,
    metrics && metrics.clicks > 0
      ? { icon: MousePointerClick, label: "клики", value: formatCompactMetric(metrics.clicks) }
      : null,
    metrics && metrics.engagement > 0
      ? { icon: Heart, label: "вовлечённость", value: formatCompactMetric(metrics.engagement) }
      : null,
  ].filter(Boolean) as { icon: typeof Eye; label: string; value: string }[];

  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map(({ icon: Icon, label, value }) => (
        <span
          key={label}
          title={label}
          className={cn(
            "inline-flex items-center gap-0.5 rounded bg-black/5 px-1 py-0.5 font-medium tabular-nums text-emerald-800",
            compact ? "text-[9px]" : "text-[10px]",
          )}
        >
          <Icon className={compact ? "h-2 w-2" : "h-2.5 w-2.5"} aria-hidden />
          {value}
        </span>
      ))}
    </div>
  );
}
