"use client";

import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GenerationNavIcon } from "@/components/generation/GenerationNavIcon";
import {
  ApiError,
  createAdminGenerationNavItem,
  deleteAdminGenerationNavIcon,
  deleteAdminGenerationNavItem,
  fetchAdminGenerationNav,
  reorderAdminGenerationNav,
  updateAdminGenerationNavItem,
  updateAdminGenerationNavSettings,
  uploadAdminGenerationNavIcon,
  type GenerationNavIconKind,
  type GenerationNavItem,
  type GenerationNavSettings,
} from "@/lib/api";
import { generationNavSuggestedHrefs } from "@/lib/ad-studio";
import { GENERATION_NAV_LUCIDE_ICONS } from "@/lib/generation-nav-icons";
import { mediaUrl } from "@/lib/media-display";
import { cn } from "@/lib/utils";

type GenerationNavForm = {
  title: string;
  subtitle: string;
  href: string;
  visible: boolean;
  featured: boolean;
  icon_kind: GenerationNavIconKind;
  icon_name: string;
};

const emptyItem: GenerationNavForm = {
  title: "",
  subtitle: "",
  href: "/ai",
  visible: true,
  featured: false,
  icon_kind: "lucide",
  icon_name: "Sparkles",
};

export function AdminGenerationNavPage({ embedded = false }: { embedded?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<GenerationNavSettings>({
    title: "Генерация",
    studio_href: "/ai",
    more_href: "/ai",
    preview_limit: 8,
  });
  const [items, setItems] = useState<GenerationNavItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(emptyItem);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminGenerationNav();
      setSettings(data.settings);
      setItems(data.items ?? []);
      setSelectedId((prev) => {
        if (prev && data.items.some((item) => item.id === prev)) return prev;
        return data.items[0]?.id ?? "";
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить меню генерации");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setForm(emptyItem);
      return;
    }
    setForm({
      title: selected.title,
      subtitle: selected.subtitle,
      href: selected.href,
      visible: selected.visible,
      featured: selected.featured,
      icon_kind: selected.icon_kind === "upload" ? "upload" : "lucide",
      icon_name: selected.icon_name || "Sparkles",
    });
  }, [selected]);

  async function saveSettings() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await updateAdminGenerationNavSettings(settings);
      setSettings(next);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить настройки");
    } finally {
      setBusy(false);
    }
  }

  async function saveItem() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      if (selected) {
        const next = await updateAdminGenerationNavItem(selected.id, form);
        setItems((prev) => prev.map((item) => (item.id === next.id ? next : item)));
      } else {
        const next = await createAdminGenerationNavItem(form);
        setItems((prev) => [...prev, next]);
        setSelectedId(next.id);
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить плашку");
    } finally {
      setBusy(false);
    }
  }

  async function createNew() {
    setBusy(true);
    setError(null);
    try {
      const next = await createAdminGenerationNavItem({
        ...emptyItem,
        title: "Новая плашка",
      });
      setItems((prev) => [...prev, next]);
      setSelectedId(next.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать плашку");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem() {
    if (!selected) return;
    if (!window.confirm(`Удалить «${selected.title}»?`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAdminGenerationNavItem(selected.id);
      setItems((prev) => prev.filter((item) => item.id !== selected.id));
      setSelectedId("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить плашку");
    } finally {
      setBusy(false);
    }
  }

  async function move(id: string, dir: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    const nextIndex = index + dir;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row);
    setItems(next);
    setBusy(true);
    setError(null);
    try {
      await reorderAdminGenerationNav(next.map((item) => item.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось изменить порядок");
      void load();
    } finally {
      setBusy(false);
    }
  }

  async function handleIconFile(file: File | null) {
    if (!selected || !file) return;
    if (file.type !== "image/png") {
      setError("Нужен файл PNG");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await uploadAdminGenerationNavIcon(selected.id, file);
      setItems((prev) => prev.map((item) => (item.id === next.id ? next : item)));
      setForm((prev) => ({ ...prev, icon_kind: "upload" }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить иконку");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function clearUpload() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const next = await deleteAdminGenerationNavIcon(selected.id);
      setItems((prev) => prev.map((item) => (item.id === next.id ? next : item)));
      setForm((prev) => ({ ...prev, icon_kind: "lucide", icon_name: next.icon_name || "Sparkles" }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить иконку");
    } finally {
      setBusy(false);
    }
  }

  const suggested = generationNavSuggestedHrefs();

  return (
    <div className={cn("space-y-6", !embedded && "max-w-5xl")}>
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Меню генерации</h1>
          <p className="mt-1 text-sm text-slate-500">
            Плашки в левом меню кабинета. Ссылки ведут на вкладки Студии, фото, видео и наброска.
          </p>
        </div>
      )}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Сохранено
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Блок в сайдбаре</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Заголовок</span>
            <input
              value={settings.title}
              onChange={(e) => setSettings((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Сколько плашек показывать</span>
            <input
              type="number"
              min={1}
              max={24}
              value={settings.preview_limit}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, preview_limit: Number(e.target.value) || 8 }))
              }
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Ссылка «Студия»</span>
            <input
              value={settings.studio_href}
              onChange={(e) => setSettings((prev) => ({ ...prev, studio_href: e.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Ссылка «Все инструменты»</span>
            <input
              value={settings.more_href}
              onChange={(e) => setSettings((prev) => ({ ...prev, more_href: e.target.value }))}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={busy || loading}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Сохранить блок
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Плашки</h2>
            <button
              type="button"
              onClick={() => void createNew()}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              <Plus className="h-3.5 w-3.5" />
              Добавить
            </button>
          </div>
          {loading ? (
            <p className="px-2 py-6 text-sm text-slate-500">Загрузка…</p>
          ) : (
            <ul className="space-y-1">
              {items.map((item, index) => (
                <li key={item.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                      selectedId === item.id ? "bg-slate-100 font-medium" : "hover:bg-slate-50",
                    )}
                  >
                    <GenerationNavIcon item={item} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.title}</span>
                      <span className="block truncate text-[11px] text-slate-400">{item.href}</span>
                    </span>
                    {!item.visible ? (
                      <span className="text-[10px] text-slate-400">скрыта</span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(item.id, -1)}
                    disabled={index === 0 || busy}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                    aria-label="Выше"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(item.id, 1)}
                    disabled={index === items.length - 1 || busy}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                    aria-label="Ниже"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            {selected ? "Редактирование плашки" : "Новая плашка"}
          </h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Заголовок</span>
              <input
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Краткое описание</span>
              <input
                value={form.subtitle}
                onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Ссылка на раздел</span>
              <input
                value={form.href}
                onChange={(e) => setForm((prev) => ({ ...prev, href: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <div>
              <p className="mb-1.5 text-xs text-slate-500">Готовые ссылки вкладок</p>
              <div className="flex flex-wrap gap-1.5">
                {suggested.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, href: item.href }))}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px]",
                      form.href === item.href
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.visible}
                  onChange={(e) => setForm((prev) => ({ ...prev, visible: e.target.checked }))}
                />
                Показывать в меню
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((prev) => ({ ...prev, featured: e.target.checked }))}
                />
                Выделить цветом
              </label>
            </div>

            <div>
              <p className="mb-2 text-sm text-slate-600">Иконка</p>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, icon_kind: "lucide" }))}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium",
                    form.icon_kind === "lucide"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  Библиотека
                </button>
                <button
                  type="button"
                  onClick={() => selected && fileRef.current?.click()}
                  disabled={!selected}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium",
                    form.icon_kind === "upload"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 disabled:opacity-50",
                  )}
                >
                  Загрузить PNG
                </button>
                {selected?.icon_kind === "upload" ? (
                  <button
                    type="button"
                    onClick={() => void clearUpload()}
                    className="rounded-md px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
                  >
                    Убрать файл
                  </button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={(e) => void handleIconFile(e.target.files?.[0] ?? null)}
              />
              {selected?.icon_kind === "upload" && selected.icon_url ? (
                <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(selected.icon_url)}
                    alt=""
                    className="h-8 w-8 rounded border border-slate-200 object-contain"
                  />
                  Загруженная иконка
                </div>
              ) : null}
              <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto rounded-md border border-slate-100 p-2">
                {GENERATION_NAV_LUCIDE_ICONS.map((item) => {
                  const Icon = item.Icon;
                  const active = form.icon_kind === "lucide" && form.icon_name === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      title={item.name}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          icon_kind: "lucide",
                          icon_name: item.name,
                        }))
                      }
                      className={cn(
                        "flex h-8 items-center justify-center rounded",
                        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
              {!selected ? (
                <p className="mt-2 text-xs text-slate-400">
                  Сначала сохраните плашку, затем можно загрузить PNG.
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveItem()}
              disabled={busy || !form.title.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Сохранить плашку
            </button>
            {selected ? (
              <button
                type="button"
                onClick={() => void removeItem()}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
