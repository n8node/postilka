"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { ProtectedMediaVideo } from "@/components/media/ProtectedMediaVideo";
import { ApiError } from "@/lib/api";
import {
  AD_STUDIO_GENERATION_MODES,
  AD_STUDIO_IMAGE_RATIOS,
  adminAdStudioPreviewSourceUrl,
  adminAdStudioPreviewUrl,
  backfillAdminAdStudioPreviews,
  adStudioCategoryLabel,
  adStudioMediaKindForMode,
  adStudioModeLabel,
  adStudioModeNeedsProduct,
  catalogHref,
  categoriesForCatalog,
  createAdminAdStudioTemplate,
  defaultAdStudioMode,
  defaultAdStudioRatio,
  deleteAdminAdStudioTemplate,
  fetchAdminAdStudioCategories,
  fetchAdminAdStudioTemplates,
  updateAdminAdStudioCategories,
  updateAdminAdStudioTemplate,
  uploadAdminAdStudioPreview,
  validateAdStudioPreviewFile,
  validateAdStudioPreviewVideoDuration,
  type AdStudioCatalog,
  type AdStudioGenerationMode,
  type AdStudioTemplateAdmin,
  type AdStudioWritePayload,
  type CatalogCategoryId,
} from "@/lib/ad-studio";

const VIDEO_RATIOS = ["9:16", "16:9", "1:1"];

const emptyForm = (
  catalog: AdStudioCatalog = "studio",
  category?: CatalogCategoryId,
): AdStudioWritePayload => {
  const fallback = (categoriesForCatalog(catalog)[0]?.id ?? "ads") as CatalogCategoryId;
  const nextCategory = category ?? fallback;
  const mode = defaultAdStudioMode(nextCategory);
  const kind = adStudioMediaKindForMode(mode);
  return {
    title: "",
    description: "",
    catalog,
    category: nextCategory,
    media_kind: kind,
    generation_mode: mode,
    aspect_ratio: defaultAdStudioRatio(nextCategory, kind),
    duration: 5,
    system_prompt: "",
    requires_product: adStudioModeNeedsProduct(mode),
    requires_avatar: nextCategory === "ugc",
    sort_order: 0,
    is_published: false,
  };
};

