"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  deleteAdminGeneration,
  fetchAdminActiveGenerations,
  type AdminActiveGeneration,
} from "@/lib/api";

function age(value: string) {
  const ms = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes} мин.`;
  return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин.`;
}

function statusLabel(item: AdminActiveGeneration) {
  if (item.stale) return `Зависла: ${item.stale_reason ?? "проверка"}`;
  return item.status;
}

export function AdminGenerationsPage() {
  const [items, setItems] = useState<AdminActiveGeneration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchAdminActiveGenerations();
      setItems(result.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить генерации");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [load]);

  async function remove(item: AdminActiveGeneration) {
    if (!window.confirm(`Удалить зависшую генерацию ${item.id}? Готовые файлы пользователя не будут удалены.`)) return;
    try {
      await deleteAdminGeneration(item.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сбросить генерацию");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Текущие генерации</h1>
          <p className="mt-1 text-sm text-slate-500">Обновление каждые 15 секунд · проверка lease и polling</p>
        </div>
        <button onClick={() => void load()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">
          Обновить
        </button>
      </div>
      {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {loading && items.length === 0 ? <p className="text-sm text-slate-500">Загрузка…</p> : null}
      {!loading && items.length === 0 ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">Активных генераций нет.</div> : null}
      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Генерация</th><th className="px-4 py-3">Пользователь</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3">Прогресс</th><th className="px-4 py-3">Возраст</th><th className="px-4 py-3">Polling / lease</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className={item.stale ? "bg-amber-50/60" : undefined}>
                  <td className="px-4 py-3"><div className="font-medium text-slate-900">{item.mode || "—"}</div><div className="max-w-xs truncate text-xs text-slate-500" title={item.prompt}>{item.model || item.id}</div></td>
                  <td className="px-4 py-3"><div>{item.user_email || item.user_id}</div><div className="text-xs text-slate-500">{item.workspace_name || item.workspace_id}</div></td>
                  <td className="px-4 py-3"><span className={item.stale ? "font-semibold text-amber-700" : "text-slate-700"}>{statusLabel(item)}</span><div className="text-xs text-slate-500">{item.kie_state || "—"} · попыток {item.attempts}</div></td>
                  <td className="px-4 py-3">{item.progress}%</td>
                  <td className="px-4 py-3 whitespace-nowrap">{age(item.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500"><div>poll: {item.last_polled_at ? age(item.last_polled_at) + " назад" : "не было"}</div><div>{item.lease_until ? `lease до ${new Date(item.lease_until).toLocaleTimeString("ru-RU")}` : "lease свободен"}</div></td>
                  <td className="px-4 py-3 text-right">{item.stale ? <button onClick={() => void remove(item)} className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700">Удалить</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}