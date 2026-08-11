"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Film, PenLine, Sparkles } from "lucide-react";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { ProtectedMediaVideo } from "@/components/media/ProtectedMediaVideo";
import { GenerationProgressPanel } from "@/components/generation/GenerationProgressPanel";
import { VideoExamplesStrip } from "@/components/generation/VideoExamplesStrip";
import { VideoFormatParamsPanel } from "@/components/generation/VideoFormatParamsPanel";
import { VideoGenerationCombinedHistory } from "@/components/generation/VideoGenerationCombinedHistory";
import { VideoSidebarStats } from "@/components/generation/VideoSidebarStats";
import { VideoSourcePhotosPanel } from "@/components/generation/VideoSourcePhotosPanel";
import { Card } from "@/components/ui/Card";
import { ApiError } from "@/lib/api";
import {
  deleteGenerationHistory,
  fetchGenerationHistory,
  improveGenerationPrompt,
} from "@/lib/generation-api";
import {
  hasMediaCredits,
  useGenerationCreditsStore,
  useMediaCreditsRemaining,
} from "@/lib/generation-credits-store";
import {
  toHistoryItem,
  type GenerationHistoryItem,
} from "@/lib/generation-data";
import {
  historyItemToUpload,
} from "@/lib/generation-history-drop";
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
  emptyReferenceImageSlots,
  emptyReferenceVideoSlots,
  filledReferenceCount,
  toVideoHistoryItem,
  videoGenerationModes,
  videoModeIcons,
  videoPromptPlaceholders,
  type VideoAspectRatioId,
  type VideoGenerationHistoryItem,
  type VideoGenerationModeId,
  type VideoGenerationUpload,
} from "@/lib/video-generation-data";
import { historyVideoItemToUpload } from "@/lib/video-history-drop";
import { cn } from "@/lib/utils";

