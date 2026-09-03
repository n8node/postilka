"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  ApiError,
  isPlaceholderLoginEmail,
  resendVerificationMe,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function EmailVerificationBanner() {
  const { user, refreshAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingEmail = user.pending_email?.trim() ?? "";
  const placeholder = isPlaceholderLoginEmail(user.email);
  const verified = Boolean(user.email_verified_at);

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

  if (pendingEmail) {
    return (
      <BannerShell
        tone="warning"
        message={message}
        error={error}
        action={
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className="rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-950 disabled:opacity-60"
            >
              {loading ? "Отправка…" : "Отправить письмо повторно"}
            </button>
            <Link
              href="/settings?section=email"
              className="text-xs font-medium underline underline-offset-2 hover:no-underline"
            >
              Изменить адрес
            </Link>
          </div>
        }
      >
        Подтвердите email{" "}
        <span className="font-medium">{pendingEmail}</span>, чтобы получать
        уведомления на этот адрес. Проверьте почту или запросите письмо
        повторно.
      </BannerShell>
    );
  }

  if (placeholder) {
    return (
      <BannerShell
        tone="info"
        action={
          <Link
            href="/settings?section=email"
            className="shrink-0 rounded-md bg-sky-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-950"
          >
            Указать email
          </Link>
        }
      >
        Привяжите email, чтобы получать уведомления о публикациях, тарифе и
        поддержке. Сейчас вход через соцсеть — письма отправить некуда.
      </BannerShell>
    );
  }

  if (verified) {
    return null;
  }

  return (
    <BannerShell
      tone="warning"
      message={message}
      error={error}
      action={
        <button
          type="button"
          onClick={handleResend}
          disabled={loading}
          className="shrink-0 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-950 disabled:opacity-60"
        >
          {loading ? "Отправка…" : "Отправить письмо повторно"}
        </button>
      }
    >
      Подтвердите email <span className="font-medium">{user.email}</span>, чтобы
      публиковать посты, пополнять счёт и оплачивать тариф. Проверьте почту или
      запросите письмо повторно.
    </BannerShell>
  );
}

function BannerShell({
  tone,
  children,
  action,
  message,
  error,
}: {
  tone: "warning" | "info";
  children: ReactNode;
  action: ReactNode;
  message?: string | null;
  error?: string | null;
}) {
  const colors =
    tone === "info"
      ? "border-sky-200 bg-sky-50 text-sky-950"
      : "border-amber-200 bg-amber-50 text-amber-950";
  return (
    <div className={`border-b px-4 py-3 text-sm ${colors}`}>
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>{children}</p>
        {action}
      </div>
      {message && (
        <p className="mx-auto mt-2 max-w-5xl text-xs text-emerald-800">{message}</p>
      )}
      {error && (
        <p className="mx-auto mt-2 max-w-5xl text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
