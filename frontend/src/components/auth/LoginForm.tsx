"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, login, resendVerification } from "@/lib/api";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const oauthError = searchParams.get("oauth_error");
  const [email, setEmail] = useState(searchParams.get("email")?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (oauthError) {
      setError("Не удалось войти через соцсеть. Попробуйте снова или используйте email.");
    }
  }, [oauthError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUnverifiedEmail("");
    setResendMessage("");
    setLoading(true);
    try {
      await login(email, password);
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "email_not_verified") {
        setUnverifiedEmail(email);
        setError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Не удалось войти");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!unverifiedEmail) return;
    setResending(true);
    setResendMessage("");
    try {
      const data = await resendVerification(unverifiedEmail);
      setResendMessage(data.message);
    } catch (err) {
      setResendMessage(
        err instanceof ApiError ? err.message : "Не удалось отправить письмо",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
          {unverifiedEmail && (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="text-sm font-medium text-accent hover:underline disabled:opacity-60"
              >
                {resending ? "Отправка…" : "Отправить письмо повторно"}
              </button>
              {resendMessage && (
                <p className="text-xs text-emerald-800">{resendMessage}</p>
              )}
            </div>
          )}
        </div>
      )}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-xs font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-xs font-medium">
            Пароль
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-accent hover:underline"
          >
            Забыли пароль?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Вход…" : "Войти"}
      </button>
      <SocialLoginButtons nextPath={nextPath} mode="login" />
      <p className="text-center text-sm text-muted">
        Нет аккаунта?{" "}
        <Link href="/auth/register" className="text-accent hover:underline">
          Регистрация
        </Link>
      </p>
    </form>
  );
}
