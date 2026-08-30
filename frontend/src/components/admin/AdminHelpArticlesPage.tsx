"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  ApiError,
  createAdminHelpArticle,
  deleteAdminHelpArticle,
  fetchAdminHelpArticles,
  updateAdminHelpArticle,
  type HelpArticle,
  type HelpArticleInput,
} from "@/lib/api";
import { HELP_ROUTE_OPTIONS, helpRouteLabel } from "@/lib/help";
import { HelpArticleBody } from "@/components/help/HelpArticleBody";
import { HelpRichEditor } from "@/components/help/HelpRichEditor";
import { cn } from "@/lib/utils";

function toInput(article: HelpArticle): HelpArticleInput {
  return {
    title: article.title,
    route_key: article.route_key,
    body_html: article.body_html,
    excerpt: article.excerpt,
    is_published: article.is_published,
    sort_order: article.sort_order,
  };
}

function emptyForm(): HelpArticleInput {
  return {
    title: "",
    route_key: "dashboard",
    body_html: "",
    excerpt: "",
    is_published: false,
    sort_order: 100,
  };
}

export function AdminHelpArticlesPage() {
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<HelpArticleInput>(emptyForm());
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => articles.find((item) => item.id === selectedId) || null,
    [articles, selectedId],
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminHelpArticles();
      setArticles(res.articles || []);
      if (!selectedId && res.articles?.[0]) {
        setSelectedId(res.articles[0].id);
        setForm(toInput(res.articles[0]));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить статьи");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (article: HelpArticle) => {
    setSelectedId(article.id);
    setForm(toInput(article));
    setPreview(false);
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = selected
        ? await updateAdminHelpArticle(selected.id, form)
        : await createAdminHelpArticle(form);
      setArticles((prev) => {
        const next = prev.filter((item) => item.id !== saved.id);
        return [...next, saved].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title, "ru"));
      });
      setSelectedId(saved.id);
      setForm(toInput(saved));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!window.confirm("Удалить статью справки?")) return;
    setSaving(true);
    try {
      await deleteAdminHelpArticle(selected.id);
      const next = articles.filter((item) => item.id !== selected.id);
      setArticles(next);
      if (next[0]) select(next[0]);
      else {
        setSelectedId(null);
        setForm(emptyForm());
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Справка кабинета
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Статьи по разделам. Пользователь видит только опубликованные.
        </p>
      </div>

      <div className="flex min-h-[680px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Статьи
            </p>
            <button
              type="button"
              onClick={() => {
                const used = new Set(articles.map((item) => item.route_key));
                const nextRoute =
                  HELP_ROUTE_OPTIONS.find((item) => !used.has(item.key))?.key ||
                  "dashboard";
                setSelectedId(null);
                setForm({ ...emptyForm(), route_key: nextRoute });
                setPreview(false);
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Новая
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <p className="px-2 py-6 text-sm text-slate-500">Загрузка…</p>
            ) : (
              articles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(item)}
                  className={cn(
                    "mb-1 w-full rounded-lg px-2.5 py-2 text-left text-sm",
                    selectedId === item.id
                      ? "bg-white font-medium text-slate-900 shadow-sm"
                      : "text-slate-600 hover:bg-white/70",
                  )}
                >
                  <span className="block truncate">{item.title}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    {helpRouteLabel(item.route_key)}
                    {item.is_published ? " · опубликована" : " · черновик"}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="min-w-0 flex-1 p-5">
          {error ? (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Заголовок
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Раздел кабинета
              <select
                value={form.route_key}
                onChange={(e) => setForm((prev) => ({ ...prev, route_key: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                {HELP_ROUTE_OPTIONS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Краткое описание
              <input
                value={form.excerpt || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Для поиска в панели справки"
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Порядок
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sort_order: Number(e.target.value) || 0 }))
                }
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((prev) => ({ ...prev, is_published: e.target.checked }))}
              className="rounded border-slate-300"
            />
            Опубликовать для пользователей
          </label>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-medium text-slate-600">Текст статьи</p>
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              {preview ? "Редактор" : "Как увидит пользователь"}
            </button>
          </div>
          <div className="mt-2">
            {preview ? (
              <div className="min-h-[280px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <HelpArticleBody html={form.body_html} />
              </div>
            ) : (
              <HelpRichEditor
                value={form.body_html}
                onChange={(body_html) => setForm((prev) => ({ ...prev, body_html }))}
              />
            )}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            {selected ? (
              <button
                type="button"
                onClick={() => void remove()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Сохранение…" : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
