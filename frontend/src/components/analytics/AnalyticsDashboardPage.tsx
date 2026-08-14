"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, Unplug, Link2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  connectMetrika,
  disconnectMetrika,
  fetchAnalyticsOverview,
  fetchAnalyticsPosts,
  fetchMetrikaStatus,
  formatMetric,
  type AnalyticsOverview,
  type AnalyticsPostSummary,
  type AnalyticsProviderBreakdown,
  type AnalyticsDailyPoint,
  type MetrikaStatus,
} from "@/lib/analytics-api";

const CHART_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed"];

function formatShortDate(date: string) {
  return new Date(date).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function MetrikaConnectCard({
  status,
  workspaceId,
  onChanged,
}: {
  status: MetrikaStatus | null;
  workspaceId: string;
  onChanged: () => void;
}) {
  const [counterId, setCounterId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    const parsed = Number(counterId.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Укажите номер счётчика Метрики");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await connectMetrika(workspaceId, parsed);
      window.location.href = res.redirect_url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось начать подключение");
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await disconnectMetrika();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось отключить Метрику");
    } finally {
      setBusy(false);
    }
  };

  if (!status?.oauth_ready) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        OAuth Яндекс Метрики на платформе не настроен. Администратор может указать OAuth-приложение в{" "}
        <a href="/admin/settings?section=analytics-metrika" className="font-medium underline">
          настройках платформы
        </a>
        . Переходы по ссылкам Postilka всё равно считаются; визиты на сайте появятся после подключения Метрики.
      </div>
    );
  }

  if (status.connected && status.enabled) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-emerald-900">Яндекс Метрика подключена</p>
            <p className="mt-1 text-sm text-emerald-800">
              Счётчик {status.counter_id}. Визиты и цели подтягиваются по UTM-кампаниям постов.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDisconnect()}
            className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
            Отключить
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="font-semibold">Подключить Яндекс Метрику</p>
      <p className="mt-1 text-sm text-muted">
        Укажите номер счётчика и авторизуйтесь в Яндексе — Postilka покажет визиты и достижения целей по UTM
        кампаниям ваших постов.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Номер счётчика</span>
          <input
            value={counterId}
            onChange={(e) => setCounterId(e.target.value)}
            placeholder="12345678"
            className="w-48 rounded-md border border-border px-3 py-2"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleConnect()}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
          Подключить
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function AnalyticsDashboardPage() {
  const { active_workspace } = useAuth();
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [series, setSeries] = useState<AnalyticsDailyPoint[]>([]);
  const [providers, setProviders] = useState<AnalyticsProviderBreakdown[]>([]);
  const [posts, setPosts] = useState<AnalyticsPostSummary[]>([]);
  const [metrika, setMetrika] = useState<MetrikaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!active_workspace?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, postsRes, metrikaRes] = await Promise.all([
        fetchAnalyticsOverview({ from, to }),
        fetchAnalyticsPosts({ from, to, limit: 20 }),
        fetchMetrikaStatus(),
      ]);
      setOverview(analyticsRes.overview);
      setSeries(analyticsRes.series);
      setProviders(analyticsRes.providers);
      setPosts(postsRes.items);
      setMetrika(metrikaRes);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить аналитику");
    } finally {
      setLoading(false);
    }
  }, [active_workspace?.id, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(
    () =>
      series.map((point) => ({
        ...point,
        label: formatShortDate(point.date),
      })),
    [series],
  );

  return (
    <div>
      <PageHeader
        title="Аналитика"
        description="Эффективность публикаций: охват на площадках, переходы по ссылкам и визиты на сайт."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted">С</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-md border border-border px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">По</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-md border border-border px-3 py-2" />
        </label>
      </div>

      {active_workspace?.id ? (
        <div className="mb-6">
          <MetrikaConnectCard status={metrika} workspaceId={active_workspace.id} onChanged={() => void load()} />
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Загрузка…
        </div>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : overview ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Опубликовано" value={formatMetric(overview.published_posts)} hint={`С данными: ${overview.posts_with_data}`} />
            <StatCard label="Просмотры" value={formatMetric(overview.total_views)} hint={`Охват: ${formatMetric(overview.total_reach)}`} />
            <StatCard label="Переходы" value={formatMetric(overview.total_clicks)} hint={`Уникальные ≈ ${formatMetric(overview.total_clicks_unique)}`} />
            <StatCard
              label="Визиты Метрики"
              value={formatMetric(overview.metrika_visits)}
              hint={overview.metrika_connected ? `Цели: ${formatMetric(overview.metrika_goals)}` : "Метрика не подключена"}
            />
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <p className="mb-4 text-sm font-semibold">Динамика просмотров и переходов</p>
              <div className="h-64">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="views" name="Просмотры" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="clicks" name="Переходы" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="metrika_visits" name="Визиты Метрики" stroke={CHART_COLORS[3]} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-muted">
                    График появится после первых снимков метрик
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <p className="mb-4 text-sm font-semibold">По каналам</p>
              <div className="h-64">
                {providers.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={providers}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="provider_label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="views" name="Просмотры" fill={CHART_COLORS[0]} />
                      <Bar dataKey="clicks" name="Переходы" fill={CHART_COLORS[1]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-muted">Нет данных за период</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <p className="font-semibold">Публикации за период</p>
              <p className="text-sm text-muted">Статистика поста отображается после первого значимого показателя</p>
            </div>
            <div className="divide-y divide-border">
              {posts.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted">Нет опубликованных постов за выбранный период</p>
              ) : (
                posts.map((post) => (
                  <div key={post.post_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link href={`/posts/${post.post_id}`} className="font-medium hover:text-accent">
                        {post.preview || "Без текста"}
                      </Link>
                      <p className="text-xs text-muted">
                        {post.published_at
                          ? new Date(post.published_at).toLocaleString("ru-RU")
                          : "—"}
                        {" · "}
                        {post.channels_count} кан.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span>{post.has_data ? `${formatMetric(post.views)} просм.` : "Сбор данных…"}</span>
                      <span>{formatMetric(post.clicks)} переходов</span>
                      <span>{formatMetric(post.engagement)} вовлеч.</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
