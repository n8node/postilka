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
  completeMetrikaConnect,
  disconnectMetrikaCounter,
  fetchAnalyticsOverview,
  fetchAnalyticsPosts,
  fetchMetrikaStatus,
  fetchMetrikaUTMBindings,
  formatMetric,
  type AnalyticsOverview,
  type AnalyticsPostSummary,
  type AnalyticsProviderBreakdown,
  type AnalyticsDailyPoint,
  type MetrikaStatus,
  type MetrikaUTMBinding,
  type MetrikaCounterSummary,
} from "@/lib/analytics-api";

const CHART_COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#db2777", "#0891b2"];

function counterDisplayName(c: { counter_id: number; label?: string }) {
  return c.label?.trim() || `Счётчик ${c.counter_id}`;
}

function counterColor(counterId: number, ids: number[]) {
  const index = ids.indexOf(counterId);
  return CHART_COLORS[(index >= 0 ? index : counterId) % CHART_COLORS.length];
}

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
  const [counterLabel, setCounterLabel] = useState("");
  const [pendingConnect, setPendingConnect] = useState<{ authorizeUrl: string; state: string } | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartConnect = async () => {
    const parsed = Number(counterId.trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Укажите номер счётчика Метрики");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await connectMetrika(workspaceId, parsed);
      setPendingConnect({ authorizeUrl: res.authorize_url, state: res.state });
      setVerificationCode("");
      window.open(res.authorize_url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось начать подключение");
    } finally {
      setBusy(false);
    }
  };

  const handleCompleteConnect = async () => {
    if (!pendingConnect) return;
    const code = verificationCode.trim();
    if (!code) {
      setError("Вставьте код подтверждения со страницы Яндекса");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await completeMetrikaConnect(pendingConnect.state, code, counterLabel);
      setPendingConnect(null);
      setVerificationCode("");
      setCounterId("");
      setCounterLabel("");
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось завершить подключение");
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnectCounter = async (id: number) => {
    setBusy(true);
    setError(null);
    try {
      await disconnectMetrikaCounter(id);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось отключить счётчик");
    } finally {
      setBusy(false);
    }
  };

  const counters = status?.counters ?? [];

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

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
      <div>
        <p className="font-semibold">Яндекс Метрика</p>
        <p className="mt-1 text-sm text-muted">
          Подключите один или несколько счётчиков — статистика по UTM-кампаниям постов собирается отдельно по каждому.
        </p>
      </div>

      {counters.length > 0 ? (
        <ul className="space-y-2">
          {counters.map((c) => (
            <li
              key={c.counter_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
            >
              <div>
                <p className="font-medium text-emerald-900">{counterDisplayName(c)}</p>
                <p className="text-xs text-emerald-800">
                  ID {c.counter_id}
                  {c.visits != null ? ` · ${formatMetric(c.visits)} визитов` : ""}
                  {c.goals != null ? ` · ${formatMetric(c.goals)} целей` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleDisconnectCounter(c.counter_id)}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
              >
                <Unplug className="h-3.5 w-3.5" />
                Отключить
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="border-t border-border pt-4">
        <p className="text-sm font-medium">Добавить счётчик</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Номер счётчика</span>
            <input
              value={counterId}
              onChange={(e) => setCounterId(e.target.value)}
              placeholder="12345678"
              disabled={!!pendingConnect}
              className="w-40 rounded-md border border-border px-3 py-2 disabled:bg-slate-50"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Название (необяз.)</span>
            <input
              value={counterLabel}
              onChange={(e) => setCounterLabel(e.target.value)}
              placeholder="Основной сайт"
              disabled={!!pendingConnect}
              className="w-44 rounded-md border border-border px-3 py-2 disabled:bg-slate-50"
            />
          </label>
          {!pendingConnect ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleStartConnect()}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Получить код
            </button>
          ) : null}
        </div>

        {pendingConnect ? (
          <div className="mt-4 space-y-3 rounded-lg border border-border bg-slate-50 p-4">
            <p className="text-sm text-slate-700">
              1. Откройте{" "}
              <a
                href={pendingConnect.authorizeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline"
              >
                страницу авторизации Яндекса
              </a>
              , разрешите доступ и скопируйте код подтверждения.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">2. Код подтверждения</span>
              <input
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="1234567"
                className="max-w-xs rounded-md border border-border px-3 py-2 font-mono"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCompleteConnect()}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Подключить
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPendingConnect(null);
                  setVerificationCode("");
                  setError(null);
                }}
                className="rounded-md border border-border bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

function MetrikaUTMMapSection({
  bindings,
  counters,
}: {
  bindings: MetrikaUTMBinding[];
  counters: MetrikaCounterSummary[];
}) {
  const counterIds = useMemo(
    () => [...new Set(counters.map((c) => c.counter_id))].sort((a, b) => a - b),
    [counters],
  );

  if (counters.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <p className="font-semibold">UTM-кампании постов и счётчики Метрики</p>
        <p className="text-sm text-muted">
          Для каждого поста с UTM видно, сколько визитов зафиксировал каждый подключённый счётчик.
        </p>
        {counterIds.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-3">
            {counterIds.map((id) => {
              const meta = counters.find((c) => c.counter_id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: counterColor(id, counterIds) }}
                  />
                  {meta ? counterDisplayName(meta) : `Счётчик ${id}`}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
      {bindings.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">
          Нет постов с UTM и данными Метрики за период. Укажите utm_campaign в постах — визиты появятся после
          опроса счётчиков.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-medium">Пост</th>
                <th className="px-4 py-2 font-medium">UTM</th>
                <th className="px-4 py-2 font-medium">Счётчики</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bindings.map((row) => (
                <tr key={`${row.post_id}-${row.target_id}-${row.utm_campaign}`}>
                  <td className="px-4 py-3 align-top">
                    <Link href={`/posts/${row.post_id}`} className="font-medium hover:text-accent">
                      {row.post_preview || "Без текста"}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {row.channel_name || "Канал"}
                      {row.published_at
                        ? ` · ${new Date(row.published_at).toLocaleDateString("ru-RU")}`
                        : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <p className="font-mono text-xs">
                      <span className="font-semibold text-slate-800">campaign</span>={row.utm_campaign}
                    </p>
                    {row.utm_source ? (
                      <p className="font-mono text-xs text-muted">source={row.utm_source}</p>
                    ) : null}
                    {row.utm_medium ? (
                      <p className="font-mono text-xs text-muted">medium={row.utm_medium}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      {row.counters.map((c) => (
                        <span
                          key={c.counter_id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-slate-50 px-2.5 py-1 text-xs"
                          title={`${c.visits} визитов, ${c.goals} целей`}
                        >
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: counterColor(c.counter_id, counterIds) }}
                          />
                          <span className="font-medium">{counterDisplayName(c)}</span>
                          <span className="text-muted">{formatMetric(c.visits)} виз.</span>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  const [utmBindings, setUtmBindings] = useState<MetrikaUTMBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!active_workspace?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, postsRes, metrikaRes, utmRes] = await Promise.all([
        fetchAnalyticsOverview({ from, to }),
        fetchAnalyticsPosts({ from, to, limit: 20 }),
        fetchMetrikaStatus({ from, to }),
        fetchMetrikaUTMBindings({ from, to }),
      ]);
      setOverview(analyticsRes.overview);
      setSeries(analyticsRes.series);
      setProviders(analyticsRes.providers);
      setPosts(postsRes.items);
      setMetrika(metrikaRes);
      setUtmBindings(utmRes.items);
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
          <MetrikaUTMMapSection bindings={utmBindings} counters={metrika?.counters ?? []} />

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
