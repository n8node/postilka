export function formatGenerationDuration(ms: number): string {
  if (ms <= 0) return "—";
  const totalSec = Math.max(1, Math.round(ms / 1000));
  if (totalSec < 60) {
    return `${totalSec} с`;
  }
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (sec === 0) {
    return `${min} мин`;
  }
  return `${min} мин ${sec} с`;
}

export function formatMediaCreditCost(cost: number): string {
  const n = Math.max(0, cost);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${n} кредит`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${n} кредита`;
  }
  return `${n} кредитов`;
}

export type GenerationCostAvailability = {
  creditCost: number;
  walletCostRub: number;
  availableCredits: number | null;
  walletBalanceCents: number;
  unlimitedCredits?: boolean;
};

/**
 * Shows the payment source that will be used first by the billing service.
 * Credits are intentionally shown instead of a combined credits/rubles value.
 */
export function formatGenerationCost({
  creditCost,
  walletCostRub,
  availableCredits,
  walletBalanceCents,
  unlimitedCredits = false,
}: GenerationCostAvailability): string {
  if (unlimitedCredits || availableCredits == null || availableCredits > 0) {
    return formatMediaCreditCost(creditCost);
  }
  if (walletBalanceCents > 0 && walletCostRub > 0) {
    return `${formatRubAmount(walletCostRub)} ₽`;
  }
  return "Пополните баланс";
}

function formatRubAmount(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(Math.max(0, value));
}
