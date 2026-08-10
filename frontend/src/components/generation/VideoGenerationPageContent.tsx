"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { ProtectedMediaVideo } from "@/components/media/ProtectedMediaVideo";
import { GenerationProgressPanel } from "@/components/generation/GenerationProgressPanel";
import { VideoExamplesStrip } from "@/components/generation/VideoExamplesStrip";
import { VideoFormatParamsPanel } from "@/components/generation/VideoFormatParamsPanel";
import {
  VideoGenerationHistory,
} from "@/components/generation/VideoGenerationHistory";
import { VideoSidebarStats } from "@/components/generation/VideoSidebarStats";
import { VideoSourcePhotosPanel } from "@/components/generation/VideoSourcePhotosPanel";
import { Card } from "@/components/ui/Card";
import { ApiError } from "@/lib/api";
import { improveGenerationPrompt } from "@/lib/generation-api";
import {
  hasMediaCredits,
  useGenerationCreditsStore,
  useMediaCreditsRemaining,
} from "@/lib/generation-credits-store";
import { useVideoGenerationJobStore } from "@/lib/video-generation-job-store";
import {
  defaultDurationForMode,
  deleteVideoGenerationHistory,
  fetchVideoGenerationHistory,
  fetchVideoGenerationPricing,
  startVideoGeneration,
  type VideoGenerationPricing,
} from "@/lib/video-generation-api";
import {
  defaultVideoPrompt,
  emptyReferencePhotos,
  toVideoHistoryItem,
  videoGenerationModes,
  videoModeIcons,
  videoPromptPlaceholders,
  type VideoAspectRatioId,
  type VideoGenerationHistoryItem,
  type VideoGenerationModeId,
  type VideoGenerationUpload,
} from "@/lib/video-generation-data";
import { cn } from "@/lib/utils";

