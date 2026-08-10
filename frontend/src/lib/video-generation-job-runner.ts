"use client";

import {
  isVideoGenerationPagePath,
  useVideoGenerationJobStore,
} from "@/lib/video-generation-job-store";
import { pollVideoGenerationJob } from "@/lib/video-generation-api";
import { ApiError } from "@/lib/api";

let pollInFlight = false;

export function resumeVideoGenerationPoll() {
  const state = useVideoGenerationJobStore.getState();
  if (!state.running || !state.jobId || pollInFlight) return;

  const serial = state.pollSerial;
  pollInFlight = true;

  void pollVideoGenerationJob(state.jobId, (job) => {
    if (useVideoGenerationJobStore.getState().pollSerial !== serial) return;
    useVideoGenerationJobStore.getState().patchJob(job);
  })
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
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Не удалось получить статус генерации видео";
      useVideoGenerationJobStore.getState().failJob(message);
    })
    .finally(() => {
      pollInFlight = false;
    });
}

export async function refreshActiveVideoGenerationJob() {
  const state = useVideoGenerationJobStore.getState();
  if (!state.running || !state.jobId) return;
  resumeVideoGenerationPoll();
}
