"use client";

import { ApiError } from "@/lib/api";
import {
  isGenerationJobDone,
  pollGenerationJob,
} from "@/lib/generation-api";
import {
  isGenerationPagePath,
  useGenerationJobStore,
} from "@/lib/generation-job-store";

let pollInFlightSerial: number | null = null;

export function resumeGenerationPoll() {
  const state = useGenerationJobStore.getState();
  if (!state.running || !state.jobId) return;
  if (pollInFlightSerial === state.pollSerial) return;

  const serial = state.pollSerial;
  const jobId = state.jobId;
  const startedAt = state.startedAt ?? Date.now();
  pollInFlightSerial = serial;

  void pollGenerationJob(jobId, (job) => {
    const current = useGenerationJobStore.getState();
    if (current.pollSerial !== serial) return;
    current.patchJob(job);
  })
    .then((finished) => {
      const current = useGenerationJobStore.getState();
      if (current.pollSerial !== serial) return;

      if (finished.job.status === "failed") {
        current.failJob(
          finished.job.fail_message ||
            "Не удалось сгенерировать изображение. Кредиты не были списаны.",
        );
        return;
      }

      if (!finished.job.generation) {
        current.failJob(
          "Сервис не вернул готовое изображение. Кредиты не были списаны.",
        );
        return;
      }

      const pathname =
        typeof window !== "undefined" ? window.location.pathname : "";
      const showToast = !isGenerationPagePath(pathname);

      current.completeJob({
        job: finished.job,
        creditsRemaining: finished.credits_remaining,
        startedAt,
        showToast,
      });
    })
    .catch((err) => {
      const current = useGenerationJobStore.getState();
      if (current.pollSerial !== serial) return;
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Не удалось сгенерировать изображение. Кредиты не были списаны.";
      current.failJob(message);
    })
    .finally(() => {
      if (pollInFlightSerial === serial) {
        pollInFlightSerial = null;
      }
    });
}

/** Reconcile UI if the tab was backgrounded and job finished server-side. */
export async function refreshActiveGenerationJob() {
  const state = useGenerationJobStore.getState();
  if (!state.running || !state.jobId) return;

  const { fetchGenerationJob } = await import("@/lib/generation-api");
  try {
    const res = await fetchGenerationJob(state.jobId);
    state.patchJob(res.job);
    if (isGenerationJobDone(res.job)) {
      const pathname =
        typeof window !== "undefined" ? window.location.pathname : "";
      if (res.job.status === "failed") {
        state.failJob(
          res.job.fail_message ||
            "Не удалось сгенерировать изображение. Кредиты не были списаны.",
        );
        return;
      }
      if (!res.job.generation) {
        state.failJob(
          "Сервис не вернул готовое изображение. Кредиты не были списаны.",
        );
        return;
      }
      state.completeJob({
        job: res.job,
        creditsRemaining: res.credits_remaining,
        startedAt: state.startedAt ?? Date.now(),
        showToast: !isGenerationPagePath(pathname),
      });
    }
  } catch {
    // polling loop will retry
  }
}
