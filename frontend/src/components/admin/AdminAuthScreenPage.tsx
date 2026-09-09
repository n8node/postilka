"use client";

import { ImagePlus, Save, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  deleteAdminAuthScreenLogo,
  deleteAdminAuthScreenSlideMedia,
  fetchAdminAuthScreen,
  type AuthScreenAdminView,
  type AuthScreenSlide,
  type AuthScreenSlideUpdate,
  updateAdminAuthScreenSlide,
  uploadAdminAuthScreenLogo,
  uploadAdminAuthScreenSlideMedia,
} from "@/lib/api";
import { mediaUrl } from "@/lib/media-display";

const DEFAULT_DURATION_SECONDS = 6;

type SlideForm = AuthScreenSlideUpdate & {
  slot: number;
  media_kind: AuthScreenSlide["media_kind"];
  media_url?: string;
};

function slideForm(slide: AuthScreenSlide): SlideForm {
  return {
    slot: slide.slot,
    enabled: slide.enabled,
    tag: slide.tag,
    title: slide.title,
    description: slide.description,
    duration_seconds: slide.duration_seconds || DEFAULT_DURATION_SECONDS,
    media_kind: slide.media_kind,
    media_url: slide.media_url,
  };
}

function applyView(data: AuthScreenAdminView): {
  logoURL: string;
  slides: SlideForm[];
} {
  return {
    logoURL: data.settings.logo_url ? mediaUrl(data.settings.logo_url) : "",
    slides: data.settings.slides.map(slideForm),
  };
}

export function AdminAuthScreenPage({ embedded = false }: { embedded?: boolean }) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoURL, setLogoURL] = useState("");
  const [slides, setSlides] = useState<SlideForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminAuthScreen();
      const next = applyView(data);
      setLogoURL(next.logoURL);
      setSlides(next.slides);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить экран входа");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateSlide(slot: number, patch: Partial<SlideForm>) {
    setSlides((current) =>
      current.map((slide) => (slide.slot === slot ? { ...slide, ...patch } : slide)),
    );
    setSaved(null);
  }

  async function saveSlide(slide: SlideForm) {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const updated = await updateAdminAuthScreenSlide(slide.slot, {
        enabled: slide.enabled,
        tag: slide.tag,
        title: slide.title,
        description: slide.description,
        duration_seconds: slide.duration_seconds,
      });
      updateSlide(slide.slot, slideForm(updated));
      setSaved(`Слайд ${slide.slot} сохранён`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить слайд");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogo(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const data = await uploadAdminAuthScreenLogo(file);
      setLogoURL(applyView(data).logoURL);
      setSaved("Логотип сохранён");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить логотип");
    } finally {
      setBusy(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function removeLogo() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      await deleteAdminAuthScreenLogo();
      setLogoURL("");
      setSaved("Логотип удалён");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить логотип");
    } finally {
      setBusy(false);
    }
  }

  async function handleMedia(slot: number, file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const data = await uploadAdminAuthScreenSlideMedia(slot, file);
      const next = applyView(data);
      setSlides(next.slides);
      setSaved(`Медиафайл слайда ${slot} сохранён`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить медиафайл");
    } finally {
      setBusy(false);
    }
  }

  async function removeMedia(slot: number) {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      await deleteAdminAuthScreenSlideMedia(slot);
      updateSlide(slot, { media_kind: "", media_url: "" });
      setSaved(`Медиафайл слайда ${slot} удалён`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить медиафайл");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Загрузка…</p>;
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Экран входа</h1>
          <p className="mt-1 text-sm text-slate-500">
            Логотип и до четырёх слайдов для страниц входа, регистрации и смены пароля.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{saved}</div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Логотип</h2>
            <p className="mt-1 text-xs text-slate-500">PNG, JPEG или WebP до 5 МБ. Показывается над приветствием.</p>
          </div>
          {logoURL && (
            <img src={logoURL} alt="Текущий логотип" className="max-h-12 max-w-48 object-contain" />
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => void handleLogo(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => logoInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {logoURL ? "Заменить логотип" : "Загрузить логотип"}
          </button>
          {logoURL && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void removeLogo()}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Удалить
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {slides.map((slide) => (
          <AuthScreenSlideEditor
            key={slide.slot}
            slide={slide}
            busy={busy}
            onChange={(patch) => updateSlide(slide.slot, patch)}
            onSave={() => void saveSlide(slide)}
            onUpload={(file) => void handleMedia(slide.slot, file)}
            onRemoveMedia={() => void removeMedia(slide.slot)}
          />
        ))}
      </div>
    </div>
  );
}

function AuthScreenSlideEditor({
  slide,
  busy,
  onChange,
  onSave,
  onUpload,
  onRemoveMedia,
}: {
  slide: SlideForm;
  busy: boolean;
  onChange: (patch: Partial<SlideForm>) => void;
  onSave: () => void;
  onUpload: (file: File | null) => void;
  onRemoveMedia: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Слайд {slide.slot}</h2>
        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={slide.enabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
            disabled={busy}
          />
          Показывать
        </label>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[8rem_1fr]">
        <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-lg bg-slate-100">
          {slide.media_url && slide.media_kind === "video" ? (
            <video src={mediaUrl(slide.media_url)} className="h-full w-full object-cover" muted />
          ) : slide.media_url ? (
            <img src={mediaUrl(slide.media_url)} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-slate-400" />
          )}
        </div>
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            className="hidden"
            onChange={(event) => void onUpload(event.target.files?.[0] ?? null)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" />
              {slide.media_url ? "Заменить медиа" : "Загрузить медиа"}
            </button>
            {slide.media_url && (
              <button
                type="button"
                disabled={busy}
                onClick={onRemoveMedia}
                className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400">Изображение или MP4/WebM до 50 МБ.</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Тег-пилюля</span>
          <input
            value={slide.tag}
            maxLength={80}
            onChange={(event) => onChange({ tag: event.target.value })}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="Новый инструмент"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Заголовок</span>
          <input
            value={slide.title}
            maxLength={160}
            onChange={(event) => onChange({ title: event.target.value })}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="Создавайте контент быстрее"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Описание</span>
          <textarea
            value={slide.description}
            maxLength={500}
            rows={3}
            onChange={(event) => onChange({ description: event.target.value })}
            className="w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="Коротко расскажите о преимуществе."
          />
        </label>
        <label className="block max-w-[12rem] text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-600">Показывать, секунд</span>
          <input
            type="number"
            min={3}
            max={60}
            value={slide.duration_seconds}
            onChange={(event) => onChange({ duration_seconds: Number(event.target.value) || DEFAULT_DURATION_SECONDS })}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onSave}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        Сохранить слайд
      </button>
    </section>
  );
}