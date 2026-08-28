"use client";

import { useBillingBalancesStore } from "@/lib/billing-balances-store";
import { formatRubFromCents, formatRubPerCredit } from "@/lib/billing-format";

type MediaBalances = ReturnType<typeof useBillingBalancesStore.getState>["balances"];

export function mediaQuotaHeadline(
  balances: MediaBalances,
  creditsRemaining: number | null,
) {
  if (balances?.mediaUnlimited) return "∞ медиа тарифа";
  if (balances) {
    const remaining = balances.mediaQuotaRemaining ?? 0;
    return balances.mediaQuotaAllowance != null
      ? `Квота ${remaining} / ${balances.mediaQuotaAllowance}`
      : `Квота ${remaining}`;
  }
  if (creditsRemaining == null) return "∞ медиа тарифа";
  return `${creditsRemaining} медиа-кредитов осталось`;
}

export function MediaSpendHint({ creditsRemaining }: { creditsRemaining: number | null }) {
  const balances = useBillingBalancesStore((s) => s.balances);
  if (balances?.mediaUnlimited) {
    return "Медиа тарифа без лимита. Кошелёк не списывается.";
  }
  if (!balances) {
    return "Сначала квота тарифа, потом кошелёк в рублях.";
  }
  const quota =
    balances.mediaQuotaAllowance != null
      ? `${balances.mediaQuotaRemaining ?? 0} из ${balances.mediaQuotaAllowance}`
      : String(balances.mediaQuotaRemaining ?? creditsRemaining ?? 0);
  const rate = formatRubPerCredit(balances.kopecksPerCredit);
  return `Квота ${quota}${balances.mediaPurchased ? ` · пакеты ${balances.mediaPurchased}` : ""} · далее${rate ? ` ${rate}` : ""} с кошелька (${formatRubFromCents(balances.walletCents)})`;
}
