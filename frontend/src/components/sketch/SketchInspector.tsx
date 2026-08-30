"use client";

import React, { useEffect, useState } from "react";
import {
  Loader2,
  Paintbrush,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { AspectRatioPicker } from "@/components/generation/AspectRatioPicker";
import {
  SKETCH_BRUSHES,
  SKETCH_COLORS,
  type SketchBrushId,
} from "@/lib/harmony-brushes";
import type { SketchStyle } from "@/lib/sketch-api";
import type { AspectRatioId } from "@/lib/generation-data";
import { formatMediaCreditCost } from "@/lib/generation-format";
import type { GenerationPricing } from "@/lib/generation-api";
import type { VideoGenerationPricing } from "@/lib/video-generation-api";
import { cn } from "@/lib/utils";

type SketchInspectorProps = {
  styles: SketchStyle[];
  selectedStyleId: string;
  onSelectStyle: (id: string) => void;
  prompt: string;
  onPromptChange: (v: string) => void;
  strength: number;
  onStrengthChange: (v: number) => void;
  aspectRatio: AspectRatioId;
  onAspectRatioChange: (v: AspectRatioId) => void;
  output: "image" | "video";
  onOutputChange: (v: "image" | "video") => void;
  duration: number;
  onDurationChange: (v: number) => void;
  brush: SketchBrushId;
  onBrushChange: (v: SketchBrushId) => void;
  color: string;
  onColorChange: (v: string) => void;
  brushSize: number;
  onBrushSizeChange: (v: number) => void;
  onGenerate: () => void;
  generating: boolean;
  generateError: string | null;
  imagePricing: GenerationPricing | null;
  videoPricing: VideoGenerationPricing | null;
  creditsRemaining: number | null;
  resultUrl: string | null;
  resultIsVideo: boolean;
  onUseInPost: () => void;
  onAnimate: () => void;
  onClearResult: () => void;
};

export function SketchInspector({
  styles,
  selectedStyleId,
  onSelectStyle,
  prompt,
  onPromptChange,
  strength,
  onStrengthChange,
  aspectRatio,
  onAspectRatioChange,
  output,
  onOutputChange,
  duration,
  onDurationChange,
  brush,
  onBrushChange,
  color,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  onGenerate,
  generating,
  generateError,
  imagePricing,
  videoPricing,
  creditsRemaining,
  resultUrl,
  resultIsVideo,
  onUseInPost,
  onAnimate,
  onClearResult,
}: SketchInspectorProps) {
  const imageCost = imagePricing?.image_to_image ?? 1;
  const videoCost = videoPricing?.image_to_video ?? 2;
  const cost = output === "video" ? videoCost * Math.max(1, duration / 5) : imageCost;
  const costLabel = formatMediaCreditCost(Math.ceil(cost));
  const [resultPreviewOpen, setResultPreviewOpen] = useState(false);

  useEffect(() => {
    setResultPreviewOpen(false);
  }, [resultUrl]);

  useEffect(() => {
    if (!resultPreviewOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setResultPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resultPreviewOpen]);

  return (
    <aside
      onWheel={(e) => e.stopPropagation()}
      data-panel="sketch-inspector"
      className="absolute right-3 top-3 bottom-3 z-30 flex w-96 sm:w-[420px] max-h-[calc(100%-1.5rem)] flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-md"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-white text-xs shadow-sm">
            <Paintbrush className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Набросок
            </h3>
            <p className="text-[10px] text-zinc-500">Стиль и генерация</p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-4 text-xs">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="font-medium text-zinc-700 dark:text-zinc-300">
              Влияние наброска
            </label>
            <span className="text-[10px] text-zinc-500">{Math.round(strength * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(strength * 100)}
            onChange={(e) => onStrengthChange(Number(e.target.value) / 100)}
            className="w-full accent-indigo-600"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-medium text-zinc-700 dark:text-zinc-300">
            Формат
          </label>
          <AspectRatioPicker value={aspectRatio} onChange={onAspectRatioChange} />
        </div>

        {/* Brushes toolbar */}
        <div>
          <label className="mb-1.5 block font-medium text-zinc-700 dark:text-zinc-300">
            Кисть
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {SKETCH_BRUSHES.map((b) => (
              <button
                key={b.id}
                type="button"
                title={b.desc}
                onClick={() => onBrushChange(b.id)}
                className={cn(
                  "rounded-lg border px-1.5 py-1.5 text-[10px] font-medium transition",
                  brush === b.id
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400",
                )}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[10px] text-zinc-500">Толщина</label>
            <input
              type="range"
              min={2}
              max={48}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <span className="text-[10px] text-zinc-500">{brushSize}px</span>
          </div>
          <div>
            <label className="mb-1 block text-[10px] text-zinc-500">Цвет</label>
            <div className="grid grid-cols-7 gap-1">
              {SKETCH_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Цвет ${c}`}
                  onClick={() => onColorChange(c)}
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition",
                    color === c ? "border-indigo-500 scale-110" : "border-zinc-200 dark:border-zinc-600",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
          <label className="mb-1.5 block font-medium text-zinc-700 dark:text-zinc-300">
            Стиль
          </label>
          <div className="grid grid-cols-3 gap-2">
            {styles.map((style) => {
              const active = style.id === selectedStyleId;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onSelectStyle(style.id)}
                  className={cn(
                    "rounded-xl border p-2 text-left transition",
                    active
                      ? "border-indigo-500 bg-indigo-50/80 ring-1 ring-indigo-500/30 dark:bg-indigo-950/40"
                      : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/40",
                  )}
                >
                  {style.preview_url ? (
                    <div className="mb-1.5 aspect-square overflow-hidden rounded-lg bg-zinc-200">
                      <ProtectedMediaImage
                        url={style.preview_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="mb-1.5 flex aspect-square items-center justify-center rounded-lg bg-zinc-200 text-zinc-400">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  )}
                  <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {style.title}
                  </p>
                  {style.description && (
                    <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-500">
                      {style.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
            Дополнительное описание
          </label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Например: чашка кофе на деревянном столе, утренний свет…"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-100"
          />
        </div>

        <div>
          <label className="mb-1.5 block font-medium text-zinc-700 dark:text-zinc-300">
            Результат
          </label>
          <div className="flex gap-2">
            {(["image", "video"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => onOutputChange(kind)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-[11px] font-semibold transition",
                  output === kind
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/60",
                )}
              >
                {kind === "image" ? "Фото" : "Видео"}
              </button>
            ))}
          </div>
          {output === "video" && (
            <div className="mt-2">
              <label className="mb-1 block text-[10px] text-zinc-500">Длительность (сек)</label>
              <select
                value={duration}
                onChange={(e) => onDurationChange(Number(e.target.value))}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-800/60"
              >
                {[4, 5, 6, 8, 10].map((d) => (
                  <option key={d} value={d}>
                    {d} сек
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {generating && (
          <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-[11px] text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Генерация…
          </div>
        )}

        {generateError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {generateError}
          </div>
        )}

        {resultUrl && !generating && (
          <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
              Готово
            </p>
            <div className="overflow-hidden rounded-lg border border-emerald-200/80 bg-white">
              {resultIsVideo ? (
                <video src={resultUrl} controls className="max-h-40 w-full object-contain" />
              ) : (
                <button
                  type="button"
                  onClick={() => setResultPreviewOpen(true)}
                  className="block w-full cursor-zoom-in transition hover:opacity-95"
                  aria-label="Открыть фото в полном размере"
                >
                  <ProtectedMediaImage
                    url={resultUrl}
                    alt="Результат генерации"
                    className="max-h-40 w-full object-contain"
                  />
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onUseInPost}
                className="rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                В пост
              </button>
              {!resultIsVideo && (
                <button
                  type="button"
                  onClick={onAnimate}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-medium dark:border-zinc-700"
                >
                  Оживить
                </button>
              )}
              <button
                type="button"
                onClick={onClearResult}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px] dark:border-zinc-700"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 p-3">
        <p className="mb-2 text-center text-[10px] text-zinc-500">
          {costLabel}
          {creditsRemaining != null ? ` · осталось ${creditsRemaining} кред.` : ""}
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating || !selectedStyleId}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {generating ? "Генерация…" : "Сгенерировать"}
        </button>
      </div>

      {resultPreviewOpen && resultUrl && !resultIsVideo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр результата"
          onClick={() => setResultPreviewOpen(false)}
        >
          <button
            type="button"
            onClick={() => setResultPreviewOpen(false)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="max-h-[90vh] max-w-[min(96vw,1200px)] overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ProtectedMediaImage
              url={resultUrl}
              alt="Результат генерации"
              className="max-h-[90vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </aside>
  );
}
