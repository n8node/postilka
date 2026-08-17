"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SketchCanvas, type SketchCanvasHandle } from "@/components/sketch/SketchCanvas";
import { SketchInspector } from "@/components/sketch/SketchInspector";
import { ApiError } from "@/lib/api";
import type { AspectRatioId } from "@/lib/generation-data";
import {
  fetchGenerationPricing,
  pollGenerationJob,
  uploadGenerationMedia,
  type GenerationJob,
  type GenerationPricing,
} from "@/lib/generation-api";
import {
  hasMediaCredits,
  useGenerationCreditsStore,
  useMediaCreditsRemaining,
} from "@/lib/generation-credits-store";
import { useGenerationJobStore } from "@/lib/generation-job-store";
import { useVideoGenerationJobStore } from "@/lib/video-generation-job-store";
import {
  fetchVideoGenerationPricing,
  pollVideoGenerationJob,
  type VideoGenerationJob,
  type VideoGenerationPricing,
} from "@/lib/video-generation-api";
import {
  aspectRatioToSize,
  type SketchBrushId,
} from "@/lib/harmony-brushes";
import { fetchSketchStyles, generateFromSketch, type SketchStyle } from "@/lib/sketch-api";
import { mediaUrl } from "@/lib/media-display";

export function SketchPage() {
  const router = useRouter();
  const canvasRef = useRef<SketchCanvasHandle>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const [styles, setStyles] = useState<SketchStyle[]>([]);
  const [stylesLoading, setStylesLoading] = useState(true);
  const [selectedStyleId, setSelectedStyleId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [strength, setStrength] = useState(0.65);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>("1:1");
  const [output, setOutput] = useState<"image" | "video">("image");
  const [duration, setDuration] = useState(5);
  const [brush, setBrush] = useState<SketchBrushId>("sketchy");
  const [color, setColor] = useState("#111111");
  const [brushSize, setBrushSize] = useState(8);
  const [canUndo, setCanUndo] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.35);
  const [localGenerating, setLocalGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [imagePricing, setImagePricing] = useState<GenerationPricing | null>(null);
  const [videoPricing, setVideoPricing] = useState<VideoGenerationPricing | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultIsVideo, setResultIsVideo] = useState(false);
  const [resultGenerationId, setResultGenerationId] = useState<string | null>(null);

  const creditsRemaining = useMediaCreditsRemaining();
  const setCreditsRemaining = useGenerationCreditsStore((s) => s.setCreditsRemaining);

  const canvasSize = useMemo(() => aspectRatioToSize(aspectRatio, 768), [aspectRatio]);

  const selectedStyle = styles.find((s) => s.id === selectedStyleId);

  const loadStyles = useCallback(async () => {
    setStylesLoading(true);
    try {
      const { items } = await fetchSketchStyles();
      setStyles(items ?? []);
      setSelectedStyleId((prev) => {
        if (prev && items.some((i) => i.id === prev)) return prev;
        return items[0]?.id ?? "";
      });
    } catch {
      setStyles([]);
    } finally {
      setStylesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStyles();
  }, [loadStyles]);

  useEffect(() => {
    void fetchGenerationPricing()
      .then(({ pricing }) => setImagePricing(pricing))
      .catch(() => setImagePricing(null));
    void fetchVideoGenerationPricing()
      .then(({ pricing }) => setVideoPricing(pricing))
      .catch(() => setVideoPricing(null));
  }, []);

  useEffect(() => {
    if (selectedStyle) {
      setStrength(selectedStyle.default_strength);
      if (selectedStyle.aspect_ratio) {
        setAspectRatio(selectedStyle.aspect_ratio as AspectRatioId);
      }
    }
  }, [selectedStyleId, selectedStyle]);

  const refreshUndo = useCallback(() => {
    setCanUndo(canvasRef.current?.canUndo() ?? false);
  }, []);

  const handleGenerate = async () => {
    setGenerateError(null);
    if (!selectedStyleId) {
      setGenerateError("Выберите стиль");
      return;
    }
    if (!canvasRef.current?.hasContent()) {
      setGenerateError("Нарисуйте набросок на холсте");
      return;
    }

    if (!hasMediaCredits(creditsRemaining)) {
      setGenerateError("Недостаточно кредитов. Пополните квоту или кошелёк.");
      return;
    }

    setLocalGenerating(true);
    setResultUrl(null);
    setResultGenerationId(null);

    try {
      const blob = await canvasRef.current.exportPNG();
      const file = new File([blob], "sketch.png", { type: "image/png" });
      const upload = await uploadGenerationMedia(file);

      const startedAt = Date.now();
      const { job, media_kind } = await generateFromSketch({
        style_id: selectedStyleId,
        source_upload_id: upload.id,
        prompt: prompt.trim(),
        aspect_ratio: aspectRatio,
        strength,
        output,
        duration: output === "video" ? duration : undefined,
      });

      if (media_kind === "video") {
        const videoJob = job as VideoGenerationJob;
        useVideoGenerationJobStore.getState().beginJob(videoJob, startedAt);
        const finalJob = await pollVideoGenerationJob(videoJob.id, (updated) => {
          useVideoGenerationJobStore.getState().patchJob(updated);
        });
        if (finalJob.status === "failed") {
          throw new Error(finalJob.fail_message || "Ошибка генерации видео");
        }
        const gen = finalJob.generation;
        if (gen?.video_url || gen?.image_url) {
          setResultUrl(mediaUrl(gen.video_url || gen.image_url));
          setResultIsVideo(true);
          setResultGenerationId(gen.id);
        }
      } else {
        const imageJob = job as GenerationJob;
        useGenerationJobStore.getState().beginJob(imageJob, startedAt);
        const res = await pollGenerationJob(imageJob.id, (updated) => {
          useGenerationJobStore.getState().patchJob(updated);
        });
        if (res.job.status === "failed") {
          throw new Error(res.job.fail_message || "Ошибка генерации");
        }
        const gen = res.job.generation;
        if (gen?.image_url) {
          setResultUrl(mediaUrl(gen.image_url));
          setResultIsVideo(false);
          setResultGenerationId(gen.id);
        }
        if (res.credits_remaining !== undefined) {
          setCreditsRemaining(res.credits_remaining);
        }
      }
    } catch (err) {
      setGenerateError(err instanceof ApiError ? err.message : "Не удалось сгенерировать");
    } finally {
      setLocalGenerating(false);
    }
  };

  const handleBackgroundFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => setBackgroundImage(img);
    img.src = URL.createObjectURL(file);
  };

  const handleUseInPost = () => {
    if (resultGenerationId) {
      router.push(`/posts/new?generation=${encodeURIComponent(resultGenerationId)}`);
    }
  };

  const handleAnimate = () => {
    if (resultGenerationId) {
      router.push(`/ai?tab=video&source=${encodeURIComponent(resultGenerationId)}`);
    }
  };

  if (stylesLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)] min-h-[480px] w-full flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/ai"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Набросок</h1>
            <p className="text-[10px] text-zinc-500">Рисунок → стиль → AI фото или видео</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-500">
          <span>Подложка: прозрачность</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(backgroundOpacity * 100)}
            onChange={(e) => setBackgroundOpacity(Number(e.target.value) / 100)}
            className="w-24 accent-indigo-600"
          />
          {backgroundImage && (
            <button
              type="button"
              onClick={() => setBackgroundImage(null)}
              className="rounded-lg border border-zinc-200 px-2 py-1 text-[10px] dark:border-zinc-700"
            >
              Убрать подложку
            </button>
          )}
        </div>
      </header>

      <div className="relative flex flex-1 min-h-0">
        <div className="relative flex-1 min-w-0 pr-0 sm:pr-[432px]">
          <SketchCanvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            brush={brush}
            color={color}
            brushSize={brushSize}
            backgroundImage={backgroundImage}
            backgroundOpacity={backgroundOpacity}
            onHistoryChange={refreshUndo}
          />
        </div>

        <SketchInspector
          styles={styles}
          selectedStyleId={selectedStyleId}
          onSelectStyle={setSelectedStyleId}
          prompt={prompt}
          onPromptChange={setPrompt}
          strength={strength}
          onStrengthChange={setStrength}
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
          output={output}
          onOutputChange={setOutput}
          duration={duration}
          onDurationChange={setDuration}
          brush={brush}
          onBrushChange={setBrush}
          color={color}
          onColorChange={setColor}
          brushSize={brushSize}
          onBrushSizeChange={setBrushSize}
          onClear={() => canvasRef.current?.clear()}
          onUndo={() => canvasRef.current?.undo()}
          canUndo={canUndo}
          onUploadBackground={() => bgInputRef.current?.click()}
          onGenerate={() => void handleGenerate()}
          generating={localGenerating}
          generateError={generateError}
          imagePricing={imagePricing}
          videoPricing={videoPricing}
          creditsRemaining={creditsRemaining}
          resultUrl={resultUrl}
          resultIsVideo={resultIsVideo}
          onUseInPost={handleUseInPost}
          onAnimate={handleAnimate}
          onClearResult={() => {
            setResultUrl(null);
            setResultGenerationId(null);
          }}
        />
      </div>

      <input
        ref={bgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleBackgroundFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}
