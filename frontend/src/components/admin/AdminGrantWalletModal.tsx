"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { ApiError, grantAdminUserWalletCredit, type AdminUser } from "@/lib/api";

function formatRub(cents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

type AdminGrantWalletModalProps = {
  user: AdminUser;
  open: boolean;
  onClose: () => void;
  onGranted: (userId: string, walletBalanceCents: number) => void;
};

export function AdminGrantWalletModal({
  user,
  open,
  onClose,
  onGranted,
}: AdminGrantWalletModalProps) {
  const [amountRub, setAmountRub] = useState("100");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmountRub("100");
    setNote("");
    setError(null);
  }, [open, user.id]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rub = Number.parseInt(amountRub, 10);
    if (!Number.isFinite(rub) || rub < 1 || rub > 100_000) {
      setError("Укажите сумму от 1 до 100 000 ₽");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await grantAdminUserWalletCredit(user.id, rub * 100, note);
      onGranted(user.id, res.wallet_balance_cents);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось начислить на кошелёк",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grant-wallet-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="grant-wallet-title"
              className="text-lg font-semibold text-slate-900"
            >
              Начислить на кошелёк
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Пользователь:{" "}
              <span className="font-medium text-slate-800">{user.email}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Текущий баланс: {formatRub(user.wallet_balance_cents ?? 0)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Средства добавятся на кошелёк пользователя и не сгорят в конце периода
          тарифа. Используются для overage AI после исчерпания квоты тарифа.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Сумма, ₽
            <input
              type="number"
              min={1}
              max={100_000}
              step={1}
              value={amountRub}
              onChange={(e) => setAmountRub(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Комментарий (необязательно)
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Причина начисления"
              maxLength={200}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Начисление…" : "Начислить"}
          </button>
        </form>
      </div>
    </div>
  );
}

function formatRubShort(cents: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export { formatRubShort as formatAdminWalletRub };
