"use client";

import { ApiError } from "@/lib/api";
import { pollGenerationJob } from "@/lib/generation-api";
import { mediaUrl } from "@/lib/media-display";
import { useSketchJobStore } from "@/lib/sketch-job-store";
import { pollVideoGenerationJob } from "@/lib/video-generation-api";

let pollInFlightSerial: number | null = null;

export function resumeSketchPoll() {
  const state = useSketchJobStore.getState();
  if (!state.running || !state.jobId || !state.mediaKind) return;
  if (pollInFlightSerial === state.pollSerial) return;

  const serial = state.pollSerial;
  const jobId = state.jobId;
  const mediaKind = state.mediaKind;
  pollInFlightSerial = serial;

  const stillCurrent = () => {
    const current = useSketchJobStore.getState();
    return current.pollSerial === serial && current.running && current.jobId === jobId;
  };

  const finishError = (message: string) => {
    if (!stillCurrent()) return;
    useSketchJobStore.getState().failJob(message);
  };

  const run =
    mediaKind === "video"
      ? pollVideoGenerationJob(jobId, () => undefined, {
          shouldContinue: stillCurrent,
        }).then((job) => {
          if (!stillCurrent()) return;
          if (job.status === "failed") {
            finishError(job.fail_message || "Ошибка генерации видео");
            return;
          }
          const gen = job.generation;
          if (!gen?.video_url && !gen?.image_url) {
            finishError("Сервис не вернул готовое видео");
            return;
          }
          useSketchJobStore.getState().completeJob({
            url: mediaUrl(gen.video_url || gen.image_url || ""),
            thumbUrl: gen.thumb_url ? mediaUrl(gen.thumb_url) : undefined,
            generationId: gen.id,
            isVideo: true,
            createdAt: gen.created_at,
          });
        })
      : pollGenerationJob(jobId, () => undefined).then((res) => {
          if (!stillCurrent()) return;
          if (res.job.status === "failed") {
            finishError(res.job.fail_message || "Ошибка генерации");
            return;
          }
          const gen = res.job.generation;
          if (!gen?.image_url) {
            finishError("Сервис не вернул готовое изображение");
            return;
          }
          useSketchJobStore.getState().completeJob({
            url: mediaUrl(gen.image_url),
            thumbUrl: gen.thumb_url ? mediaUrl(gen.thumb_url) : undefined,
            generationId: gen.id,
            isVideo: false,
            createdAt: gen.created_at,
            creditsRemaining: res.credits_remaining,
          });
        });

  void run
    .catch((err) => {
      if (!stillCurrent()) return;
      if (err instanceof Error && err.name === "AbortError") return;
      finishError(
        err instanceof ApiError ? err.message : "Не удалось сгенерировать",
      );
    })
    .finally(() => {
      if (pollInFlightSerial === serial) {
        pollInFlightSerial = null;
      }
    });
}

export function refreshActiveSketchJob() {
  const state = useSketchJobStore.getState();
  if (!state.running || !state.jobId) return;
  resumeSketchPoll();
}
