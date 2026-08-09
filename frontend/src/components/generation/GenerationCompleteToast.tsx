"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useGenerationJobStore } from "@/lib/generation-job-store";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";

const AUTO_DISMISS_MS = 6000;

function GenerationToastItem({
  id,
  imageUrl,
  generationId,
}: {
  id: string;
  imageUrl: string;
  generationId: string;
}) {
  const dismissToast = useGenerationJobStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = window.setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [id, dismissToast]);

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-[min(100vw-2rem,340px)] items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-[transform,opacity] duration-300 ease-out"
    >
      <Link
        href={`/ai?highlight=${encodeURIComponent(generationId)}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-300 bg-zinc-50">
          <ProtectedMediaImage
            url={imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <p className="text-[13px] font-medium leading-snug text-text">
          Генерация завершена
        </p>
      </Link>
      <button
        type="button"
        aria-label="Закрыть"
        onClick={() => dismissToast(id)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-text"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function GenerationCompleteToast() {
  const toasts = useGenerationJobStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[90] flex flex-col gap-2 sm:right-6"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <GenerationToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
}
