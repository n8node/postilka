export function centsToRubValue(cents: number | null | undefined): string {
  if (cents == null) return "";
  const rub = cents / 100;
  return Number.isInteger(rub) ? String(rub) : rub.toFixed(2).replace(/\.?0+$/, "");
}

export function parseRubToCents(raw: string): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function parseRubToCentsOrZero(raw: string): number {
  return parseRubToCents(raw) ?? 0;
}
