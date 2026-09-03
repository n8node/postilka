"use client";

import { FormEvent, useState } from "react";
import {
  ApiError,
  changeEmail,
  isPlaceholderLoginEmail,
  resendVerificationMe,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PasswordField } from "@/components/auth/PasswordField";

export function ChangeEmailForm({ embedded = false }: { embedded?: boolean }) {
  const { user, refreshAuth } = useAuth();
  const placeholder = isPlaceholderLoginEmail(user.email);
  const pendingEmail = user.pending_email?.trim() ?? "";
  const requirePassword = Boolean(user.has_password);
  const [email, setEmail] = useState(pendingEmail || (placeholder ? "" : user.email));
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const data = await changeEmail(email, requirePassword ? password : undefined);
      setSuccess(data.message);
      setPassword("");
      await refreshAuth();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : placeholder
            ? "Не удалось привязать email"
            : "Не удалось сменить email",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError("");
    setSuccess("");
    setResending(true);
    try {
      const data = await resendVerificationMe();
      setSuccess(data.message);
      await refreshAuth();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось отправить письмо",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={embedded ? "space-y-4" : "mt-4 space-y-4"}>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {success}
        </div>
      )}
      {pendingEmail && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p>
            Письмо отправлено на <span className="font-medium">{pendingEmail}</span>.
            Перейдите по ссылке, чтобы подтвердить адрес.
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="mt-2 text-xs font-medium underline underline-offset-2 hover:no-underline disabled:opacity-60"
          >
            {resending ? "Отправка…" : "Отправить письмо повторно"}
          </button>
        </div>
      )}
      <div>
        <label htmlFor="new-email" className="mb-1.5 block text-xs font-medium">
          {placeholder ? "Email" : "Новый email"}
        </label>
        <input
          id="new-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
        />
      </div>
      {requirePassword && (
        <PasswordField
          id="change-email-password"
          label="Текущий пароль"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
      >
        {loading
          ? "Сохранение…"
          : placeholder
            ? "Привязать email"
            : "Сменить email"}
      </button>
    </form>
  );
}
