"use client";

import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  deleteAdminProviderLogo,
  uploadAdminProviderLogo,
  type ProviderLogoKey,
  type ProviderLogoView,
} from "@/lib/api";
import { mediaUrl } from "@/lib/media-display";

type ProviderLogoFieldProps = {
  provider: ProviderLogoKey;
  label: string;
  logo?: ProviderLogoView | null;
  onChanged: (logo: ProviderLogoView | null) => void;
};

function versionedLogoSrc(url: string, extra?: string) {
  const base = mediaUrl(url);
  if (!extra) return base;
  return `${base}${base.includes("?") ? "&" : "?"}r=${encodeURIComponent(extra)}`;
}

export function ProviderLogoField({
  provider,
  label,
  logo,
  onChanged,
}: ProviderLogoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [bust, setBust] = useState(0);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const remoteSrc = logo?.logo_url
    ? versionedLogoSrc(logo.logo_url, bust ? String(bust) : logo.updated_at)
    : null;
  const src = localPreview || remoteSrc;

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    if (file.type !== "image/png") {
      setError("Нужен файл PNG");
      return;
    }
    const preview = URL.createObjectURL(file);
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return preview;
    });
    setBusy(true);
    try {
      const next = await uploadAdminProviderLogo(provider, file);
      onChanged(next);
      setBust(Date.now());
      setLocalPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить логотип");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    setError(null);
    setBusy(true);
    try {
      await deleteAdminProviderLogo(provider);
      setLocalPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setBust(Date.now());
      onChanged(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось удалить логотип");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <h3 className="font-medium text-slate-900">Логотип {label}</h3>
      <p className="text-xs text-slate-500">
        PNG, квадрат. Больше 512×512 обрежем и уменьшим до 512×512.
      </p>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-200">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] text-slate-400">нет</span>
          )}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {busy ? "Загрузка…" : src ? "Заменить" : "Загрузить PNG"}
          </button>
          {src ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDelete()}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Удалить
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
