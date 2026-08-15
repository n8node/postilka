"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { ApiError } from "@/lib/api";
import {
  AD_STUDIO_CATEGORIES,
  AD_STUDIO_GENERATION_MODES,
  adminAdStudioPreviewUrl,
  adStudioCategoryLabel,
  adStudioMediaKindForMode,
  adStudioModeLabel,
  adStudioModeNeedsProduct,
  createAdminAdStudioTemplate,
  defaultAdStudioMode,
  defaultAdStudioRatio,
  deleteAdminAdStudioTemplate,
  fetchAdminAdStudioTemplates,
  updateAdminAdStudioTemplate,
  uploadAdminAdStudioPreview,
  type AdStudioCategoryId,
  type AdStudioGenerationMode,
  type AdStudioTemplateAdmin,
  type AdStudioWritePayload,
} from "@/lib/ad-studio";

const IMAGE_RATIOS = ["1:1", "4:5", "9:16", "16:9"];
const VIDEO_RATIOS = ["9:16", "16:9", "1:1"];

const emptyForm = (category: AdStudioCategoryId = "ads"): AdStudioWritePayload => {
  const mode = defaultAdStudioMode(category);
  const kind = adStudioMediaKindForMode(mode);
  return {
    title: "",
    description: "",
    category,
    media_kind: kind,
    generation_mode: mode,
    aspect_ratio: defaultAdStudioRatio(category, kind),
    duration: 5,
    system_prompt: "",
    requires_product: adStudioModeNeedsProduct(mode),
    requires_avatar: category === "ugc",
    sort_order: 0,
    is_published: false,
  };
};

function toForm(item: AdStudioTemplateAdmin): AdStudioWritePayload {
  return {
    title: item.title,
    description: item.description,
    category: item.category,
    media_kind: item.media_kind,
    generation_mode: item.generation_mode,
    aspect_ratio: item.aspect_ratio,
    duration: item.duration,
    system_prompt: item.system_prompt,
    requires_product: item.requires_product,
    requires_avatar: item.requires_avatar,
    sort_order: item.sort_order,
    is_published: item.is_published,
  };
}