function toForm(item: AdStudioTemplateAdmin, catalog: AdStudioCatalog): AdStudioWritePayload {
  return {
    title: item.title,
    description: item.description,
    catalog: item.catalog ?? catalog,
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

export function AdminAdStudioPage({
  embedded = false,
  catalog = "studio",
}: {
  embedded?: boolean;
  catalog?: AdStudioCatalog;
}) {
  const categories = categoriesForCatalog(catalog);
  const isTrends = catalog === "trends";
  const [items, setItems] = useState<AdStudioTemplateAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState<AdStudioWritePayload>(emptyForm(catalog));
  const [filter, setFilter] = useState<"" | CatalogCategoryId>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);
  const [shuffleTemplates, setShuffleTemplates] = useState(false);
  const [savingSections, setSavingSections] = useState(false);
  const [backfillingPreviews, setBackfillingPreviews] = useState(false);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [res, cats] = await Promise.all([
        fetchAdminAdStudioTemplates(filter || undefined, catalog),
        fetchAdminAdStudioCategories(catalog),
      ]);
      setItems(res.items ?? []);
      setHiddenCategories(cats.hidden_categories ?? []);
      setShuffleTemplates(Boolean(cats.shuffle_templates));
      setSelectedId((prev) => {
        if (prev && res.items.some((item) => item.id === prev)) return prev;
        return res.items[0]?.id ?? "";
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить шаблоны");
    } finally {
      setLoading(false);
    }
  }, [catalog, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const item = items.find((x) => x.id === selectedId);
    if (item) setForm(toForm(item, catalog));
  }, [selectedId, items, catalog]);

  function patch<K extends keyof AdStudioWritePayload>(key: K, value: AdStudioWritePayload[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "category") {
        const category = value as CatalogCategoryId;
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
        const { item } = await updateAdminAdStudioTemplate(selectedId, { ...form, catalog });
        setItems((prev) => prev.map((x) => (x.id === item.id ? item : x)));
        setForm(toForm(item, catalog));
      } else {
        const { item } = await createAdminAdStudioTemplate({ ...form, catalog });
        setItems((prev) => [item, ...prev]);
        setSelectedId(item.id);
        setForm(toForm(item, catalog));
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
    setForm(emptyForm(catalog, filter || undefined));
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
      setForm(next[0] ? toForm(next[0], catalog) : emptyForm(catalog));
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
    const basicError = validateAdStudioPreviewFile(file, form.media_kind);
    if (basicError) {
      setError(basicError);
      return;
    }
    if (file.type.startsWith("video/")) {
      const durationError = await validateAdStudioPreviewVideoDuration(file);
      if (durationError) {
        setError(durationError);
        return;
      }
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

  async function toggleSection(id: CatalogCategoryId, visible: boolean) {
    const next = visible
      ? hiddenCategories.filter((item) => item !== id)
      : [...new Set([...hiddenCategories, id])];
    setSavingSections(true);
    setError(null);
    try {
      const res = await updateAdminAdStudioCategories(next, shuffleTemplates, catalog);
      setHiddenCategories(res.hidden_categories ?? next);
      setShuffleTemplates(Boolean(res.shuffle_templates));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось скрыть раздел");
    } finally {
      setSavingSections(false);
    }
  }

  async function backfillPreviews() {
    setBackfillingPreviews(true);
    setError(null);
    try {
      const res = await backfillAdminAdStudioPreviews();
      setSaved(true);
      if (res.failed > 0) {
        setError(`Постеры: готово ${res.ready}, ошибок ${res.failed}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать постеры");
    } finally {
      setBackfillingPreviews(false);
    }
  }

  async function toggleShuffle(enabled: boolean) {
    setSavingSections(true);
    setError(null);
    try {
      const res = await updateAdminAdStudioCategories(hiddenCategories, enabled, catalog);
      setHiddenCategories(res.hidden_categories ?? hiddenCategories);
      setShuffleTemplates(Boolean(res.shuffle_templates));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить настройку");
    } finally {
      setSavingSections(false);
    }
  }

  const baseRatios = form.media_kind === "video" ? VIDEO_RATIOS : AD_STUDIO_IMAGE_RATIOS;
  const ratios =
    form.aspect_ratio && !baseRatios.includes(form.aspect_ratio)
      ? [form.aspect_ratio, ...baseRatios]
      : baseRatios;

  return (
    <div className={embedded ? "space-y-4" : "mx-auto max-w-5xl space-y-4 p-6"}>
      {!embedded ? (
        <h1 className="text-lg font-semibold">{isTrends ? "Тренды" : "Студия рекламы"}</h1>
      ) : null}
      <p className="text-sm text-slate-600">
        {isTrends
          ? "Каталог трендовых фото и видео для кабинета. Пользователь выбирает шаблон и генерирует свой кадр. Разделы: вирусное, мемы, челленджи, сезонное, новости, форматы, популярное, с вами, реализм, мода, продукты, кино, фантастика, аниме, мультфильмы."
          : "Готовые медиа-решения для кабинета. Пользователь выбирает шаблон, подставляет товар и генерирует свой кадр. Режимы: съёмка товара, движение, UGC, реклама, постеры, маркетплейс."}
      </p>

      {error ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : null}
      {saved ? (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Сохранено</div>
      ) : null}

      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
        <p className="text-sm font-medium text-slate-800">Разделы в кабинете</p>
        <p className="mt-1 text-xs text-slate-500">
          Снимите галочку, чтобы скрыть раздел у пользователей. Шаблоны останутся в админке.
          Ссылка вкладки «Все»:{" "}
          <code className="font-mono">{isTrends ? "/ai?tab=trends" : "/ai"}</code>. Новые разделы
          получают ссылку{" "}
          <code className="font-mono">
            {isTrends ? "/ai?tab=trends&amp;section=id" : "/ai?tab=studio&amp;section=id"}
          </code>
          .
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {categories.map((item) => {
            const visible = !hiddenCategories.includes(item.id);
            return (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={visible}
                  disabled={savingSections}
                  onChange={(e) => void toggleSection(item.id as CatalogCategoryId, e.target.checked)}
                />
                <span>{item.label}</span>
                <code className="text-[10px] text-slate-400">
                  {catalogHref(catalog, item.id)}
                </code>
                {!visible ? <span className="text-xs text-slate-400">скрыт</span> : null}
              </label>
            );
          })}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={shuffleTemplates}
            disabled={savingSections}
            onChange={(e) => void toggleShuffle(e.target.checked)}
          />
          Случайный порядок карточек в кабинете
        </label>
        <p className="mt-1 text-xs text-slate-500">
          При включении шаблоны перемешиваются при каждой загрузке библиотеки у пользователей.
        </p>
        <button
          type="button"
          disabled={backfillingPreviews || savingSections}
          onClick={() => void backfillPreviews()}
          className="mt-3 rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-white disabled:opacity-50"
        >
          {backfillingPreviews ? "Создаём постеры…" : "Создать WebP-постеры для старых шаблонов"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "" | CatalogCategoryId)}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">Все режимы</option>
          {categories.map((c) => (
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
                  onChange={(e) => patch("category", e.target.value as CatalogCategoryId)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  {categories.map((c) => (
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
                selected.preview_kind === "video" && adminAdStudioPreviewSourceUrl(selected) ? (
                  <ProtectedMediaVideo
                    url={adminAdStudioPreviewSourceUrl(selected)}
                    poster={adminAdStudioPreviewUrl(selected)}
                    className="mb-2 h-40 w-40 rounded-md object-cover"
                    controls
                    muted
                    loop
                  />
                ) : (
                  <ProtectedMediaImage
                    url={adminAdStudioPreviewUrl(selected)}
                    alt=""
                    className="mb-2 h-40 w-40 rounded-md object-cover"
                  />
                )
              ) : (
                <p className="mb-2 text-xs text-slate-500">
                  {selectedId ? "Превью ещё не загружено" : "Сохраните шаблон, затем загрузите превью"}
                </p>
              )}
              <p className="mb-2 text-xs text-slate-500">
                {form.media_kind === "video"
                  ? "Фото или видео (MP4/MOV/WebM) · конвертируем в MP4 · 2–15 сек · до 50 МБ"
                  : "JPEG, PNG или WebP · до 15 МБ"}
              </p>
              <input
                type="file"
                accept={form.media_kind === "video" ? "image/*,video/*" : "image/*"}
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
