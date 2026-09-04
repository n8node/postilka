"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Trash2, X } from "lucide-react";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { fetchProtectedMedia, mediaUrl } from "@/lib/media-display";
import type { SketchGenerationItem } from "@/lib/sketch-saves";

type SketchGenerationModalProps = {
  item: SketchGenerationItem;
  onClose: () => void;
  onUseInPost: () => void;
  onAnimate: () => void;
  onDelete: () => void;
};

export function SketchGenerationModal({
  item,
  onClose,
  onUseInPost,
  onAnimate,
  onDelete,
}: SketchGenerationModalProps) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const res = await fetchProtectedMedia(mediaUrl(item.url));
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = item.isVideo ? `generation-${item.id}.mp4` : `generation-${item.id}.png`;
      a.click();
      URL.revokeObjectURL(href);
    } catch {
      setSaveError("Не удалось скачать файл");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр генерации"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
        aria-label="Закрыть"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        className="flex max-h-[90vh] w-full max-w-[min(96vw,1200px)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
          {item.isVideo ? (
            <video
              src={mediaUrl(item.url)}
              controls
              className="max-h-[72vh] w-full object-contain"
            />
          ) : (
            <ProtectedMediaImage
              url={item.url}
              alt="Результат генерации"
              className="max-h-[72vh] w-full object-contain"
            />
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
          {!item.isVideo && (
            <button
              type="button"
              onClick={onAnimate}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-[12px] font-medium text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
            >
              Оживить
            </button>
          )}
          <button
            type="button"
            onClick={onUseInPost}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[12px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            В пост
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-[12px] font-medium text-zinc-800 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Сохранить
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-700 dark:border-red-900 dark:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Удалить
          </button>
        </div>
        {saveError && (
          <p className="px-3 pb-3 text-right text-[11px] text-red-600">{saveError}</p>
        )}
      </div>
    </div>
  );
}
