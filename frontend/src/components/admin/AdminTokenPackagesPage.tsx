"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  ApiError,
  createAdminTokenPackage,
  deleteAdminTokenPackage,
  fetchAdminTokenPackages,
  updateAdminTokenPackage,
  type TokenPackage,
} from "@/lib/api";
import { TokenPackageEditorModal, type TokenPackageFormValues } from "@/components/admin/TokenPackageEditorModal";
import { parseRubToCentsOrZero } from "@/lib/money";

function formatRub(cents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function AdminTokenPackagesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<TokenPackage | undefined>();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminTokenPackages();
      setPackages(data.packages ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить пакеты");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function showToast() {
    setToast(true);
    window.setTimeout(() => setToast(false), 2200);
  }

  async function handleSubmit(values: TokenPackageFormValues) {
    setSaving(true);
    setError(null);
    try {
      const body = {
        id: values.id.trim().toLowerCase(),
        name: values.name.trim(),
        tokens: values.tokens,
        price_cents: parseRubToCentsOrZero(values.price_rub),
        sort_order: values.sort_order,
        is_active: values.is_active,
      };
      if (editorMode === "create") {
        await createAdminTokenPackage(body);
      } else if (editing) {
        await updateAdminTokenPackage(editing.id, body);
      }
      setEditorOpen(false);
      showToast();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(pkg: TokenPackage) {
    if (!window.confirm(`Удалить пакет «${pkg.name}» (${pkg.id})?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteAdminTokenPackage(pkg.id);
      showToast();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось удалить");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">Загрузка…</p>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text">Пакеты токенов</h1>
          <p className="mt-1 text-sm text-muted">
            Фиксированные пакеты для докупки AI-токенов. Оплата через Robokassa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditorMode("create");
            setEditing(undefined);
            setEditorOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Новый пакет
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {toast && (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Сохранено
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-zinc-50 text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Токены</th>
              <th className="px-4 py-3">Цена</th>
              <th className="px-4 py-3">Порядок</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  Пакеты не созданы
                </td>
              </tr>
            )}
            {packages.map((pkg) => (
              <tr key={pkg.id} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-3 font-mono text-xs">{pkg.id}</td>
                <td className="px-4 py-3 font-medium">{pkg.name}</td>
                <td className="px-4 py-3">{pkg.tokens}</td>
                <td className="px-4 py-3">{formatRub(pkg.price_cents)}</td>
                <td className="px-4 py-3">{pkg.sort_order}</td>
                <td className="px-4 py-3">{pkg.is_active ? "Активен" : "Скрыт"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditorMode("edit");
                        setEditing(pkg);
                        setEditorOpen(true);
                      }}
                      className="rounded-md p-1.5 text-muted hover:bg-zinc-100 hover:text-text"
                      aria-label="Редактировать"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleDelete(pkg)}
                      className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TokenPackageEditorModal
        open={editorOpen}
        mode={editorMode}
        initial={editing}
        saving={saving}
        onClose={() => setEditorOpen(false)}
        onSubmit={(values) => void handleSubmit(values)}
      />
    </div>
  );
}
