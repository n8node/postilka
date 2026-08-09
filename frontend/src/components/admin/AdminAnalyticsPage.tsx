"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { ApiError, fetchAdminAnalytics, type AdminAnalyticsOverview } from "@/lib/api";
import { formatBytes } from "@/lib/utils";

const CHART_COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#64748b"];

function formatRub(cents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatShortDate(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-slate-900">{title}</p>
      <div className="h-64">{children}</div>
    </div>
  );
}

export function AdminAnalyticsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminAnalytics({ from, to });
      setOverview(res.overview);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить аналитику");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const filesPie = useMemo(() => {
    if (!overview) return [];
    return overview.files_by_type.map((item) => ({
      name: item.label,
      value: item.bytes,
      count: item.count,
    }));
  }, [overview]);

  if (loading && !overview) {
    return <p className="text-sm text-slate-500">Загрузка аналитики…</p>;
  }

  if (error && !overview) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }

  if (!overview) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Аналитика</h1>
          <p className="mt-1 text-sm text-slate-500">
            Сводка по платформе за выбранный период
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-500">
            С
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="ml-2 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500">
            По
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="ml-2 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Пользователи" value={String(overview.users_total)} hint={`+${overview.users_new_in_period} за период`} />
        <StatCard label="Workspace" value={String(overview.workspaces_total)} />
        <StatCard label="Каналы" value={String(overview.channels_total)} hint={`${overview.channels_active} активных`} />
        <StatCard label="Файлы" value={String(overview.files_total)} hint={formatBytes(overview.storage_bytes)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="AI генерации"
          value={String(overview.ai_generations_succeeded)}
          hint={`${overview.ai_generations_failed} ошибок из ${overview.ai_generations_total}`}
        />
        <StatCard label="AI кредиты" value={String(overview.ai_credits_spent)} />
        <StatCard label="AI с кошелька" value={formatRub(overview.ai_wallet_cents_spent)} />
        <StatCard
          label="Платежи"
          value={formatRub(overview.topups_cents + overview.checkouts_cents)}
          hint={`Пополнения ${formatRub(overview.topups_cents)} · Тарифы ${formatRub(overview.checkouts_cents)}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Регистрации по дням">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overview.daily_registrations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip labelFormatter={(v) => formatShortDate(String(v))} />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} name="Регистрации" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="AI генерации по дням">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview.daily_ai_generations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip labelFormatter={(v) => formatShortDate(String(v))} />
              <Legend />
              <Bar dataKey="succeeded" stackId="a" fill="#059669" name="Успех" />
              <Bar dataKey="failed" stackId="a" fill="#dc2626" name="Ошибки" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="AI: кредиты и ₽ с кошелька">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={overview.daily_ai_generations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} fontSize={11} />
              <YAxis yAxisId="left" allowDecimals={false} fontSize={11} />
              <YAxis yAxisId="right" orientation="right" fontSize={11} />
              <Tooltip labelFormatter={(v) => formatShortDate(String(v))} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="credits" stroke="#7c3aed" strokeWidth={2} dot={false} name="Кредиты" />
              <Line yAxisId="right" type="monotone" dataKey="wallet_cents" stroke="#d97706" strokeWidth={2} dot={false} name="Кошелёк, ₽×100" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Новые файлы по дням">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview.daily_new_files}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip labelFormatter={(v) => formatShortDate(String(v))} />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Файлы" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Пополнения кошелька">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview.daily_topups}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(Number(v) / 100)}₽`} />
              <Tooltip
                labelFormatter={(v) => formatShortDate(String(v))}
                formatter={(value: number) => [formatRub(value), "Сумма"]}
              />
              <Bar dataKey="amount_cents" fill="#059669" radius={[4, 4, 0, 0]} name="Сумма" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Оплаты тарифов">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview.daily_checkouts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(Number(v) / 100)}₽`} />
              <Tooltip
                labelFormatter={(v) => formatShortDate(String(v))}
                formatter={(value: number) => [formatRub(value), "Сумма"]}
              />
              <Bar dataKey="amount_cents" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Сумма" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="AI по режимам">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview.ai_by_mode} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" allowDecimals={false} fontSize={11} />
              <YAxis type="category" dataKey="label" width={100} fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Каналы по провайдеру">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={overview.channels_by_provider} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label>
                {overview.channels_by_provider.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Storage по типу">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={filesPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {filesPie.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatBytes(value)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