export function VideoGenerationPageContent() {
  const router = useRouter();
  const [mode, setMode] = useState<VideoGenerationModeId>("text-to-video");
  const [prompt, setPrompt] = useState(defaultVideoPrompt);
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatioId>("16:9");
  const [duration, setDuration] = useState(5);
  const [improving, setImproving] = useState(false);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [history, setHistory] = useState<VideoGenerationHistoryItem[]>([]);
  const [photoHistory, setPhotoHistory] = useState<GenerationHistoryItem[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [photoHistoryError, setPhotoHistoryError] = useState<string | null>(null);
  const [previewIsImage, setPreviewIsImage] = useState(false);
  const creditsRemaining = useMediaCreditsRemaining();
  const setCreditsRemaining = useGenerationCreditsStore(
    (s) => s.setCreditsRemaining,
  );
  const [pricing, setPricing] = useState<VideoGenerationPricing | null>(null);
  const [, setElapsedTick] = useState(0);
  const [firstFrame, setFirstFrame] = useState<VideoGenerationUpload | null>(null);
  const [lastFrame, setLastFrame] = useState<VideoGenerationUpload | null>(null);
  const [referenceImages, setReferenceImages] = useState<
    (VideoGenerationUpload | null)[]
  >(() => emptyReferenceImageSlots());
  const [referenceVideos, setReferenceVideos] = useState<
    (VideoGenerationUpload | null)[]
  >(() => emptyReferenceVideoSlots());
  const [referenceAudios, setReferenceAudios] = useState<VideoGenerationUpload[]>([]);
  const [historyDragActive, setHistoryDragActive] = useState(false);

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

  const loadPhotoHistory = useCallback(async () => {
    try {
      const { items } = await fetchGenerationHistory();
      setPhotoHistory(items.map(toHistoryItem));
      setPhotoHistoryError(null);
    } catch (err) {
      setPhotoHistory([]);
      setPhotoHistoryError(
        err instanceof ApiError ? err.message : "Не удалось загрузить историю фото",
      );
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const { items } = await fetchVideoGenerationHistory();
      setHistory(items.map(toVideoHistoryItem));
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
    void loadPhotoHistory();
    void loadPricing();
  }, [loadHistory, loadPhotoHistory, loadPricing]);

  useEffect(() => {
    if (completionSeq === 0) return;
    setPreviewIsImage(false);
    void loadHistory();
    void loadPhotoHistory();
    void loadPricing();
  }, [completionSeq, loadHistory, loadPhotoHistory, loadPricing]);

  useEffect(() => {
    if (!generating) return;
    const id = window.setInterval(() => setElapsedTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [generating]);

  useEffect(() => {
    if (!pricing) return;
    setDuration(defaultDurationForMode(pricing, mode));
  }, [mode, pricing]);

  const costInput = useMemo(
    () => ({
      firstFrame,
      lastFrame,
      referenceImages,
      referenceVideos,
    }),
    [firstFrame, lastFrame, referenceImages, referenceVideos],
  );

  const canGenerate = useMemo(() => {
    if (!prompt.trim() || generating || !hasMediaCredits(creditsRemaining)) {
      return false;
    }
    if (mode === "image-to-video") {
      return Boolean(firstFrame || lastFrame);
    }
    if (mode === "reference-to-video") {
      return (
        filledReferenceCount(referenceImages) > 0 ||
        filledReferenceCount(referenceVideos) > 0
      );
    }
    return true;
  }, [
    prompt,
    generating,
    creditsRemaining,
    mode,
    firstFrame,
    lastFrame,
    referenceImages,
    referenceVideos,
  ]);

  const handleModeChange = (nextMode: VideoGenerationModeId) => {
    if (generating) return;
    setMode(nextMode);
    setFirstFrame(null);
    setLastFrame(null);
    setReferenceImages(emptyReferenceImageSlots());
    setReferenceVideos(emptyReferenceVideoSlots());
    setReferenceAudios([]);
    clearResult();
    clearError();
    setPreviewIsImage(false);
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
        source_upload_id: firstFrame?.uploadId,
        last_frame_upload_id: lastFrame?.uploadId,
        reference_upload_ids: referenceImages
          .filter((item): item is VideoGenerationUpload => item !== null)
          .map((p) => p.uploadId),
        reference_video_upload_ids: referenceVideos
          .filter((item): item is VideoGenerationUpload => item !== null)
          .map((p) => p.uploadId),
        reference_audio_upload_ids: referenceAudios.map((p) => p.uploadId),
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

  const loadFromVideoHistory = (item: VideoGenerationHistoryItem) => {
    setPreviewIsImage(false);
    setResultFromHistory(item.videoUrl, item.id);
    setPrompt(item.prompt);
    if (item.aspectRatio) {
      setAspectRatio(item.aspectRatio as VideoAspectRatioId);
    }
    if (item.videoDurationSeconds) {
      setDuration(item.videoDurationSeconds);
    }
  };

  const loadFromPhotoHistory = (item: GenerationHistoryItem) => {
    setPreviewIsImage(true);
    setResultFromHistory(item.imageUrl, item.id);
    setPrompt(item.prompt);
  };

  const makePost = () => {
    if (!resultGenerationId) return;
    router.push(`/posts?generation=${encodeURIComponent(resultGenerationId)}`);
  };

  const handleDeleteHistory = useCallback(
    async (ids: string[]) => {
      const res = await deleteVideoGenerationHistory(ids);
      const removed = new Set(res.deleted_ids);
      setHistory((prev) => prev.filter((h) => !removed.has(h.id)));
      if (resultGenerationId && removed.has(resultGenerationId)) {
        clearResult();
        setPreviewIsImage(false);
      }
    },
    [resultGenerationId, clearResult],
  );

  const handleDeletePhotoHistory = useCallback(
    async (ids: string[]) => {
      const res = await deleteGenerationHistory(ids);
      const removed = new Set(res.deleted_ids);
      setPhotoHistory((prev) => prev.filter((h) => !removed.has(h.id)));
      if (resultGenerationId && removed.has(resultGenerationId)) {
        clearResult();
        setPreviewIsImage(false);
      }
    },
    [resultGenerationId, clearResult],
  );

  const canDragPhotos =
    mode === "reference-to-video" || mode === "image-to-video";
  const canDragVideos = mode === "reference-to-video";

  const handleHistoryPhotoDrop = useCallback(
    async (
      item: GenerationHistoryItem,
      target:
        | { kind: "first" }
        | { kind: "last" }
        | { kind: "ref-image"; slot: number },
    ) => {
      const upload = await historyItemToUpload(item);
      const videoUpload: VideoGenerationUpload = {
        uploadId: upload.uploadId,
        previewUrl: upload.previewUrl,
        mediaKind: "image",
      };

      if (target.kind === "first") {
        setFirstFrame(videoUpload);
      } else if (target.kind === "last") {
        setLastFrame(videoUpload);
      } else {
        setReferenceImages((prev) =>
          prev.map((value, index) =>
            index === target.slot ? videoUpload : value,
          ),
        );
      }
      setHistoryDragActive(false);
    },
    [],
  );

  const handleHistoryVideoDrop = useCallback(
    async (item: VideoGenerationHistoryItem, slot: number) => {
      const upload = await historyVideoItemToUpload(item);
      setReferenceVideos((prev) =>
        prev.map((value, index) => (index === slot ? upload : value)),
      );
      setHistoryDragActive(false);
    },
    [],
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
          firstFrame={firstFrame}
          lastFrame={lastFrame}
          referenceImages={referenceImages}
          referenceVideos={referenceVideos}
          referenceAudios={referenceAudios}
          historyDragActive={historyDragActive}
          onFirstFrameChange={setFirstFrame}
          onLastFrameChange={setLastFrame}
          onReferenceImagesChange={setReferenceImages}
          onReferenceVideosChange={setReferenceVideos}
          onReferenceAudiosChange={setReferenceAudios}
          onHistoryVideoDrop={handleHistoryVideoDrop}
          onHistoryPhotoDrop={handleHistoryPhotoDrop}
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
          <Film size={16} />
          {generating ? "Генерация…" : "Сгенерировать видео"}
        </button>

        <VideoSidebarStats
          creditsRemaining={creditsRemaining}
          mode={mode}
          duration={duration}
          pricing={pricing}
          costInput={costInput}
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
            variant="video"
          />
        ) : resultUrl ? (
          <div
            className={cn(
              "relative min-h-[360px] overflow-hidden rounded-lg",
              previewIsImage ? "bg-zinc-50" : "bg-zinc-900",
            )}
          >
            {previewIsImage ? (
              <ProtectedMediaImage
                url={resultUrl}
                alt="Результат генерации"
                className="h-full min-h-[360px] w-full object-contain"
              />
            ) : (
              <ProtectedMediaVideo
                url={resultUrl}
                className="h-full min-h-[360px] w-full object-contain"
                controls
              />
            )}
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
            variant="video"
          />
        )}

        <VideoGenerationCombinedHistory
          photoItems={photoHistory}
          videoItems={history}
          photoLoadError={photoHistoryError}
          videoLoadError={historyError}
          canDragPhotos={canDragPhotos}
          canDragVideos={canDragVideos}
          onSelectPhoto={loadFromPhotoHistory}
          onSelectVideo={loadFromVideoHistory}
          onDragStart={() => setHistoryDragActive(true)}
          onDragEnd={() => setHistoryDragActive(false)}
          onDeletePhotos={async (ids) => {
            try {
              await handleDeletePhotoHistory(ids);
            } catch (err) {
              throw err;
            }
          }}
          onDeleteVideos={async (ids) => {
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
