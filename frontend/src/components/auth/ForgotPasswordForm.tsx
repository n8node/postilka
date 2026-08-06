"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, forgotPassword } from "@/lib/api";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email);
      const params = new URLSearchParams({ email });
      router.push(`/auth/forgot-password/sent?${params.toString()}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Не удалось отправить письмо для восстановления пароля",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <p className="text-sm leading-relaxed text-muted">
        Укажите email аккаунта — мы отправим ссылку для установки нового пароля.
      </p>

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

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {loading ? "Отправка…" : "Отправить ссылку"}
      </button>

      <p className="text-center text-sm text-muted">
        <Link href="/auth/login" className="text-accent hover:underline">
          Вернуться ко входу
        </Link>
      </p>
    </form>
  );
}
