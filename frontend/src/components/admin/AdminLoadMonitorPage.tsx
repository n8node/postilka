"use client";

import { RefreshCw, Save, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchAdminLoadMonitor,
  recordAdminLoadMonitorSnapshot,
  sendAdminLoadMonitorReportTest,
  updateAdminLoadMonitorSettings,
  type LoadMonitorDashboard,
  type LoadMonitorSettings,
  type LoadTrendLevel,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function trendBadge(level: LoadTrendLevel) {
  switch (level) {
    case "growing":
      return { label: "Рост нагрузки", className: "bg-red-100 text-red-800" };
    case "watch":
      return { label: "Наблюдение", className: "bg-amber-100 text-amber-900" };
    default:
      return { label: "Стабильно", className: "bg-emerald-100 text-emerald-800" };
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ru-RU");
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function AdminLoadMonitorPage() {
  const [dash, setDash] = useState<LoadMonitorDashboard | null>(null);
  const [form, setForm] = useState<LoadMonitorSettings>({
    report_enabled: true,
    report_hour: 9,
    server_ram_gb: 6,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminLoadMonitor();
      setDash(res);
      setForm(res.settings ?? {
        report_enabled: true,
        report_hour: 9,
        server_ram_gb: 6,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить мониторинг");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await updateAdminLoadMonitorSettings(form);
      setMessage("Настройки сохранены");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function handleSnapshot() {
    setBusy("snapshot");
    setMessage(null);
    setError(null);
    try {
      const res = await recordAdminLoadMonitorSnapshot();
      setDash(res);
      setForm(res.settings ?? form);
      setMessage("Снимок записан");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось записать снимок");
    } finally {
      setBusy(null);
    }
  }

  async function handleTestReport() {
    setBusy("report");
    setMessage(null);
    setError(null);
    try {
      const res = await sendAdminLoadMonitorReportTest();
      setMessage(res.message || "Отчёт отправлен");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось отправить отчёт");
    } finally {
      setBusy(null);
    }
  }

  if (loading && !dash) {
    return <p className="text-sm text-slate-500">Загрузка мониторинга…</p>;
  }

  const trend = dash?.trend;
  const badge = trend ? trendBadge(trend.level) : trendBadge("stable");
  const current = dash?.current;
  const poolPct =
    current && current.db_pool_max > 0
      ? Math.round((current.db_pool_acquired / current.db_pool_max) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Мониторинг нагрузки</h1>
        <p className="mt-1 text-sm text-slate-500">
          Снимки раз в час, ежедневный отчёт в Telegram. План масштабирования —{" "}
          <code className="rounded bg-slate-100 px-1">scripts/scaling-plan.md</code>
          . После шага {dash?.plan_pause_after_step ?? 3} — пауза до вашей команды.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", badge.className)}>{badge.label}</span>
        {dash?.worker_alive === false ? (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
            Фоновый процесс не отвечает
          </span>
        ) : (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Фоновый процесс жив
          </span>
        )}
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Обновить
        </button>
      </div>

      {current ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Очередь публикаций" value={String(current.publish_backlog)} hint="просроченные посты" />
          <MetricCard label="Постов в ближайший час" value={String(current.posts_due_next_hour)} />
          <MetricCard label="Генераций в работе" value={String(current.gen_jobs_active)} />
          <MetricCard label="Сценариев выполняется" value={String(current.workflow_runs_running)} />
          <MetricCard
            label="Соединения с базой"
            value={`${current.db_pool_acquired}/${current.db_pool_max}`}
            hint={current.db_pool_max > 0 ? `${poolPct}% занято` : undefined}
          />
          <MetricCard
            label="Последний снимок"
            value={formatDateTime(dash?.last_snapshot_at)}
            hint="обновляется раз в час"
          />
        </div>
      ) : null}

      {trend ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Тренд и рекомендации</h2>
          <p className="mt-2 text-sm text-slate-700">{trend.summary}</p>
          {(trend.signals ?? []).length > 0 ? (
            <ul className="mt-3 list-inside list-disc text-sm text-slate-600">
              {(trend.signals ?? []).map((sig) => (
                <li key={sig}>{sig}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800">{trend.ram_advice}</p>
        </div>
      ) : null}

      {dash?.history && dash.history.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">История (по дням)</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-4">День</th>
                  <th className="py-2 pr-4">Очередь (ср.)</th>
                  <th className="py-2 pr-4">Очередь (макс.)</th>
                  <th className="py-2 pr-4">Генерации (ср.)</th>
                  <th className="py-2">База (ср. %)</th>
                </tr>
              </thead>
              <tbody>
                {(dash.history ?? []).map((row) => (
                  <tr key={row.day} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{formatDateTime(row.day).slice(0, 10)}</td>
                    <td className="py-2 pr-4">{(row.avg_publish_backlog ?? 0).toFixed(1)}</td>
                    <td className="py-2 pr-4">{row.max_publish_backlog ?? 0}</td>
                    <td className="py-2 pr-4">{(row.avg_gen_jobs_active ?? 0).toFixed(1)}</td>
                    <td className="py-2">{Math.round((row.avg_db_pool_util ?? 0) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          История пока пуста — снимки накапливаются после первого часа работы worker или после кнопки «Записать снимок».
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Настройки отчёта</h2>
        <p className="mt-1 text-sm text-slate-500">
          Отчёт уходит в ту же Telegram-группу и тему, что и{" "}
          <Link href="/admin/settings?section=telegram-notifications" className="text-blue-600 hover:underline">
            ежедневная сводка
          </Link>
          . Там же должен быть настроен бот.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.report_enabled}
              onChange={(e) => setForm({ ...form, report_enabled: e.target.checked })}
            />
            Ежедневный отчёт в Telegram
          </label>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Час отправки (МСК)</span>
            <input
              type="number"
              min={0}
              max={23}
              value={form.report_hour}
              onChange={(e) => setForm({ ...form, report_hour: Number(e.target.value) })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Оперативная память сервера (ГБ)</span>
            <span className="mt-1 block text-xs text-slate-500">
              Укажите фактический объём RAM на сервере — для рекомендаций «докупить оперативку»
            </span>
            <input
              type="number"
              min={1}
              max={512}
              value={form.server_ram_gb}
              onChange={(e) => setForm({ ...form, server_ram_gb: Number(e.target.value) })}
              className="mt-1 w-full max-w-xs rounded-md border border-slate-200 px-3 py-2"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Сохранить
          </button>
          <button
            type="button"
            disabled={busy === "snapshot"}
            onClick={() => void handleSnapshot()}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Записать снимок
          </button>
          <button
            type="button"
            disabled={busy === "report"}
            onClick={() => void handleTestReport()}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Отправить тест в Telegram
          </button>
        </div>
      </div>
    </div>
  );
}
