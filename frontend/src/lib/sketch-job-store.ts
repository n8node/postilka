"use client";

import { create } from "zustand";
import { refreshBillingBalances } from "@/lib/billing-balances-store";
import { useGenerationCreditsStore } from "@/lib/generation-credits-store";
import { addSketchGeneration, type SketchGenerationItem } from "@/lib/sketch-saves";

export type SketchMediaKind = "image" | "video";

type SketchJobState = {
  jobId: string | null;
  mediaKind: SketchMediaKind | null;
  running: boolean;
  startedAt: number | null;
  error: string | null;
  resultUrl: string | null;
  resultIsVideo: boolean;
  resultGenerationId: string | null;
  resultThumbUrl: string | null;
  sketchId: string | null;
  workspaceId: string | null;
  progress: number;
  status: string;
  pollSerial: number;
  completionSeq: number;
  markStarting: () => void;
  patchJob: (progress: number, status: string) => void;
  beginJob: (input: {
    jobId: string;
    mediaKind: SketchMediaKind;
    startedAt: number;
    sketchId: string | null;
    workspaceId: string;
  }) => void;
  completeJob: (input: {
    url: string;
    thumbUrl?: string;
    generationId: string;
    isVideo: boolean;
    createdAt?: string;
    creditsRemaining?: number | null;
  }) => void;
  failJob: (message: string) => void;
  setError: (message: string | null) => void;
  clearError: () => void;
  clearResult: () => void;
};

const initialRun = {
  jobId: null as string | null,
  mediaKind: null as SketchMediaKind | null,
  running: false,
  startedAt: null as number | null,
  error: null as string | null,
  resultUrl: null as string | null,
  resultIsVideo: false,
  resultGenerationId: null as string | null,
  resultThumbUrl: null as string | null,
  sketchId: null as string | null,
  workspaceId: null as string | null,
  progress: 0,
  status: "preparing",
};

export const useSketchJobStore = create<SketchJobState>((set, get) => ({
  ...initialRun,
  pollSerial: 0,
  completionSeq: 0,

  markStarting: () =>
    set((s) => {
      if (s.running) return s;
      return {
        ...initialRun,
        running: true,
        startedAt: Date.now(),
        pollSerial: s.pollSerial + 1,
        completionSeq: s.completionSeq,
      };
    }),

  beginJob: ({ jobId, mediaKind, startedAt, sketchId, workspaceId }) =>
    set((s) => ({
      ...initialRun,
      jobId,
      mediaKind,
      running: true,
      startedAt,
      sketchId,
      workspaceId,
      progress: 0,
      status: "preparing",
      pollSerial: s.pollSerial + 1,
      completionSeq: s.completionSeq,
    })),

  patchJob: (progress, status) =>
    set((s) => (s.running && s.jobId ? { progress, status } : {})),

  completeJob: ({ url, thumbUrl, generationId, isVideo, createdAt, creditsRemaining }) => {
    const current = get();
    if (!current.running) return;

    if (creditsRemaining !== undefined) {
      useGenerationCreditsStore.getState().setCreditsRemaining(creditsRemaining);
    }
    void refreshBillingBalances().catch(() => undefined);

    if (current.workspaceId && current.sketchId) {
      const item: SketchGenerationItem = {
        id: generationId,
        url,
        thumbUrl,
        isVideo,
        createdAt: createdAt || new Date().toISOString(),
      };
      addSketchGeneration(current.workspaceId, current.sketchId, item);
    }

    set((s) => ({
      running: false,
      startedAt: null,
      error: null,
      resultUrl: url,
      resultIsVideo: isVideo,
      resultGenerationId: generationId,
      resultThumbUrl: thumbUrl ?? null,
      completionSeq: s.completionSeq + 1,
    }));
  },

  failJob: (message) => {
    if (!get().running && !get().jobId) return;
    set({
      running: false,
      startedAt: null,
      error: message,
      jobId: null,
      mediaKind: null,
    });
  },

  setError: (message) => set({ error: message }),

  clearError: () => set({ error: null }),

  clearResult: () =>
    set({
      resultUrl: null,
      resultIsVideo: false,
      resultGenerationId: null,
      resultThumbUrl: null,
    }),
}));
