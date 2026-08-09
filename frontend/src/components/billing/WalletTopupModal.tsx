"use client";

import { Loader2, Wallet, X } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ApiError,
  billingWalletTopup,
  fetchBillingOverview,
  type BillingOverview,
} from "@/lib/api";

function formatRub(cents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

type WalletTopupModalProps = {
  open: boolean;
  onClose: () => void;
  onBalanceChange?: (cents: number) => void;
};

export function WalletTopupModal({
  open,
  onClose,
  onBalanceChange,
}: WalletTopupModalProps) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [amountRub, setAmountRub] = useState("500");

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError(null);
    fetchBillingOverview()
      .then((data) => {
        setOverview(data);
        onBalanceChange?.(data.wallet_balance_cents);
        const minRub = Math.ceil((data.wallet_topup_min_cents ?? 10000) / 100);
        setAmountRub(String(Math.max(minRub, 500)));
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Не удалось загрузить данные кошелька");
      })
      .finally(() => setLoading(false));
  }, [open, onBalanceChange]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleTopup() {
    const rub = Number(amountRub.replace(",", "."));
    if (!Number.isFinite(rub) || rub <= 0) {
      setError("Укажите сумму пополнения в рублях");
      return;
    }

    const amountCents = Math.round(rub * 100);
    const min = overview?.wallet_topup_min_cents ?? 10000;
    const max = overview?.wallet_topup_max_cents ?? 10_000_000;
    if (amountCents < min) {
      setError(`Минимальная сумма — ${formatRub(min)}`);
      return;
    }
    if (amountCents > max) {
      setError(`Максимальная сумма — ${formatRub(max)}`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await billingWalletTopup({ amount_cents: amountCents });
      window.location.href = result.checkout_url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось начать пополнение");
      setBusy(false);
    }
  }

  const minRub = overview ? Math.ceil(overview.wallet_topup_min_cents / 100) : 100;
  const maxRub = overview ? Math.floor(overview.wallet_topup_max_cents / 100) : 100_000;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-topup-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Wallet className="h-5 w-5" />
            </div>
            <h2 id="wallet-topup-title" className="text-lg font-semibold text-text">
              Пополнение кошелька
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted hover:bg-zinc-100 hover:text-text"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <p className="mt-6 text-sm text-muted">Загрузка…</p>
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Средства кошелька используются для AI-генерации (текст, изображения) при
              исчерпании квоты по тарифу workspace. Баланс кошелька не смешивается с
              оплатой подписки.
            </p>

            <div className="mt-5 rounded-lg border border-border bg-zinc-50 px-4 py-3">
              <p className="text-xs text-muted">Текущий баланс</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-text">
                {formatRub(overview?.wallet_balance_cents ?? 0)}
              </p>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            )}

            {!overview?.payments_enabled && (
              <p className="mt-4 text-sm text-amber-700">
                Оплата временно недоступна — обратитесь в поддержку.
              </p>
            )}

            <label className="mt-5 block text-sm">
              <span className="font-medium text-text">
                Сумма, ₽ <span className="text-red-600">*</span>
              </span>
              <input
                type="number"
                min={minRub}
                max={maxRub}
                value={amountRub}
                onChange={(e) => setAmountRub(e.target.value)}
                disabled={busy}
                className="mt-2 w-full rounded-md border border-border bg-bg px-3 py-2.5 text-sm"
              />
              <span className="mt-1 block text-xs text-muted">
                от {formatRub(overview?.wallet_topup_min_cents ?? 10000)} до{" "}
                {formatRub(overview?.wallet_topup_max_cents ?? 10_000_000)}
              </span>
            </label>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!overview?.payments_enabled || busy}
                onClick={() => void handleTopup()}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Пополнить
              </button>
              <Link
                href="/plans"
                onClick={onClose}
                className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:bg-zinc-50"
              >
                Тариф и кошелёк
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
