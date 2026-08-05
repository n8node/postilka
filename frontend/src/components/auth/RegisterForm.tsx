"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ApiError,
  fetchAuthMethods,
  register,
  verifyInviteCode,
} from "@/lib/api";
import {
  checkPasswordRules,
  isPasswordValid,
  validatePassword,
} from "@/lib/password-policy";
import { PasswordField } from "@/components/auth/PasswordField";

function privacyPolicyUrl() {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://postilka.ru";
  const custom = process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL;
  if (custom) return custom;
  return `${site}/privacy-policy`;
}

function publicInviteKeysUrl() {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://postilka.ru";
  return `${site}/app/invite-keys`;
}

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [inviteEnabled, setInviteEnabled] = useState(false);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteVerifiedCode, setInviteVerifiedCode] = useState("");
  const [checkingInvite, setCheckingInvite] = useState(false);

  useEffect(() => {
    fetchAuthMethods()
      .then((data) => setInviteEnabled(data.invite_registration_enabled))
      .catch(() => setInviteEnabled(false))
      .finally(() => setMethodsLoading(false));
  }, []);

  const rules = useMemo(() => checkPasswordRules(password), [password]);
  const passwordOk = isPasswordValid(rules);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const inviteStepDone = !inviteEnabled || inviteVerifiedCode.length > 0;
  const canSubmit = inviteStepDone && passwordOk && passwordsMatch && policyAccepted;

  async function handleVerifyInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCheckingInvite(true);
    try {
      const data = await verifyInviteCode(inviteCodeInput);
      if (data.invite_code) {
        setInviteVerifiedCode(data.invite_code);
        setInviteCodeInput(data.invite_code);
      } else {
        setInviteVerifiedCode(inviteCodeInput.trim());
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось проверить инвайт",
      );
    } finally {
      setCheckingInvite(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (inviteEnabled && !inviteVerifiedCode) {
      setError("Сначала активируйте регистрацию по инвайт-ключу");
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
    if (!policyAccepted) {
      setError("Необходимо согласие с политикой обработки персональных данных");
      return;
    }

    setLoading(true);
    try {
      await register(
        email,
        password,
        undefined,
        inviteEnabled ? inviteVerifiedCode : undefined,
      );
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось зарегистрироваться",
      );
    } finally {
      setLoading(false);
    }
  }

  if (methodsLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted">Загрузка…</div>
    );
  }

  if (inviteEnabled && !inviteVerifiedCode) {
    return (
      <form onSubmit={handleVerifyInvite} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Регистрация доступна только по инвайт-ключу. Введите ключ, чтобы
          продолжить.
        </div>

        <div>
          <label
            htmlFor="invite-code"
            className="mb-1.5 block text-xs font-medium"
          >
            Инвайт-ключ
          </label>
          <input
            id="invite-code"
            type="text"
            autoComplete="off"
            required
            value={inviteCodeInput}
            onChange={(e) => setInviteCodeInput(e.target.value)}
            placeholder="Postilka_XXXXXXXXXXXX"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <p className="mt-2 text-xs text-muted">
            Нет инвайт-ключа? Посмотрите активные ключи на{" "}
            <Link
              href="/invite-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {publicInviteKeysUrl().replace(/^https?:\/\//, "")}
            </Link>
            .
          </p>
        </div>

        <button
          type="submit"
          disabled={checkingInvite || !inviteCodeInput.trim()}
          className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {checkingInvite ? "Проверка…" : "Продолжить"}
        </button>

        <p className="text-center text-sm text-muted">
          Уже есть аккаунт?{" "}
          <Link href="/auth/login" className="text-accent hover:underline">
            Войти
          </Link>
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {inviteEnabled && inviteVerifiedCode && (
        <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span>
            Инвайт:{" "}
            <span className="font-mono">{inviteVerifiedCode}</span>
          </span>
          <button
            type="button"
            className="text-xs underline"
            onClick={() => {
              setInviteVerifiedCode("");
              setInviteCodeInput("");
            }}
          >
            Сменить
          </button>
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

      <PasswordField
        id="password"
        label="Пароль"
        value={password}
        onChange={setPassword}
        onGenerated={(pwd) => setConfirmPassword(pwd)}
        autoComplete="new-password"
        showStrength
        showRequirements
        allowGenerate
      />

      <PasswordField
        id="confirm-password"
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

      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={policyAccepted}
          onChange={(e) => setPolicyAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
          required
        />
        <span className="text-muted">
          Согласие с{" "}
          <Link
            href={privacyPolicyUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            политикой обработки персональных данных
          </Link>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !canSubmit}
        className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Регистрация…" : "Зарегистрироваться"}
      </button>

      <p className="text-center text-sm text-muted">
        Уже есть аккаунт?{" "}
        <Link href="/auth/login" className="text-accent hover:underline">
          Войти
        </Link>
      </p>
    </form>
  );
}
