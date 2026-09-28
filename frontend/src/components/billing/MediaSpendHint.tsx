"use client";

import { useBillingBalancesStore } from "@/lib/billing-balances-store";

type MediaBalances = ReturnType<typeof useBillingBalancesStore.getState>["balances"];

export function mediaSpendSource(
  balances: MediaBalances,
  creditsRemaining: number | null,
  creditCost: number | null,
): string {
  if (creditCost == null || creditCost <= 0) return "Источник списания уточняется";
  if (balances?.mediaUnlimited) return "Из тарифа";

  const quota = Math.max(0, balances?.mediaQuotaRemaining ?? creditsRemaining ?? 0);
  const purchased = Math.max(0, balances?.mediaPurchased ?? 0);
  if (quota > 0) return "Из тарифа";
  if (purchased > 0) return "Из докупленных";

  const walletCents = balances?.walletCents ?? 0;
  const kopecksPerCredit = balances?.kopecksPerCredit ?? 0;
  if (walletCents > 0 && kopecksPerCredit > 0) {
    return "Из рублей";
  }
  return "Пополните баланс";
}
