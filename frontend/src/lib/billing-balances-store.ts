import { create } from "zustand";
import { fetchBillingOverview, type BillingOverview } from "@/lib/api";

export type BillingBalances = {
  walletCents: number;
  textRemaining: number;
  textAllowance: number | null;
  textUnlimited: boolean;
  textPeriodEnd?: string;
  mediaQuotaRemaining: number | null;
  mediaQuotaAllowance: number | null;
  mediaPurchased: number;
  mediaUnlimited: boolean;
  kopecksPerCredit: number;
  mediaPeriodEnd?: string;
};

type BillingBalancesState = {
  balances: BillingBalances | null;
  setFromOverview: (overview: BillingOverview) => void;
};

export function balancesFromOverview(overview: BillingOverview): BillingBalances {
  const text = overview.token_balance;
  const media = overview.media_balance;
  return {
    walletCents: overview.wallet_balance_cents ?? 0,
    textRemaining: text?.plan_tokens_remaining ?? 0,
    textAllowance: text?.plan_tokens_allowance ?? null,
    textUnlimited: Boolean(text?.unlimited),
    textPeriodEnd: text?.plan_period_end,
    mediaQuotaRemaining: media?.unlimited ? null : (media?.quota_remaining ?? 0),
    mediaQuotaAllowance: media?.quota_allowance ?? null,
    mediaPurchased: media?.purchased_remaining ?? 0,
    mediaUnlimited: Boolean(media?.unlimited),
    kopecksPerCredit: media?.kopecks_per_credit ?? 0,
    mediaPeriodEnd: media?.plan_period_end,
  };
}

export const useBillingBalancesStore = create<BillingBalancesState>((set) => ({
  balances: null,
  setFromOverview: (overview) => set({ balances: balancesFromOverview(overview) }),
}));

export async function refreshBillingBalances(): Promise<void> {
  const overview = await fetchBillingOverview();
  useBillingBalancesStore.getState().setFromOverview(overview);
}
