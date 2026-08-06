"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ApiError, resetPassword } from "@/lib/api";
import {
  checkPasswordRules,
  isPasswordValid,
  validatePassword,
} from "@/lib/password-policy";
import { PasswordField } from "@/components/auth/PasswordField";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(token ? "" : "Ссылка недействительна");
  const [loading, setLoading] = useState(false);

  const rules = useMemo(() => checkPasswordRules(password), [password]);
  const passwordOk = isPasswordValid(rules);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = Boolean(token) && passwordOk && passwordsMatch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Ссылка недействительна");
      return;
    }

    const pwdErr = validatePassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Не удалось установить новый пароль",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
        <Link
          href="/auth/forgot-password"
          className="inline-flex w-full items-center justify-center rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900"
        >
          Запросить новую ссылку
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <p className="text-sm leading-relaxed text-muted">
        Придумайте новый пароль для входа в Postilka.
      </p>

      <PasswordField
        id="new-password"
        label="Новый пароль"
        value={password}
        onChange={setPassword}
        onGenerated={(pwd) => setConfirmPassword(pwd)}
        autoComplete="new-password"
        showStrength
        showRequirements
        allowGenerate
      />

      <PasswordField
        id="confirm-new-password"
        label="Подтвердите пароль"
        value={confirmPassword}
        onChange={setConfirmPassword}
        autoComplete="new-password"
        showStrength={false}
        showRequirements={false}
      />

      {confirmPassword.length > 0 && !passwordsMatch && (
        <p className="text-xs text-red-600">Пароли не совпадают</p>
      )}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Сохранение…" : "Сохранить пароль"}
      </button>

      <p className="text-center text-sm text-muted">
        <Link href="/auth/login" className="text-accent hover:underline">
          Вернуться ко входу
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Загрузка…</p>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