export function VideoGenerationPageContent() {
  const [mode, setMode] = useState<VideoGenerationModeId>("text-to-video");
  const [prompt, setPrompt] = useState(defaultVideoPrompt);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatioId>("16:9");
  const [duration, setDuration] = useState(5);
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [history, setHistory] = useState<VideoGenerationHistoryItem[]>([]);
  const creditsRemaining = useMediaCreditsRemaining();
  const setCreditsRemaining = useGenerationCreditsStore(
    (s) => s.setCreditsRemaining,
  );
  const [pricing, setPricing] = useState<VideoGenerationPricing | null>(null);
  const [, setElapsedTick] = useState(0);
  const [sourcePhoto, setSourcePhoto] = useState<VideoGenerationUpload | null>(
    null,
  );
  const [referencePhotos, setReferencePhotos] = useState(emptyReferencePhotos);

  const generating = useVideoGenerationJobStore((s) => s.running);
  const activeJob = useVideoGenerationJobStore((s) => s.job);
  const generateError = useVideoGenerationJobStore((s) => s.error);
  const resultUrl = useVideoGenerationJobStore((s) => s.resultUrl);
  const resultGenerationId = useVideoGenerationJobStore(
    (s) => s.resultGenerationId,
  );
  const generationStartedAt = useVideoGenerationJobStore((s) => s.startedAt);
  const lastRun = useVideoGenerationJobStore((s) => s.lastRun);
  const completionSeq = useVideoGenerationJobStore((s) => s.completionSeq);
  const beginJob = useVideoGenerationJobStore((s) => s.beginJob);
  const clearError = useVideoGenerationJobStore((s) => s.clearError);
  const setResultFromHistory = useVideoGenerationJobStore(
    (s) => s.setResultFromHistory,
  );
  const clearResult = useVideoGenerationJobStore((s) => s.clearResult);

  const hasSourceStep = mode !== "text-to-video";
  const promptStep = hasSourceStep ? 3 : 2;
  const formatStep = hasSourceStep ? 4 : 3;

  const referenceFilledCount = referencePhotos.filter(Boolean).length;

  const loadHistory = useCallback(async () => {
    try {
      const { items } = await fetchVideoGenerationHistory();
      setHistory(items.map(toVideoHistoryItem));
    } catch {
      setHistory([]);
    }
  }, []);

  const loadPricing = useCallback(async () => {
    try {
      const { pricing: p } = await fetchVideoGenerationPricing();
      setPricing(p);
      setDuration(defaultDurationForMode(p, mode));
      if (p.unlimited || p.credits_remaining === null) {
        setCreditsRemaining(null);
      } else if (p.credits_remaining !== undefined) {
        setCreditsRemaining(p.credits_remaining);
      }
    } catch {
      setPricing(null);
    }
  }, [mode, setCreditsRemaining]);

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

  useEffect(() => {
    if (!pricing) return;
    setDuration(defaultDurationForMode(pricing, mode));
  }, [mode, pricing]);

  const canGenerate = useMemo(() => {
    if (!prompt.trim() || generating || !hasMediaCredits(creditsRemaining)) {
      return false;
    }
    if (mode === "image-to-video") return Boolean(sourcePhoto);
    if (mode === "reference-to-video") return referenceFilledCount >= 1;
    return true;
  }, [
    prompt,
    generating,
    creditsRemaining,
    mode,
    sourcePhoto,
    referenceFilledCount,
  ]);

  const handleModeChange = (nextMode: VideoGenerationModeId) => {
    if (generating) return;
    setMode(nextMode);
    setSourcePhoto(null);
    setReferencePhotos(emptyReferencePhotos());
    clearResult();
    clearError();
    setImproveError(null);
    if (nextMode !== "text-to-video") {
      setPrompt("");
    } else {
      setPrompt(defaultVideoPrompt);
    }
    if (pricing) {
      setDuration(defaultDurationForMode(pricing, nextMode));
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
        duration,
        source_upload_id: sourcePhoto?.uploadId,
        reference_upload_ids: referencePhotos
          .filter((p): p is VideoGenerationUpload => p !== null)
          .map((p) => p.uploadId),
      };
      const { job: started } = await startVideoGeneration(body);
      beginJob(started, Date.now());
    } catch (err) {
      useVideoGenerationJobStore.getState().failJob(
        err instanceof ApiError
          ? err.message
          : "Не удалось запустить генерацию. Кредиты не были списаны.",
      );
    }
  };

  const loadFromHistory = (item: VideoGenerationHistoryItem) => {
    setResultFromHistory(item.videoUrl, item.id);
    setPrompt(item.prompt);
    if (item.aspectRatio) {
      setAspectRatio(item.aspectRatio as VideoAspectRatioId);
    }
    if (item.videoDurationSeconds) {
      setDuration(item.videoDurationSeconds);
    }
  };

  const handleDeleteHistory = useCallback(
    async (ids: string[]) => {
      const res = await deleteVideoGenerationHistory(ids);
      const removed = new Set(res.deleted_ids);
      setHistory((prev) => prev.filter((h) => !removed.has(h.id)));
      if (resultGenerationId && removed.has(resultGenerationId)) {
        clearResult();
      }
    },
    [resultGenerationId, clearResult],
  );

  const showProgress = generating || (!resultUrl && !generating);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <VideoExamplesStrip
          onSelect={(preset) => {
            if (generating) return;
            handleModeChange(preset.mode);
            setPrompt(preset.prompt);
            setAspectRatio(preset.aspectRatio);
            setDuration(preset.duration);
          }}
        />

        <Card hover>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
            1 · Режим генерации
          </p>
          <div className="flex flex-col gap-2">
            {videoGenerationModes.map((item) => {
              const Icon = videoModeIcons[item.id];
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
                      selected ? "bg-white" : "bg-zinc-50",
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

        <VideoSourcePhotosPanel
          mode={mode}
          sourcePhoto={sourcePhoto}
          referencePhotos={referencePhotos}
          onSourcePhotoChange={setSourcePhoto}
          onReferencePhotoChange={(index, value) =>
            setReferencePhotos((prev) =>
              prev.map((photo, i) => (i === index ? value : photo)),
            )
          }
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
            placeholder={videoPromptPlaceholders[mode]}
            className="box-border min-h-[88px] w-full resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-[13px] leading-relaxed text-text outline-none focus:border-zinc-400"
          />
          {improveError && (
            <p className="mt-2 text-[12px] text-red-600">{improveError}</p>
          )}
        </Card>

        <VideoFormatParamsPanel
          step={formatStep}
          aspectRatio={aspectRatio}
          duration={duration}
          onAspectRatioChange={setAspectRatio}
          onDurationChange={setDuration}
          disabled={generating}
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
          {generating ? "Генерация…" : "Сгенерировать видео"}
        </button>

        <VideoSidebarStats
          creditsRemaining={creditsRemaining}
          mode={mode}
          duration={duration}
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
        </div>

        {showProgress && !resultUrl ? (
          <GenerationProgressPanel
            progress={activeJob?.progress ?? 0}
            status={activeJob?.status ?? "preparing"}
            active={generating}
            empty={!generating}
          />
        ) : resultUrl ? (
          <div className="relative min-h-[360px] overflow-hidden rounded-lg bg-zinc-900">
            <ProtectedMediaVideo
              url={resultUrl}
              className="h-full min-h-[360px] w-full object-contain"
              controls
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

        <VideoGenerationHistory
          items={history}
          onSelect={loadFromHistory}
          onDelete={async (ids) => {
            try {
              await handleDeleteHistory(ids);
            } catch (err) {
              throw err;
            }
          }}
        />
      </Card>
    </div>
  );
}
