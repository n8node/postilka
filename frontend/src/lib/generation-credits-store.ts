"use client";

import { create } from "zustand";
import { useBillingBalancesStore } from "@/lib/billing-balances-store";

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

/** Credits remaining, or a wallet that can still cover overage. */
export function hasMediaCredits(value: number | null): boolean {
  if (value == null || value > 0) return true;
  const balances = useBillingBalancesStore.getState().balances;
  if (!balances) return true;
  if (balances.mediaUnlimited) return true;
  return balances.walletCents > 0;
}
