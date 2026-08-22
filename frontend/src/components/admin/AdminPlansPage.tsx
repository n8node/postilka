"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createAdminPlan,
  deleteAdminPlan,
  fetchAdminPlans,
  updateAdminPlan,
  type Plan,
  type PlanInput,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { centsToRubValue, parseRubToCents } from "@/lib/money";

function formatRub(cents: number | null) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatQuota(v: number | null) {
  if (v == null) return "∞";
  return String(v);
}

function emptyForm(): PlanInput {
  return {
    name: "",
    slug: "",
    description: "",
    is_free: false,
    is_active: true,
    is_popular: false,
    price_monthly_cents: 0,
    price_yearly_cents: 0,
    max_channels: 3,
    max_posts_per_period: 100,
    max_seats: 3,
    max_workflows: 1,
    max_workflow_invites: 3,
    push_on_ready: false,
    storage_bytes: 5 * 1024 * 1024 * 1024,
    max_file_size_bytes: 100 * 1024 * 1024,
    trash_retention_days: 7,
    ai_text_tokens_quota: 100000,
    ai_media_credits_quota: 20,
    free_plan_duration_days: null,
    sort_order: 10,
  };
}

function planToForm(p: Plan): PlanInput {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description,
    is_free: p.is_free,
    is_active: p.is_active,
    is_popular: p.is_popular,
    price_monthly_cents: p.price_monthly_cents,
    price_yearly_cents: p.price_yearly_cents,
    max_channels: p.max_channels,
    max_posts_per_period: p.max_posts_per_period,
    max_seats: p.max_seats,
    max_workflows: p.max_workflows,
    max_workflow_invites: p.max_workflow_invites,
    push_on_ready: p.push_on_ready,
    storage_bytes: p.storage_bytes,
    max_file_size_bytes: p.max_file_size_bytes,
    trash_retention_days: p.trash_retention_days,
    ai_text_tokens_quota: p.ai_text_tokens_quota,
    ai_media_credits_quota: p.ai_media_credits_quota,
    free_plan_duration_days: p.free_plan_duration_days,
    sort_order: p.sort_order,
  };
}

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === "∞") return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const BYTES_PER_MB = 1024 * 1024;

function bytesToMbValue(bytes: number | null | undefined): string {
  if (bytes == null) return "";
  return String(Math.round(bytes / BYTES_PER_MB));
}

function parseMbToBytes(raw: string): number | null {
  const mb = parseOptionalInt(raw);
  if (mb == null) return null;
  return mb * BYTES_PER_MB;
}

