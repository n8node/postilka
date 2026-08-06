"use client";

import { useState } from "react";
import { ApiError, resendVerification } from "@/lib/api";

type Props = {
  email: string;
};

export function CheckEmailResend({ email }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    if (!email) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await resendVerification(email);
      setMessage(data.message);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось отправить письмо",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleResend}
        disabled={loading || !email}
        className="inline-flex w-full items-center justify-center rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
      >
        {loading ? "Отправка…" : "Отправить письмо повторно"}
      </button>
    </div>
  );
}
