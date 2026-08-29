"use client";

import { useState } from "react";
import { ApiError, resendVerificationMe } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function EmailVerificationBanner() {
  const { user, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (user.email_verified_at) {
    return null;
  }

  async function handleResend() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await resendVerificationMe();
      setMessage(data.message);
      await refreshAuth();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось отправить письмо",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Подтвердите email <span className="font-medium">{user.email}</span>,
          чтобы публиковать посты, пополнять счёт и оплачивать тариф. Проверьте
          почту или запросите письмо повторно.
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={loading}
          className="shrink-0 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-950 disabled:opacity-60"
        >
          {loading ? "Отправка…" : "Отправить письмо повторно"}
        </button>
      </div>
      {message && <p className="mx-auto mt-2 max-w-5xl text-xs text-emerald-800">{message}</p>}
      {error && <p className="mx-auto mt-2 max-w-5xl text-xs text-red-700">{error}</p>}
    </div>
  );
}
