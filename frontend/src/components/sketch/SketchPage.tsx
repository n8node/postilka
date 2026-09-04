"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Save, Trash2, Undo2 } from "lucide-react";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { SketchCanvas, type SketchCanvasHandle } from "@/components/sketch/SketchCanvas";
import { SketchGenerationModal } from "@/components/sketch/SketchGenerationModal";
import { SketchInspector } from "@/components/sketch/SketchInspector";
import { GenerationProgressPanel } from "@/components/generation/GenerationProgressPanel";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import type { AspectRatioId } from "@/lib/generation-data";
import {
  fetchGenerationPricing,
  uploadGenerationMedia,
  type GenerationPricing,
} from "@/lib/generation-api";
import {
  hasMediaCredits,
  useGenerationCreditsStore,
  useMediaCreditsRemaining,
} from "@/lib/generation-credits-store";
import {
  fetchVideoGenerationPricing,
  type VideoGenerationPricing,
} from "@/lib/video-generation-api";
import {
  aspectRatioToSize,
  type SketchBrushId,
} from "@/lib/harmony-brushes";
import { fetchSketchStyles, generateFromSketch, type SketchStyle } from "@/lib/sketch-api";
import { useSketchJobStore } from "@/lib/sketch-job-store";
import {
  deleteSketchSave,
  listSketchSaves,
  removeSketchGeneration,
  saveSketch,
  type SavedSketch,
  type SketchGenerationItem,
} from "@/lib/sketch-saves";
import { cn } from "@/lib/utils";