export function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminPlans();
      setPlans(data.plans);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить тарифы");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(plan: Plan) {
    if (!window.confirm(`Удалить тариф «${plan.name}»?`)) return;
    try {
      await deleteAdminPlan(plan.id);
      await load();
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "Ошибка удаления");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Тарифы
          </h1>
          <p className="mt-1 text-sm text-slate-500">Всего: {plans.length}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Обновить
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Создать тариф
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Цена / мес</th>
                <th className="px-4 py-3">Каналы</th>
                <th className="px-4 py-3">Посты</th>
                <th className="px-4 py-3">Участники</th>
                <th className="px-4 py-3">Воркфлоу</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Загрузка…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-rose-600">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && plans.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Тарифов нет
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                plans.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{p.name}</div>
                      {p.is_free && (
                        <span className="text-xs text-emerald-600">Free</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {p.slug}
                    </td>
                    <td className="px-4 py-3">{formatRub(p.price_monthly_cents)}</td>
                    <td className="px-4 py-3">{formatQuota(p.max_channels)}</td>
                    <td className="px-4 py-3">{formatQuota(p.max_posts_per_period)}</td>
                    <td className="px-4 py-3">{formatQuota(p.max_seats)}</td>
                    <td className="px-4 py-3">{formatQuota(p.max_workflows)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                          p.is_active
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
                            : "bg-slate-100 text-slate-600 ring-slate-500/10",
                        )}
                      >
                        {p.is_active ? "Активен" : "Выключен"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCreating(false);
                            setEditing(p);
                          }}
                          className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(p)}
                          className="rounded-md border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {(creating || editing) && (
        <PlanFormModal
          title={editing ? `Редактировать: ${editing.name}` : "Новый тариф"}
          initial={editing ? planToForm(editing) : emptyForm()}
          planId={editing?.id}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function PlanFormModal({
  title,
  initial,
  planId,
  onClose,
  onSaved,
}: {
  title: string;
  initial: PlanInput;
  planId?: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<PlanInput>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof PlanInput>(key: K, value: PlanInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (planId) {
        await updateAdminPlan(planId, form);
      } else {
        await createAdminPlan(form);
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Закрыть"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-slate-500 sm:col-span-2">
            Название
            <input
              required
              value={form.name ?? ""}
              onChange={(e) => setField("name", e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Slug
            <input
              value={form.slug ?? ""}
              onChange={(e) => setField("slug", e.target.value)}
              placeholder="auto"
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Порядок
            <input
              type="number"
              value={form.sort_order ?? 0}
              onChange={(e) => setField("sort_order", Number(e.target.value))}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500 sm:col-span-2">
            Описание
            <textarea
              value={form.description ?? ""}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Цена / мес, ₽
            <input
              value={centsToRubValue(form.price_monthly_cents)}
              onChange={(e) =>
                setField("price_monthly_cents", parseRubToCents(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Цена / год, ₽
            <input
              value={centsToRubValue(form.price_yearly_cents)}
              onChange={(e) =>
                setField("price_yearly_cents", parseRubToCents(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Каналы (пусто = ∞)
            <input
              value={form.max_channels ?? ""}
              onChange={(e) =>
                setField("max_channels", parseOptionalInt(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Посты / период
            <input
              value={form.max_posts_per_period ?? ""}
              onChange={(e) =>
                setField("max_posts_per_period", parseOptionalInt(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Участники (пусто = ∞)
            <input
              value={form.max_seats ?? ""}
              onChange={(e) =>
                setField("max_seats", parseOptionalInt(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Воркфлоу (пусто = ∞)
            <input
              value={form.max_workflows ?? ""}
              onChange={(e) =>
                setField("max_workflows", parseOptionalInt(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Приглашения в воркфлоу (пусто = ∞)
            <input
              value={form.max_workflow_invites ?? ""}
              onChange={(e) =>
                setField("max_workflow_invites", parseOptionalInt(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Хранилище (МБ, пусто = ∞)
            <input
              value={bytesToMbValue(form.storage_bytes)}
              onChange={(e) =>
                setField("storage_bytes", parseMbToBytes(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Макс. размер файла (МБ, пусто = только глобальные лимиты)
            <input
              value={bytesToMbValue(form.max_file_size_bytes)}
              onChange={(e) =>
                setField("max_file_size_bytes", parseMbToBytes(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Корзина (дней, 0 = без корзины)
            <input
              type="number"
              min={0}
              value={form.trash_retention_days ?? 0}
              onChange={(e) =>
                setField("trash_retention_days", Math.max(0, Number(e.target.value) || 0))
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Текстовые кредиты
            <input
              value={form.ai_text_tokens_quota ?? ""}
              onChange={(e) =>
                setField("ai_text_tokens_quota", parseOptionalInt(e.target.value))
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-500">
            Медиа-кредиты
            <input
              value={form.ai_media_credits_quota ?? ""}
              onChange={(e) =>
                setField(
                  "ai_media_credits_quota",
                  parseOptionalInt(e.target.value),
                )
              }
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={!!form.is_free}
              onChange={(e) => setField("is_free", e.target.checked)}
            />
            Free
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active !== false}
              onChange={(e) => setField("is_active", e.target.checked)}
            />
            Активен
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={!!form.is_popular}
              onChange={(e) => setField("is_popular", e.target.checked)}
            />
            Popular
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
  );
}
