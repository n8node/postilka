"use client";

import { create } from "zustand";
import { refreshBillingBalances } from "@/lib/billing-balances-store";
import type { VideoGenerationJob } from "@/lib/video-generation-api";
import { useGenerationCreditsStore } from "@/lib/generation-credits-store";

export type VideoGenerationCompleteToast = {
  id: string;
  videoUrl: string;
  generationId: string;
};

type VideoGenerationJobState = {
  jobId: string | null;
  job: VideoGenerationJob | null;
  running: boolean;
  startedAt: number | null;
  error: string | null;
  resultUrl: string | null;
  resultGenerationId: string | null;
  lastRun: { tokenCost: number; durationMs: number } | null;
  completionSeq: number;
  pollSerial: number;
  toasts: VideoGenerationCompleteToast[];
  markStarting: () => void;
  beginJob: (job: VideoGenerationJob, startedAt: number) => void;
  patchJob: (job: VideoGenerationJob) => void;
  completeJob: (input: {
    job: VideoGenerationJob;
    creditsRemaining?: number | null;
    startedAt: number;
    showToast: boolean;
  }) => void;
  failJob: (message: string) => void;
  clearError: () => void;
  setResultFromHistory: (videoUrl: string, generationId: string) => void;
  clearResult: () => void;
  dismissToast: (id: string) => void;
  reset: () => void;
  restoreActiveJob: () => void;
};

const videoGenerationJobStorageKey = "postilka:active-video-generation-job";

const initialRun = {
  jobId: null as string | null,
  job: null as VideoGenerationJob | null,
  running: false,
  startedAt: null as number | null,
  error: null as string | null,
  resultUrl: null as string | null,
  resultGenerationId: null as string | null,
  lastRun: null as { tokenCost: number; durationMs: number } | null,
};

export function isVideoGenerationPagePath(pathname: string): boolean {
  return pathname === "/ai" || pathname.startsWith("/ai/");
}

export const useVideoGenerationJobStore = create<VideoGenerationJobState>(
  (set, get) => ({
    ...initialRun,
    completionSeq: 0,
    pollSerial: 0,
    toasts: [],

    markStarting: () =>
      set((s) => {
        if (s.running) return s;
        return {
          ...initialRun,
          running: true,
          startedAt: Date.now(),
          pollSerial: s.pollSerial + 1,
          completionSeq: s.completionSeq,
          toasts: s.toasts,
        };
      }),

    beginJob: (job, startedAt) =>
      set((s) => {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(videoGenerationJobStorageKey, JSON.stringify({ jobId: job.id, startedAt }));
        }
        return {
        ...initialRun,
        jobId: job.id,
        job,
        running: true,
        startedAt,
        pollSerial: s.pollSerial + 1,
        completionSeq: s.completionSeq,
        toasts: s.toasts,
        };
      }),

    patchJob: (job) =>
      set((s) => (s.running && s.jobId === job.id ? { job } : {})),

    completeJob: ({ job, creditsRemaining, startedAt, showToast }) => {
      const current = get();
      if (!current.running) return;
      if (current.jobId && current.jobId !== job.id) return;

      const generation = job.generation;
      const durationMs = Date.now() - startedAt;
      const tokenCost = job.credit_cost ?? job.token_cost ?? 0;
      const mediaUrl =
        generation?.video_url || generation?.image_url || null;
      const toast: VideoGenerationCompleteToast | null =
        showToast && generation && mediaUrl
          ? {
              id: `video-gen-toast-${generation.id}-${Date.now()}`,
              videoUrl: mediaUrl,
              generationId: generation.id,
            }
          : null;

      if (creditsRemaining !== undefined) {
        useGenerationCreditsStore
          .getState()
          .setCreditsRemaining(creditsRemaining);
      }
      void refreshBillingBalances().catch(() => undefined);

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(videoGenerationJobStorageKey);
      }

      set((s) => ({
        jobId: job.id,
        job,
        running: false,
        startedAt: null,
        error: null,
        resultUrl: mediaUrl,
        resultGenerationId: generation?.id ?? null,
        lastRun:
          tokenCost > 0 || durationMs > 0
            ? { tokenCost, durationMs }
            : s.lastRun,
        completionSeq: s.completionSeq + 1,
        toasts: toast ? [...s.toasts, toast] : s.toasts,
      }));
    },

    failJob: (message) => {
      if (!get().running && !get().jobId) return;
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(videoGenerationJobStorageKey);
      }
      set({
        running: false,
        startedAt: null,
        error: message,
        job: null,
        jobId: null,
      });
    },

    clearError: () => set({ error: null }),

    setResultFromHistory: (videoUrl, generationId) =>
      set({
        resultUrl: videoUrl,
        resultGenerationId: generationId,
        error: null,
      }),

    clearResult: () => set({ resultUrl: null, resultGenerationId: null }),

    dismissToast: (id) =>
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    reset: () =>
      set((s) => ({
        ...initialRun,
        completionSeq: s.completionSeq,
        pollSerial: s.pollSerial + 1,
        toasts: [],
      })),

    restoreActiveJob: () => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem(videoGenerationJobStorageKey);
        if (!raw) return;
        const saved = JSON.parse(raw) as { jobId?: string; startedAt?: number };
        if (!saved.jobId || !saved.startedAt) return;
        set((s) => ({ jobId: saved.jobId!, running: true, startedAt: saved.startedAt!, pollSerial: s.pollSerial + 1 }));
      } catch {
        window.localStorage.removeItem(videoGenerationJobStorageKey);
      }
    },
  }),
);