export function SketchPage() {
  const router = useRouter();
  const { active_workspace, workspace } = useAuth();
  const workspaceId = active_workspace?.id ?? workspace?.id ?? "";
  const canvasRef = useRef<SketchCanvasHandle>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const pendingLoadRef = useRef<string | null>(null);

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
  const [imagePricing, setImagePricing] = useState<GenerationPricing | null>(null);
  const [videoPricing, setVideoPricing] = useState<VideoGenerationPricing | null>(null);
  const generating = useSketchJobStore((s) => s.running);
  const generateError = useSketchJobStore((s) => s.error);
  const resultUrl = useSketchJobStore((s) => s.resultUrl);
  const resultIsVideo = useSketchJobStore((s) => s.resultIsVideo);
  const resultGenerationId = useSketchJobStore((s) => s.resultGenerationId);
  const completionSeq = useSketchJobStore((s) => s.completionSeq);
  const jobProgress = useSketchJobStore((s) => s.progress);
  const jobStatus = useSketchJobStore((s) => s.status);
  const mediaKind = useSketchJobStore((s) => s.mediaKind);
  const [savedSketches, setSavedSketches] = useState<SavedSketch[]>([]);
  const [selectedSaveId, setSelectedSaveId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasCanvasContent, setHasCanvasContent] = useState(false);
  const [sketchDirty, setSketchDirty] = useState(false);
  const [previewItem, setPreviewItem] = useState<SketchGenerationItem | null>(null);
  const skipDirtyRef = useRef(false);

  const creditsRemaining = useMediaCreditsRemaining();
  const setCreditsRemaining = useGenerationCreditsStore((s) => s.setCreditsRemaining);

  const canvasSize = useMemo(() => aspectRatioToSize(aspectRatio, 768), [aspectRatio]);

  const currentResultItem = useMemo<SketchGenerationItem | null>(() => {
    if (!resultUrl || !resultGenerationId) return null;
    return {
      id: resultGenerationId,
      url: resultUrl,
      isVideo: resultIsVideo,
      createdAt: new Date().toISOString(),
    };
  }, [resultUrl, resultGenerationId, resultIsVideo]);

  const selectedSketchGenerations = useMemo(() => {
    const selected = savedSketches.find((item) => item.id === selectedSaveId);
    return selected?.generations ?? [];
  }, [savedSketches, selectedSaveId]);

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
      .then(({ pricing }) => {
        setImagePricing(pricing);
        if (pricing.unlimited || pricing.credits_remaining === null) {
          setCreditsRemaining(null);
        } else if (pricing.credits_remaining !== undefined) {
          setCreditsRemaining(pricing.credits_remaining);
        }
      })
      .catch(() => setImagePricing(null));
    void fetchVideoGenerationPricing()
      .then(({ pricing }) => setVideoPricing(pricing))
      .catch(() => setVideoPricing(null));
  }, [setCreditsRemaining]);

  useEffect(() => {
    if (selectedStyle) {
      setStrength(selectedStyle.default_strength);
      if (selectedStyle.aspect_ratio) {
        setAspectRatio(selectedStyle.aspect_ratio as AspectRatioId);
      }
    }
  }, [selectedStyleId, selectedStyle]);

  const refreshUndo = useCallback(() => {
    const has = canvasRef.current?.hasContent() ?? false;
    setCanUndo(canvasRef.current?.canUndo() ?? false);
    setHasCanvasContent(has);
    if (skipDirtyRef.current) {
      skipDirtyRef.current = false;
      return;
    }
    setSketchDirty(has);
  }, []);

  const reloadSavedSketches = useCallback(() => {
    if (!workspaceId) {
      setSavedSketches([]);
      return;
    }
    setSavedSketches(listSketchSaves(workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    reloadSavedSketches();
  }, [reloadSavedSketches, completionSeq]);

  useEffect(() => {
    if (!pendingLoadRef.current || !canvasRef.current) return;
    const dataUrl = pendingLoadRef.current;
    pendingLoadRef.current = null;
    void canvasRef.current.loadFromDataUrl(dataUrl).then(refreshUndo);
  }, [canvasSize.width, canvasSize.height, refreshUndo]);

  const persistCurrentSketch = useCallback(async (): Promise<SavedSketch | null> => {
    if (!workspaceId || !canvasRef.current?.hasContent()) return null;
    const dataUrl = await canvasRef.current.exportDataUrl();
    const saved = saveSketch(workspaceId, aspectRatio, dataUrl, selectedSaveId);
    setSelectedSaveId(saved.id);
    setSketchDirty(false);
    reloadSavedSketches();
    return saved;
  }, [workspaceId, aspectRatio, selectedSaveId, reloadSavedSketches]);

  const handleGenerate = async () => {
    const store = useSketchJobStore.getState();
    if (store.running) return;
    store.setError(null);
    if (!selectedStyleId) {
      store.setError("Выберите стиль");
      return;
    }
    if (!canvasRef.current?.hasContent()) {
      store.setError("Нарисуйте набросок на холсте");
      return;
    }

    if (!hasMediaCredits(creditsRemaining)) {
      store.setError("Недостаточно кредитов. Пополните квоту или кошелёк.");
      return;
    }

    let sketchId = selectedSaveId;
    if (workspaceId && (sketchDirty || !selectedSaveId)) {
      try {
        const saved = await persistCurrentSketch();
        if (saved) sketchId = saved.id;
      } catch {
        /* generation must continue even if local save fails */
      }
    }

    const submittedPrompt = prompt.trim();
    if (submittedPrompt) {
      setPrompt("");
    }

    store.markStarting();
    const startedAt = useSketchJobStore.getState().startedAt ?? Date.now();

    try {
      const blob = await canvasRef.current.exportPNG();
      const file = new File([blob], "sketch.png", { type: "image/png" });
      const upload = await uploadGenerationMedia(file);

      const { job, media_kind } = await generateFromSketch({
        style_id: selectedStyleId,
        source_upload_id: upload.id,
        prompt: submittedPrompt,
        aspect_ratio: aspectRatio,
        strength,
        output,
        duration: output === "video" ? duration : undefined,
      });

      if (!useSketchJobStore.getState().running) return;
      useSketchJobStore.getState().beginJob({
        jobId: job.id,
        mediaKind: media_kind === "video" ? "video" : "image",
        startedAt,
        sketchId,
        workspaceId,
      });
    } catch (err) {
      useSketchJobStore.getState().failJob(
        err instanceof ApiError ? err.message : "Не удалось сгенерировать",
      );
    }
  };

  const handleBackgroundFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => setBackgroundImage(img);
    img.src = URL.createObjectURL(file);
  };

  const handleUseInPost = (generationId: string) => {
    router.push(`/posts/new?generation=${encodeURIComponent(generationId)}`);
  };

  const handleAnimate = (generationId: string) => {
    router.push(`/ai?tab=video&source=${encodeURIComponent(generationId)}`);
  };

  const openGeneration = (item: SketchGenerationItem) => {
    setPreviewItem(item);
  };

  const handleRemoveGenerationFromHistory = (generationId: string) => {
    if (workspaceId && selectedSaveId) {
      removeSketchGeneration(workspaceId, selectedSaveId, generationId);
      reloadSavedSketches();
    }
    if (resultGenerationId === generationId) {
      useSketchJobStore.getState().clearResult();
    }
    setPreviewItem(null);
  };

  const handleSaveSketch = async () => {
    setSaveError(null);
    if (!workspaceId) {
      setSaveError("Рабочая область не выбрана");
      return;
    }
    if (!canvasRef.current?.hasContent()) {
      setSaveError("Нечего сохранять — нарисуйте набросок");
      return;
    }
    try {
      await persistCurrentSketch();
    } catch {
      setSaveError("Не удалось сохранить набросок");
    }
  };

  const handleDeleteSavedSketch = () => {
    if (!workspaceId || !selectedSaveId) return;
    deleteSketchSave(workspaceId, selectedSaveId);
    setSelectedSaveId(null);
    setPreviewItem(null);
    useSketchJobStore.getState().clearResult();
    reloadSavedSketches();
  };

  const handleLoadSavedSketch = (item: SavedSketch) => {
    skipDirtyRef.current = true;
    setSelectedSaveId(item.id);
    setSketchDirty(false);
    setSaveError(null);
    setPrompt("");
    setPreviewItem(null);
    if (item.aspectRatio !== aspectRatio) {
      pendingLoadRef.current = item.dataUrl;
      setAspectRatio(item.aspectRatio);
      return;
    }
    void canvasRef.current?.loadFromDataUrl(item.dataUrl).then(refreshUndo);
  };

  const handleAspectRatioChange = (next: AspectRatioId) => {
    if (next !== aspectRatio) {
      setPrompt("");
    }
    setAspectRatio(next);
  };

  const handleSelectStyle = (id: string) => {
    if (id !== selectedStyleId) {
      setPrompt("");
    }
    setSelectedStyleId(id);
  };

  const handleClearCanvas = () => {
    skipDirtyRef.current = true;
    canvasRef.current?.clear();
    setSketchDirty(false);
    setPrompt("");
  };

  if (stylesLoading) {
    return (
      <div className="flex h-[calc(100vh-18rem)] min-h-[28rem] items-center justify-center rounded-2xl border border-border bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-18rem)] min-h-[28rem] w-full flex-col overflow-hidden rounded-2xl border border-border bg-zinc-50 dark:bg-zinc-950">
      <div className="relative flex flex-1 min-h-0">
        <div className="relative flex flex-1 min-w-0 items-center justify-center overflow-auto p-4 pr-[272px] xl:pr-[432px]">
          <div className="flex items-start gap-3">
            {/* Saved sketches — vertical strip left of canvas */}
            <div
              className="flex w-16 shrink-0 flex-col gap-2 overflow-y-auto py-1"
              style={{ maxHeight: "calc(100vh - 24rem)" }}
            >
              {savedSketches.length === 0 ? (
                <>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 w-16 shrink-0 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40"
                    />
                  ))}
                </>
              ) : (
                savedSketches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleLoadSavedSketch(item)}
                    className={cn(
                      "h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-white transition",
                      selectedSaveId === item.id
                        ? "border-indigo-500 ring-2 ring-indigo-500/30"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700",
                    )}
                    title={new Date(item.createdAt).toLocaleString("ru-RU")}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.dataUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))
              )}
            </div>

            {/* Canvas workspace column — width follows canvas */}
            <div className="inline-flex min-w-0 max-w-full flex-col">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-[11px] text-zinc-500">
                  <span className="shrink-0">Подложка: прозрачность</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(backgroundOpacity * 100)}
                    onChange={(e) => setBackgroundOpacity(Number(e.target.value) / 100)}
                    className="min-w-12 max-w-28 flex-1 accent-indigo-600"
                  />
                  {backgroundImage && (
                    <button
                      type="button"
                      onClick={() => setBackgroundImage(null)}
                      className="shrink-0 rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] dark:border-zinc-700"
                    >
                      Убрать
                    </button>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => canvasRef.current?.undo()}
                    disabled={!canUndo}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCanvas}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Очистить
                  </button>
                  <button
                    type="button"
                    onClick={() => bgInputRef.current?.click()}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Подложка
                  </button>
                </div>
              </div>

              <div className="relative inline-flex min-w-0 max-w-full overflow-hidden rounded-xl">
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
                  maxHeight="calc(100vh - 24rem)"
                />
                {generating ? (
                  <GenerationProgressPanel
                    progress={jobProgress}
                    status={jobStatus}
                    active
                    overlay
                    variant={mediaKind === "video" || output === "video" ? "video" : "image"}
                  />
                ) : null}
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void handleSaveSketch()}
                  disabled={!hasCanvasContent}
                  className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  <Save className="h-3.5 w-3.5" />
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSavedSketch}
                  disabled={!selectedSaveId}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-700 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Удалить
                </button>
              </div>
              {saveError && (
                <p className="mt-1 text-right text-[11px] text-red-600 dark:text-red-400">
                  {saveError}
                </p>
              )}
            </div>

            {/* Generations for the selected sketch — vertical strip right of canvas */}
            <div
              className="flex w-16 shrink-0 flex-col gap-2 overflow-y-auto py-1"
              style={{ maxHeight: "calc(100vh - 24rem)" }}
            >
              {selectedSketchGenerations.length === 0 ? (
                <>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 w-16 shrink-0 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40"
                    />
                  ))}
                </>
              ) : (
                selectedSketchGenerations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openGeneration(item)}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white transition hover:border-indigo-400 dark:border-zinc-700"
                    title={new Date(item.createdAt).toLocaleString("ru-RU")}
                  >
                    <ProtectedMediaImage
                      url={item.thumbUrl || item.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <SketchInspector
          styles={styles}
          selectedStyleId={selectedStyleId}
          onSelectStyle={handleSelectStyle}
          prompt={prompt}
          onPromptChange={setPrompt}
          strength={strength}
          onStrengthChange={setStrength}
          aspectRatio={aspectRatio}
          onAspectRatioChange={handleAspectRatioChange}
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
          onGenerate={() => void handleGenerate()}
          generating={generating}
          generateError={generateError}
          imagePricing={imagePricing}
          videoPricing={videoPricing}
          creditsRemaining={creditsRemaining}
          resultUrl={resultUrl}
          resultIsVideo={resultIsVideo}
          onOpenResult={() => {
            if (currentResultItem) openGeneration(currentResultItem);
          }}
        />
      </div>

      {previewItem && (
        <SketchGenerationModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onUseInPost={() => handleUseInPost(previewItem.id)}
          onAnimate={() => handleAnimate(previewItem.id)}
          onDelete={() => handleRemoveGenerationFromHistory(previewItem.id)}
        />
      )}

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
