"use client";

import { FormEvent, useState } from "react";
import { ApiError, changeEmail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PasswordField } from "@/components/auth/PasswordField";

export function ChangeEmailForm() {
  const { user, refreshAuth } = useAuth();
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const data = await changeEmail(email, password);
      setSuccess(data.message);
      setPassword("");
      await refreshAuth();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сменить email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
      <div>
        <label htmlFor="new-email" className="mb-1.5 block text-xs font-medium">
          Новый email
        </label>
        <input
          id="new-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
        />
      </div>
      <PasswordField
        id="change-email-password"
        label="Текущий пароль"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
      >
        {loading ? "Сохранение…" : "Сменить email"}
      </button>
    </form>
  );
}
