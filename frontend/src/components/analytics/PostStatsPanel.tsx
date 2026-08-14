"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Info, Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  fetchPostAnalytics,
  formatMetric,
  measurabilityLabel,
  type PostAnalyticsResponse,
} from "@/lib/analytics-api";

function MetricTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function PostStatsPanel({ postId, published }: { postId: string; published: boolean }) {
  const [data, setData] = useState<PostAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!published || !postId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPostAnalytics(postId);
      setData(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить статистику");
    } finally {
      setLoading(false);
    }
  }, [postId, published]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(() => {
    if (!data?.timeline?.length) return [];
    return data.timeline.map((point) => ({
      label: new Date(point.snapshot_at).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      views: point.views,
      clicks: point.clicks,
      metrika_visits: point.metrika_visits,
    }));
  }, [data?.timeline]);

  if (!published) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-2">
        <BarChart3 className="mt-0.5 h-5 w-5 text-accent" />
        <div>
          <h2 className="text-base font-semibold">Статистика публикации</h2>
          <p className="text-sm text-muted">
            Данные обновляются автоматически каждые ~15 минут после выхода поста.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка статистики…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : data && !data.visible ? (
        <div className="flex gap-2 rounded-lg border border-dashed border-border bg-zinc-50 p-4 text-sm text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{data.explanation}</p>
        </div>
      ) : data ? (
        <div className="space-y-4">
          {data.explanation ? (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">{data.explanation}</p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="Просмотры" value={formatMetric(data.totals.views)} />
            <MetricTile label="Переходы" value={formatMetric(data.totals.clicks)} hint={`≈ ${formatMetric(data.totals.clicks_unique)} уник.`} />
            <MetricTile label="Вовлечённость" value={formatMetric(data.totals.likes + data.totals.comments + data.totals.shares)} />
            <MetricTile label="Визиты Метрики" value={formatMetric(data.totals.metrika_visits)} hint={`Цели: ${formatMetric(data.totals.metrika_goals)}`} />
          </div>

          {chartData.length > 1 ? (
            <div className="h-56 rounded-lg border border-border bg-white p-3">
              <p className="mb-2 text-sm font-medium">Динамика</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="views" name="Просмотры" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="clicks" name="Переходы" stroke="#059669" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="metrika_visits" name="Метрика" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : null}

          <div className="space-y-3">
            {data.targets.map((target) => (
              <div key={target.target_id} className="rounded-lg border border-border bg-white p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{target.channel_name || target.provider_label}</p>
                    <p className="text-xs text-muted">{measurabilityLabel(target.measurability)}</p>
                  </div>
                  {target.provider_note ? (
                    <p className="max-w-md text-xs text-muted">{target.provider_note}</p>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <MetricTile label="Просмотры" value={formatMetric(target.views)} />
                  <MetricTile label="Охват" value={formatMetric(target.reach)} />
                  <MetricTile label="Лайки" value={formatMetric(target.likes)} />
                  <MetricTile label="Коммент." value={formatMetric(target.comments)} />
                  <MetricTile label="Репосты" value={formatMetric(target.shares)} />
                  <MetricTile label="Переходы" value={formatMetric(target.clicks)} />
                </div>
                {target.subscriber_count != null ? (
                  <p className="mt-2 text-xs text-muted">Подписчиков канала: {formatMetric(target.subscriber_count)}</p>
                ) : null}
                {target.metrika_by_counter && target.metrika_by_counter.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {target.metrika_by_counter.map((c) => (
                      <span
                        key={c.counter_id}
                        className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs text-violet-900"
                      >
                        {c.label?.trim() || `Счётчик ${c.counter_id}`}: {formatMetric(c.visits)} виз.
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
