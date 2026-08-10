"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Combine,
  Image as ImageIcon,
  PenLine,
  Sparkles,
  Type,
} from "lucide-react";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { GenerationHistory } from "@/components/generation/GenerationHistory";
import { GenerationProgressPanel } from "@/components/generation/GenerationProgressPanel";
import { GenerationSidebarStats } from "@/components/generation/GenerationSidebarStats";
import { FormatParamsPanel } from "@/components/generation/FormatParamsPanel";
import { SourcePhotosPanel } from "@/components/generation/SourcePhotosPanel";
import { Card } from "@/components/ui/Card";
import { ApiError } from "@/lib/api";
import type { GenerationPricing } from "@/lib/generation-api";
import {
  deleteGenerationHistory,
  fetchGenerationHistory,
  fetchGenerationPricing,
  improveGenerationPrompt,
  startGeneration,
} from "@/lib/generation-api";
import {
  hasMediaCredits,
  useGenerationCreditsStore,
  useMediaCreditsRemaining,
} from "@/lib/generation-credits-store";
import { useGenerationJobStore } from "@/lib/generation-job-store";
import {
  defaultPrompt,
  emptyCombinePhotos,
  generationModeLabels,
  generationModes,
  promptPlaceholders,
  toHistoryItem,
  type AspectRatioId,
  type GenerationHistoryItem,
  type GenerationModeId,
  type GenerationUpload,
} from "@/lib/generation-data";
import {
  historyDropErrorMessage,
  historyItemToUpload,
  uploadHistoryItem,
} from "@/lib/generation-history-drop";
import { cn } from "@/lib/utils";

const modeIcons = {
  "text-to-image": Type,
  "image-to-image": ImageIcon,
  combine: Combine,
} as const;

