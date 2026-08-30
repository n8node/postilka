"use client";

import { create } from "zustand";
import { refreshBillingBalances } from "@/lib/billing-balances-store";
import type { GenerationJob } from "@/lib/generation-api";
import { useGenerationCreditsStore } from "@/lib/generation-credits-store";

export type GenerationCompleteToast = {
  id: string;
  imageUrl: string;
  generationId: string;
};

type GenerationJobState = {
  jobId: string | null;
  job: GenerationJob | null;
  running: boolean;
  startedAt: number | null;
  error: string | null;
  resultUrl: string | null;
  resultGenerationId: string | null;
  lastRun: { tokenCost: number; durationMs: number } | null;
  completionSeq: number;
  pollSerial: number;
  toasts: GenerationCompleteToast[];
  beginJob: (job: GenerationJob, startedAt: number) => void;
  patchJob: (job: GenerationJob) => void;
  completeJob: (input: {
    job: GenerationJob;
    creditsRemaining?: number | null;
    startedAt: number;
    showToast: boolean;
  }) => void;
  failJob: (message: string) => void;
  clearError: () => void;
  setResultFromHistory: (imageUrl: string, generationId: string) => void;
  clearResult: () => void;
  dismissToast: (id: string) => void;
  reset: () => void;
};

const initialRun = {
  jobId: null as string | null,
  job: null as GenerationJob | null,
  running: false,
  startedAt: null as number | null,
  error: null as string | null,
  resultUrl: null as string | null,
  resultGenerationId: null as string | null,
  lastRun: null as { tokenCost: number; durationMs: number } | null,
};

export function isGenerationPagePath(pathname: string): boolean {
  return pathname === "/ai" || pathname.startsWith("/ai/");
}

export const useGenerationJobStore = create<GenerationJobState>((set, get) => ({
  ...initialRun,
  completionSeq: 0,
  pollSerial: 0,
  toasts: [],

  beginJob: (job, startedAt) =>
    set((s) => ({
      ...initialRun,
      jobId: job.id,
      job,
      running: true,
      startedAt,
      pollSerial: s.pollSerial + 1,
      completionSeq: s.completionSeq,
      toasts: s.toasts,
    })),

  patchJob: (job) =>
    set((s) => (s.running && s.jobId === job.id ? { job } : {})),

  completeJob: ({ job, creditsRemaining, startedAt, showToast }) => {
    if (!get().running) return;

    const generation = job.generation;
    const durationMs = Date.now() - startedAt;
    const tokenCost = job.credit_cost ?? job.token_cost ?? 0;
    const toast: GenerationCompleteToast | null =
      showToast && generation
        ? {
            id: `gen-toast-${generation.id}-${Date.now()}`,
            imageUrl: generation.image_url,
            generationId: generation.id,
          }
        : null;

    if (creditsRemaining !== undefined) {
      useGenerationCreditsStore.getState().setCreditsRemaining(creditsRemaining);
    }
    void refreshBillingBalances().catch(() => undefined);

    set((s) => ({
      jobId: job.id,
      job,
      running: false,
      startedAt: null,
      error: null,
      resultUrl: generation?.image_url ?? null,
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
    set({
      running: false,
      startedAt: null,
      error: message,
      job: null,
      jobId: null,
    });
  },

  clearError: () => set({ error: null }),

  setResultFromHistory: (imageUrl, generationId) =>
    set({
      resultUrl: imageUrl,
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
}));
