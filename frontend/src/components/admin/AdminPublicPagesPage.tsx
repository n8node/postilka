"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createAdminPublicPage,
  deleteAdminPublicPage,
  fetchAdminPublicPages,
  updateAdminPublicPage,
  type PublicPage,
  type PublicPageCategory,
  type PublicPageInput,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<PublicPageCategory, string> = {
  instruction: "Инструкция",
  help_center: "Центр помощи",
  legal: "Юридическая",
  other: "Прочее",
};

const PROVIDER_OPTIONS = [
  { value: "", label: "— не указан —" },
  { value: "telegram", label: "Telegram" },
  { value: "vk", label: "VK" },
  { value: "ok", label: "OK" },
  { value: "max", label: "MAX" },
  { value: "rutube", label: "Rutube" },
  { value: "dzen", label: "Дзен" },
];

function emptyForm(): PublicPageInput {
  return {
    title: "",
    slug: "",
    meta_description: "",
    external_url: "",
    category: "other",
    provider: null,
    is_published: false,
    sort_order: 100,
  };
}

function pageToForm(page: PublicPage): PublicPageInput {
  return {
    title: page.title,
    slug: page.slug,
    meta_description: page.meta_description,
    external_url: page.external_url,
    category: page.category,
    provider: page.provider,
    is_published: page.is_published,
    sort_order: page.sort_order,
  };
}

export function AdminPublicPagesPage() {
  const [pages, setPages] = useState<PublicPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PublicPageInput>(emptyForm());

  const selected = pages.find((p) => p.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminPublicPages();
      setPages(data.pages);
      if (data.pages.length === 0) {
        setSelectedId(null);
        setCreating(true);
        setForm(emptyForm());
        return;
      }
      setSelectedId((prev) => {
        if (prev && data.pages.some((p) => p.id === prev)) return prev;
        return data.pages[0]?.id ?? null;
      });
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Не удалось загрузить страницы",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (creating) return;
    if (selected) {
      setForm(pageToForm(selected));
    }
  }, [selected, creating]);

  function patch(partial: Partial<PublicPageInput>) {
    setForm((prev) => ({ ...prev, ...partial }));
    setSuccess(null);
  }

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    setForm(emptyForm());
    setSuccess(null);
    setError(null);
  }

  function selectPage(page: PublicPage) {
    setCreating(false);
    setSelectedId(page.id);
    setForm(pageToForm(page));
    setSuccess(null);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (creating) {
        const created = await createAdminPublicPage(form);
        await load();
        setCreating(false);
        setSelectedId(created.id);
        setSuccess("Страница создана");
      } else if (selected) {
        const updated = await updateAdminPublicPage(selected.id, form);
        setPages((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p)),
        );
        setSuccess("Изменения сохранены");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (creating || !selected) return;
    if (!window.confirm(`Удалить страницу «${selected.title}»?`)) return;
    try {
      await deleteAdminPublicPage(selected.id);
      setSuccess(null);
      setCreating(false);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось удалить");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Публичные страницы
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Юридические и информационные страницы в открытом доступе — инструкции,
          центр помощи и др. Контент публикуется в WordPress, здесь задаются
          ссылки и метаданные.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="flex min-h-[560px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 p-3">
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              Новая страница
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <p className="px-2 py-3 text-sm text-slate-500">Загрузка…</p>
            ) : pages.length === 0 ? (
              <p className="px-2 py-3 text-sm text-slate-500">
                Пока нет страниц
              </p>
            ) : (
              <ul className="space-y-0.5">
                {pages.map((page) => {
                  const active = !creating && page.id === selectedId;
                  return (
                    <li key={page.id}>
                      <button
                        type="button"
                        onClick={() => selectPage(page)}
                        className={cn(
                          "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-white font-medium text-slate-900 shadow-sm"
                            : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
                        )}
                      >
                        <span className="block truncate">{page.title}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">
                          {CATEGORY_LABELS[page.category]}
                          {page.provider ? ` · ${page.provider}` : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1 p-6">
          {loading ? (
            <p className="text-sm text-slate-500">Загрузка…</p>
          ) : !creating && !selected ? (
            <p className="text-sm text-slate-500">
              Выберите страницу слева или создайте новую
            </p>
          ) : (
            <div className="mx-auto max-w-2xl space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    Заголовок
                  </span>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    URL (slug)
                  </span>
                  <input
                    type="text"
                    value={form.slug ?? ""}
                    onChange={(e) => patch({ slug: e.target.value })}
                    placeholder="help/connect/telegram"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {form.slug?.trim() && (
                    <span className="block text-xs text-blue-600">
                      Ключ страницы: {form.slug.trim()}
                    </span>
                  )}
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  URL статьи (WordPress)
                </span>
                <input
                  type="url"
                  value={form.external_url ?? ""}
                  onChange={(e) => patch({ external_url: e.target.value })}
                  placeholder="https://postilka.ru/docs/telegram"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {form.external_url?.trim() && (
                  <a
                    href={form.external_url.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-600 hover:underline"
                  >
                    Публичный адрес: {form.external_url.trim()}
                  </a>
                )}
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Meta description
                </span>
                <textarea
                  rows={3}
                  value={form.meta_description ?? ""}
                  onChange={(e) =>
                    patch({ meta_description: e.target.value })
                  }
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    Категория
                  </span>
                  <select
                    value={form.category ?? "other"}
                    onChange={(e) =>
                      patch({
                        category: e.target.value as PublicPageCategory,
                      })
                    }
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {(
                      Object.entries(CATEGORY_LABELS) as [
                        PublicPageCategory,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    Провайдер (для инструкций)
                  </span>
                  <select
                    value={form.provider ?? ""}
                    onChange={(e) =>
                      patch({
                        provider: e.target.value || null,
                      })
                    }
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {PROVIDER_OPTIONS.map((opt) => (
                      <option key={opt.value || "none"} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Контент статей хранится в WordPress. В админке задаются заголовок,
                slug, ссылка и метаданные. После публикации статьи в WordPress
                укажите её URL и включите «Опубликована».
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_published ?? false}
                    onChange={(e) => patch({ is_published: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Опубликована
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  Порядок
                  <input
                    type="number"
                    value={form.sort_order ?? 0}
                    onChange={(e) =>
                      patch({ sort_order: Number(e.target.value) || 0 })
                    }
                    className="w-20 rounded-md border border-slate-200 px-2 py-1 text-sm shadow-sm"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || !form.title?.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Сохранение…" : "Сохранить"}
                </button>

                {!creating && selected && (
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Удалить
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
