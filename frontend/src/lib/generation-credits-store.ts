"use client";

import { create } from "zustand";

type GenerationCreditsState = {
  creditsRemaining: number | null;
  setCreditsRemaining: (value: number | null) => void;
  clear: () => void;
};

export const useGenerationCreditsStore = create<GenerationCreditsState>((set) => ({
  creditsRemaining: null,
  setCreditsRemaining: (value) => set({ creditsRemaining: value }),
  clear: () => set({ creditsRemaining: null }),
}));

/** null = unlimited or unknown; treat as allowed. */
export function useMediaCreditsRemaining(): number | null {
  return useGenerationCreditsStore((s) => s.creditsRemaining);
}

export function hasMediaCredits(value: number | null): boolean {
  return value == null || value > 0;
}
