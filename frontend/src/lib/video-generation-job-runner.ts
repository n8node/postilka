"use client";

import {
  isVideoGenerationPagePath,
  useVideoGenerationJobStore,
} from "@/lib/video-generation-job-store";
import { pollVideoGenerationJob } from "@/lib/video-generation-api";
import { ApiError } from "@/lib/api";

let pollInFlightSerial: number | null = null;

export function resumeVideoGenerationPoll() {
  const state = useVideoGenerationJobStore.getState();
  if (!state.running || !state.jobId) return;
  if (pollInFlightSerial === state.pollSerial) return;

  const serial = state.pollSerial;
  const jobId = state.jobId;
  pollInFlightSerial = serial;

  void pollVideoGenerationJob(
    jobId,
    (job) => {
      if (useVideoGenerationJobStore.getState().pollSerial !== serial) return;
      useVideoGenerationJobStore.getState().patchJob(job);
    },
    {
      shouldContinue: () => {
        const current = useVideoGenerationJobStore.getState();
        return (
          current.pollSerial === serial &&
          current.running &&
          current.jobId === jobId
        );
      },
    },
  )
    .then((job) => {
      if (useVideoGenerationJobStore.getState().pollSerial !== serial) return;
      const startedAt =
        useVideoGenerationJobStore.getState().startedAt ?? Date.now();
      if (job.status === "succeeded") {
        useVideoGenerationJobStore.getState().completeJob({
          job,
          startedAt,
          showToast: !isVideoGenerationPagePath(window.location.pathname),
        });
      } else {
        useVideoGenerationJobStore.getState().failJob(
          job.fail_message || "Генерация видео не удалась. Кредиты не списаны.",
        );
      }
    })
    .catch((err) => {
      if (useVideoGenerationJobStore.getState().pollSerial !== serial) return;
      if (err instanceof Error && err.name === "AbortError") return;
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Не удалось получить статус генерации видео";
      useVideoGenerationJobStore.getState().failJob(message);
    })
    .finally(() => {
      if (pollInFlightSerial === serial) {
        pollInFlightSerial = null;
      }
    });
}

export async function refreshActiveVideoGenerationJob() {
  const state = useVideoGenerationJobStore.getState();
  if (!state.running || !state.jobId) return;
  resumeVideoGenerationPoll();
}