export function AdminAdStudioPage({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<AdStudioTemplateAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<AdStudioWritePayload>(emptyForm());
  const [filter, setFilter] = useState<"" | AdStudioCategoryId>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAdminAdStudioTemplates(filter || undefined);
      setItems(res.items ?? []);
      setSelectedId((prev) => {
        if (prev && res.items.some((item) => item.id === prev)) return prev;
        return res.items[0]?.id ?? "";
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить шаблоны");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const item = items.find((x) => x.id === selectedId);
    if (item) setForm(toForm(item));
  }, [selectedId, items]);

  function patch<K extends keyof AdStudioWritePayload>(key: K, value: AdStudioWritePayload[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "category") {
        const category = value as AdStudioCategoryId;
        const mode = defaultAdStudioMode(category);
        const kind = adStudioMediaKindForMode(mode);
        next.generation_mode = mode;
        next.media_kind = kind;
        next.aspect_ratio = defaultAdStudioRatio(category, kind);
        next.requires_product = adStudioModeNeedsProduct(mode);
        next.requires_avatar = category === "ugc";
      }
      if (key === "generation_mode") {
        const mode = value as AdStudioGenerationMode;
        const kind = adStudioMediaKindForMode(mode);
        next.media_kind = kind;
        next.aspect_ratio = defaultAdStudioRatio(prev.category, kind);
        next.requires_product = adStudioModeNeedsProduct(mode);
      }
      return next;
    });
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      if (selectedId) {
        const { item } = await updateAdminAdStudioTemplate(selectedId, form);
        setItems((prev) => prev.map((x) => (x.id === item.id ? item : x)));
        setForm(toForm(item));
      } else {
        const { item } = await createAdminAdStudioTemplate(form);
        setItems((prev) => [item, ...prev]);
        setSelectedId(item.id);
        setForm(toForm(item));
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  async function createNew() {
    setSelectedId("");
    setForm(emptyForm(filter || "ads"));
    setSaved(false);
    setError(null);
  }

  async function remove() {
    if (!selectedId) return;
    if (!window.confirm("Удалить шаблон?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAdminAdStudioTemplate(selectedId);
      const next = items.filter((item) => item.id !== selectedId);
      setItems(next);
      setSelectedId(next[0]?.id ?? "");
      setForm(next[0] ? toForm(next[0]) : emptyForm());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPreview(file: File) {
    if (!selectedId) {
      setError("Сначала сохраните шаблон, затем загрузите превью");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { item } = await uploadAdminAdStudioPreview(selectedId, file);
      setItems((prev) => prev.map((x) => (x.id === item.id ? item : x)));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить превью");
    } finally {
      setBusy(false);
    }
  }

  const ratios = form.media_kind === "video" ? VIDEO_RATIOS : IMAGE_RATIOS;

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-5xl space-y-4 p-6"}>
      {!embedded ? <h1 className="text-lg font-semibold">Студия рекламы</h1> : null}
      <p className="text-sm text-slate-600">
        Готовые медиа-решения для кабинета. Пользователь выбирает шаблон, подставляет товар и
        генерирует свой кадр. Режимы: съёмка товара, движение, UGC, реклама, постеры, маркетплейс.
      </p>

      {error ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : null}
      {saved ? (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Сохранено</div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "" | AdStudioCategoryId)}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Все режимы</option>
          {AD_STUDIO_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void createNew()}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Новый шаблон
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-1">
            {items.length === 0 ? (
              <p className="text-sm text-slate-500">Шаблонов пока нет.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                    selectedId === item.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="block truncate font-medium">{item.title}</span>
                  <span className={`block text-xs ${selectedId === item.id ? "text-slate-300" : "text-slate-400"}`}>
                    {adStudioCategoryLabel(item.category)} · {adStudioModeLabel(item.generation_mode)}
                    {item.is_published ? " · опубликован" : " · черновик"}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-sm">
              Название
              <input
                value={form.title}
                onChange={(e) => patch("title", e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              Описание
              <textarea
                value={form.description}
                onChange={(e) => patch("description", e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Категория
                <select
                  value={form.category}
                  onChange={(e) => patch("category", e.target.value as AdStudioCategoryId)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  {AD_STUDIO_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                Режим генерации
                <select
                  value={form.generation_mode}
                  onChange={(e) =>
                    patch("generation_mode", e.target.value as AdStudioGenerationMode)
                  }
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  {AD_STUDIO_GENERATION_MODES.map((mode) => (
                    <option key={mode.id} value={mode.id}>
                      {mode.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-slate-500">
                  {AD_STUDIO_GENERATION_MODES.find((m) => m.id === form.generation_mode)?.desc}
                </span>
              </label>
              <label className="block text-sm">
                Формат
                <select
                  value={form.aspect_ratio}
                  onChange={(e) => patch("aspect_ratio", e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  {ratios.map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Длительность, сек
                <input
                  type="number"
                  min={4}
                  max={15}
                  value={form.duration}
                  onChange={(e) => patch("duration", Number(e.target.value) || 5)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                Порядок
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => patch("sort_order", Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block text-sm">
              Системный промпт
              <textarea
                value={form.system_prompt}
                onChange={(e) => patch("system_prompt", e.target.value)}
                rows={8}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs"
                placeholder="Стиль, свет, композиция, типографика. Пользователь это не видит."
              />
            </label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.requires_product}
                  onChange={(e) => patch("requires_product", e.target.checked)}
                />
                Нужен товар
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.requires_avatar}
                  onChange={(e) => patch("requires_avatar", e.target.checked)}
                />
                Нужна модель
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => patch("is_published", e.target.checked)}
                />
                Опубликован
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm">Превью</p>
              {selected?.has_preview ? (
                <ProtectedMediaImage
                  url={adminAdStudioPreviewUrl(selected)}
                  alt=""
                  className="mb-2 h-40 w-40 rounded-md object-cover"
                />
              ) : (
                <p className="mb-2 text-xs text-slate-500">
                  {selectedId ? "Превью ещё не загружено" : "Сохраните шаблон, затем загрузите превью"}
                </p>
              )}
              <input
                type="file"
                accept="image/*"
                disabled={!selectedId || busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void uploadPreview(file);
                }}
                className="text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {selectedId ? "Сохранить" : "Создать"}
              </button>
              {selectedId ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void remove()}
                  className="inline-flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