export function GenerationPageContent() {
  const router = useRouter();
  const [mode, setMode] = useState<GenerationModeId>("text-to-image");
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioId>("1:1");
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const creditsRemaining = useMediaCreditsRemaining();
  const setCreditsRemaining = useGenerationCreditsStore(
    (s) => s.setCreditsRemaining,
  );
  const [pricing, setPricing] = useState<GenerationPricing | null>(null);
  const [, setElapsedTick] = useState(0);
  const [sourcePhoto, setSourcePhoto] = useState<GenerationUpload | null>(null);
  const [combinePhotos, setCombinePhotos] = useState(emptyCombinePhotos);
  const [historyDragActive, setHistoryDragActive] = useState(false);

  const generating = useGenerationJobStore((s) => s.running);
  const activeJob = useGenerationJobStore((s) => s.job);
  const generateError = useGenerationJobStore((s) => s.error);
  const resultUrl = useGenerationJobStore((s) => s.resultUrl);
  const resultGenerationId = useGenerationJobStore((s) => s.resultGenerationId);
  const generationStartedAt = useGenerationJobStore((s) => s.startedAt);
  const lastRun = useGenerationJobStore((s) => s.lastRun);
  const completionSeq = useGenerationJobStore((s) => s.completionSeq);
  const beginJob = useGenerationJobStore((s) => s.beginJob);
  const clearError = useGenerationJobStore((s) => s.clearError);
  const setResultFromHistory = useGenerationJobStore((s) => s.setResultFromHistory);
  const clearResult = useGenerationJobStore((s) => s.clearResult);

  const hasSourceStep = mode !== "text-to-image";
  const promptStep = hasSourceStep ? 3 : 2;
  const formatStep = hasSourceStep ? 4 : 3;

  const combineFilledCount = combinePhotos.filter(Boolean).length;

  const loadHistory = useCallback(async () => {
    try {
      const { items } = await fetchGenerationHistory();
      setHistory(items.map(toHistoryItem));
      setHistoryError(null);
    } catch (err) {
      setHistory([]);
      setHistoryError(
        err instanceof ApiError ? err.message : "Не удалось загрузить историю",
      );
    }
  }, []);

  const loadPricing = useCallback(async () => {
    try {
      const { pricing: p } = await fetchGenerationPricing();
      setPricing(p);
      if (p.unlimited || p.credits_remaining === null) {
        setCreditsRemaining(null);
      } else if (p.credits_remaining !== undefined) {
        setCreditsRemaining(p.credits_remaining);
      }
    } catch {
      setPricing(null);
    }
  }, [setCreditsRemaining]);

  useEffect(() => {
    void loadHistory();
    void loadPricing();
  }, [loadHistory, loadPricing]);

  useEffect(() => {
    if (completionSeq === 0) return;
    void loadHistory();
    void loadPricing();
  }, [completionSeq, loadHistory, loadPricing]);

  useEffect(() => {
    if (!generating) return;
    const id = window.setInterval(() => setElapsedTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [generating]);

  const canGenerate = useMemo(() => {
    if (!prompt.trim() || generating || !hasMediaCredits(creditsRemaining)) {
      return false;
    }
    if (mode === "image-to-image") return Boolean(sourcePhoto);
    if (mode === "combine") return combineFilledCount >= 2;
    return true;
  }, [
    prompt,
    generating,
    creditsRemaining,
    mode,
    sourcePhoto,
    combineFilledCount,
  ]);

  const canDragHistoryToSources = mode !== "text-to-image";

  const prependHistoryIfNew = useCallback((entry: GenerationHistoryItem) => {
    setHistory((prev) => {
      if (prev.some((h) => h.id === entry.id || h.imageUrl === entry.imageUrl)) {
        return prev;
      }
      return [entry, ...prev];
    });
  }, []);

  const handleHistoryDrop = useCallback(
    async (item: GenerationHistoryItem, slot: number | "single") => {
      try {
        const upload = await historyItemToUpload(item);
        const modeLabel = generationModeLabels[mode];

        if (mode === "image-to-image" && slot === "single") {
          if (
            sourcePhoto &&
            sourcePhoto.previewUrl !== item.imageUrl &&
            sourcePhoto.uploadId !== upload.uploadId
          ) {
            prependHistoryIfNew(
              uploadHistoryItem(sourcePhoto, prompt, modeLabel),
            );
          }
          setSourcePhoto(upload);
          return;
        }

        if (mode === "combine" && typeof slot === "number") {
          const replaced = combinePhotos[slot];
          if (
            replaced &&
            replaced.previewUrl !== item.imageUrl &&
            replaced.uploadId !== upload.uploadId
          ) {
            prependHistoryIfNew(
              uploadHistoryItem(replaced, prompt, modeLabel),
            );
          }
          setCombinePhotos((prev) =>
            prev.map((photo, i) => (i === slot ? upload : photo)),
          );
        }
      } finally {
        setHistoryDragActive(false);
      }
    },
    [mode, sourcePhoto, combinePhotos, prompt, prependHistoryIfNew],
  );

  const handleModeChange = (nextMode: GenerationModeId) => {
    if (generating) return;
    setMode(nextMode);
    setSourcePhoto(null);
    setCombinePhotos(emptyCombinePhotos());
    clearResult();
    clearError();
    setImproveError(null);
    if (nextMode !== "text-to-image") {
      setPrompt("");
    } else {
      setPrompt(defaultPrompt);
    }
  };

  const improvePrompt = async () => {
    if (!prompt.trim() || improving) return;
    setImproving(true);
    setImproveError(null);
    try {
      const { prompt: improved } = await improveGenerationPrompt({
        prompt: prompt.trim(),
        mode,
      });
      setPrompt(improved);
    } catch (err) {
      setImproveError(
        err instanceof ApiError ? err.message : "Не удалось улучшить промпт",
      );
    } finally {
      setImproving(false);
    }
  };

  const generate = async () => {
    if (!canGenerate) return;

    clearError();
    try {
      const body = {
        mode,
        prompt: prompt.trim(),
        aspect_ratio: aspectRatio,
        source_upload_id: sourcePhoto?.uploadId,
        combine_upload_ids: combinePhotos
          .filter((p): p is GenerationUpload => p !== null)
          .map((p) => p.uploadId),
      };

      const { job: started } = await startGeneration(body);
      beginJob(started, Date.now());
    } catch (err) {
      useGenerationJobStore.getState().failJob(
        err instanceof ApiError
          ? err.message
          : "Не удалось запустить генерацию. Кредиты не были списаны.",
      );
    }
  };

  const loadFromHistory = (item: GenerationHistoryItem) => {
    setResultFromHistory(item.imageUrl, item.id);
    setPrompt(item.prompt);
  };

  const handleDeleteHistory = useCallback(
    async (ids: string[]) => {
      const res = await deleteGenerationHistory(ids);
      const removed = new Set(res.deleted_ids);
      setHistory((prev) => prev.filter((h) => !removed.has(h.id)));
      if (resultGenerationId && removed.has(resultGenerationId)) {
        clearResult();
      }
    },
    [resultGenerationId, clearResult],
  );

  const makePost = () => {
    if (!resultGenerationId) return;
    router.push(`/posts?generation=${encodeURIComponent(resultGenerationId)}`);
  };

  const showProgress = generating || (!resultUrl && !generating);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <Card hover>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
            1 · Режим генерации
          </p>
          <div className="flex flex-col gap-2">
            {generationModes.map((item) => {
              const Icon = modeIcons[item.id];
              const selected = mode === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleModeChange(item.id)}
                  disabled={generating}
                  className={cn(
                    "flex items-start gap-3 rounded-[10px] border px-3 py-3 text-left transition-colors",
                    selected
                      ? "border-blue-200 bg-blue-50"
                      : "border-border bg-bg hover:border-zinc-300",
                    generating && "cursor-not-allowed opacity-60",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      selected ? "bg-surface" : "bg-zinc-50",
                    )}
                  >
                    <Icon
                      size={16}
                      className={selected ? "text-accent" : "text-zinc-400"}
                    />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-text">
                      {item.label}
                    </p>
                    <p className="text-[11px] leading-relaxed text-zinc-400">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <SourcePhotosPanel
          mode={mode}
          sourcePhoto={sourcePhoto}
          combinePhotos={combinePhotos}
          historyDragActive={historyDragActive}
          onSourcePhotoChange={setSourcePhoto}
          onCombinePhotoChange={(index, value) =>
            setCombinePhotos((prev) =>
              prev.map((photo, i) => (i === index ? value : photo)),
            )
          }
          onHistoryDrop={async (item, slot) => {
            try {
              await handleHistoryDrop(item, slot);
            } catch (err) {
              throw new Error(historyDropErrorMessage(err));
            }
          }}
        />

        <Card hover>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
              {promptStep} · Описание (промпт)
            </p>
            <button
              type="button"
              onClick={() => void improvePrompt()}
              disabled={!prompt.trim() || improving}
              className="flex items-center gap-1 text-[11px] font-medium text-accent disabled:opacity-40"
            >
              <Sparkles size={11} />
              {improving ? "Улучшение…" : "Улучшить"}
            </button>
          </div>

          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={promptPlaceholders[mode]}
            className="box-border min-h-[88px] w-full resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-[13px] leading-relaxed text-text outline-none focus:border-zinc-400"
          />
          {improveError && (
            <p className="mt-2 text-[12px] text-red-600">{improveError}</p>
          )}
        </Card>

        <FormatParamsPanel
          step={formatStep}
          aspectRatio={aspectRatio}
          onAspectRatioChange={setAspectRatio}
        />

        {generateError && (
          <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-600">
            {generateError}
          </p>
        )}

        <button
          type="button"
          onClick={() => void generate()}
          disabled={!canGenerate}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-accent text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
        >
          <Sparkles size={16} />
          {generating ? "Генерация…" : "Сгенерировать"}
        </button>

        <GenerationSidebarStats
          creditsRemaining={creditsRemaining}
          mode={mode}
          pricing={pricing}
          generating={generating}
          generationStartedAt={generationStartedAt}
          lastRun={lastRun}
        />
      </div>

      <Card hover className="flex min-h-[520px] min-w-0 flex-col overflow-x-hidden">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
            Результат
          </p>
          <button
            type="button"
            onClick={makePost}
            disabled={!resultGenerationId}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900 disabled:opacity-40"
          >
            <PenLine size={14} />
            Сделать пост
          </button>
        </div>

        {showProgress && !resultUrl ? (
          <GenerationProgressPanel
            progress={activeJob?.progress ?? 0}
            status={activeJob?.status ?? "preparing"}
            active={generating}
            empty={!generating}
          />
        ) : resultUrl ? (
          <div className="relative min-h-[360px] overflow-hidden rounded-lg bg-zinc-50">
            <ProtectedMediaImage
              url={resultUrl}
              alt="Результат генерации"
              className="h-full min-h-[360px] w-full object-contain"
            />
            {generating && activeJob ? (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-4 pb-4 pt-10">
                <div className="mb-1 flex justify-between text-[11px] text-white">
                  <span>{activeJob.progress}%</span>
                  <span>{activeJob.kie_state || activeJob.status}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-500"
                    style={{ width: `${activeJob.progress}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <GenerationProgressPanel
            progress={0}
            status="preparing"
            active={false}
            empty
          />
        )}

        <GenerationHistory
          items={history}
          loadError={historyError}
          onSelect={loadFromHistory}
          onDelete={async (ids) => {
            try {
              await handleDeleteHistory(ids);
            } catch (err) {
              throw new Error(
                err instanceof ApiError
                  ? err.message
                  : "Не удалось удалить выбранные фото",
              );
            }
          }}
          canDragToSources={canDragHistoryToSources}
          onDragStart={() => setHistoryDragActive(true)}
          onDragEnd={() => setHistoryDragActive(false)}
        />
      </Card>
    </div>
  );
}
