"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { ApiError } from "@/lib/api";
import {
  createAdminSketchStyle,
  deleteAdminSketchStyle,
  fetchAdminSketchStyles,
  updateAdminSketchStyle,
  uploadAdminSketchStylePreview,
  type SketchStyleAdmin,
  type SketchStyleWritePayload,
} from "@/lib/sketch-api";
import { mediaUrl } from "@/lib/media-display";

const RATIOS = ["1:1", "4:5", "9:16", "16:9"];

const emptyForm = (): SketchStyleWritePayload => ({
  title: "",
  description: "",
  positive_prompt: "",
  negative_prompt: "",
  default_strength: 0.65,
  aspect_ratio: "1:1",
  sort_order: 0,
  is_published: false,
});

function toForm(item: SketchStyleAdmin): SketchStyleWritePayload {
  return {
    title: item.title,
    description: item.description,
    positive_prompt: item.positive_prompt,
    negative_prompt: item.negative_prompt,
    default_strength: item.default_strength,
    aspect_ratio: item.aspect_ratio,
    sort_order: item.sort_order,
    is_published: item.is_published,
  };
}

export function AdminSketchStylesPage({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<SketchStyleAdmin[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<SketchStyleWritePayload>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminSketchStyles();
      setItems(res.items ?? []);
      setSelectedId((prev) => {
        if (prev && res.items.some((i) => i.id === prev)) return prev;
        return res.items[0]?.id ?? "";
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить стили");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const item = items.find((x) => x.id === selectedId);
    if (item) setForm(toForm(item));
  }, [selectedId, items]);

  async function handleSave() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      if (selectedId) {
        const { item } = await updateAdminSketchStyle(selectedId, form);
        setItems((prev) => prev.map((x) => (x.id === item.id ? item : x)));
      } else {
        const { item } = await createAdminSketchStyle(form);
        setItems((prev) => [item, ...prev]);
        setSelectedId(item.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selectedId || !confirm("Удалить стиль?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAdminSketchStyle(selectedId);
      setItems((prev) => prev.filter((x) => x.id !== selectedId));
      setSelectedId("");
      setForm(emptyForm());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить");
    } finally {
      setBusy(false);
    }
  }

  async function handlePreviewUpload(file: File) {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await uploadAdminSketchStylePreview(selectedId, file);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить превью");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-6xl space-y-4 p-6"}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">AI — Набросок</h1>
          <p className="mt-1 text-sm text-slate-500">Стили генерации из рисунка</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Сохранено
        </div>
      )}

      <div className="flex min-h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <aside className="w-56 shrink-0 border-r border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Стили</span>
            <button
              type="button"
              onClick={() => {
                setSelectedId("");
                setForm(emptyForm());
              }}
              className="rounded p-1 text-slate-500 hover:bg-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <ul className="max-h-[480px] overflow-y-auto p-2 space-y-0.5">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                      selectedId === item.id
                        ? "bg-white font-medium shadow-sm"
                        : "hover:bg-white/70"
                    }`}
                  >
                    {item.title}
                    {!item.is_published && (
                      <span className="ml-1 text-[10px] text-amber-600">черновик</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Название</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Сортировка</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">Описание</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">Positive prompt</label>
              <textarea
                rows={3}
                value={form.positive_prompt}
                onChange={(e) => setForm((f) => ({ ...f, positive_prompt: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-slate-500">Negative prompt</label>
              <textarea
                rows={2}
                value={form.negative_prompt}
                onChange={(e) => setForm((f) => ({ ...f, negative_prompt: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Сила по умолчанию</label>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={form.default_strength}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      default_strength: Math.min(1, Math.max(0, Number(e.target.value))),
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Формат</label>
                <select
                  value={form.aspect_ratio}
                  onChange={(e) => setForm((f) => ({ ...f, aspect_ratio: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  {RATIOS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
                  />
                  Опубликован
                </label>
              </div>
            </div>

            {selected?.preview_url && (
              <div className="w-32 overflow-hidden rounded-lg border border-slate-200">
                <ProtectedMediaImage
                  url={mediaUrl(selected.preview_url)}
                  alt=""
                  className="aspect-square w-full object-cover"
                />
              </div>
            )}

            {selectedId && (
              <div>
                <label className="mb-1 block text-xs text-slate-500">Превью стиля</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handlePreviewUpload(file);
                    e.target.value = "";
                  }}
                  className="text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              disabled={!selectedId || busy}
              onClick={() => void handleDelete()}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Удалить
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
