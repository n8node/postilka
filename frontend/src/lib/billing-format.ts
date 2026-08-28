export function formatRubFromCents(cents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatTokenCount(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function formatPeriodEnd(value?: string) {
  if (!value) return "в конце периода";
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });
}

export function formatRubPerCredit(kopecks: number) {
  if (kopecks <= 0) return "";
  if (kopecks % 100 === 0) {
    return `${kopecks / 100} ₽`;
  }
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kopecks / 100);
}

export function walletLedgerLabel(entryType: string) {
  switch (entryType) {
    case "topup":
      return "Пополнение";
    case "admin_grant":
      return "Начисление";
    case "renew":
      return "Автопродление тарифа";
    case "ai_media_overage":
      return "AI, сверх квоты";
    default:
      return "Движение кошелька";
  }
}
