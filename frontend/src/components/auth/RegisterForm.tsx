"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, KeyRound } from "lucide-react";
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

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceInviteToken =
    searchParams.get("workspace_invite_token")?.trim() ?? "";
  const nextPath = searchParams.get("next")?.trim() ?? "";
  const isWorkspaceInviteRegistration = workspaceInviteToken.length > 0;

  const [email, setEmail] = useState(searchParams.get("email")?.trim() ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [inviteEnabled, setInviteEnabled] = useState(false);
  const [approvalEnabled, setApprovalEnabled] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<"choice" | "invite" | "application">("choice");
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteVerifiedCode, setInviteVerifiedCode] = useState("");
  const [checkingInvite, setCheckingInvite] = useState(false);

  useEffect(() => {
    fetchAuthMethods()
      .then((data) => {
        setInviteEnabled(data.invite_registration_enabled);
        setApprovalEnabled(Boolean(data.registration_approval_enabled));
      })
      .catch(() => setInviteEnabled(false))
      .finally(() => setMethodsLoading(false));
  }, []);

  const rules = useMemo(() => checkPasswordRules(password), [password]);
  const passwordOk = isPasswordValid(rules);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const inviteStepDone =
    isWorkspaceInviteRegistration || !inviteEnabled || approvalEnabled || inviteVerifiedCode.length > 0;
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

    if (inviteEnabled && !approvalEnabled && !inviteVerifiedCode && !isWorkspaceInviteRegistration) {
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
      const result = await register(
        email,
        password,
        undefined,
        inviteEnabled && !isWorkspaceInviteRegistration
          ? inviteVerifiedCode
          : undefined,
        isWorkspaceInviteRegistration ? workspaceInviteToken : undefined,
      );
      if ("pending_approval" in result && result.pending_approval) {
        router.push("/auth/registration-pending?stage=verify-email");
      } else {
        router.push(nextPath || "/dashboard");
      }
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

  const canChooseRegistrationMode =
    inviteEnabled && approvalEnabled && !isWorkspaceInviteRegistration && !inviteVerifiedCode;
  const showInviteStep =
    inviteEnabled &&
    !isWorkspaceInviteRegistration &&
    !inviteVerifiedCode &&
    (!approvalEnabled || registrationMode === "invite");

  if (canChooseRegistrationMode && registrationMode === "choice") {
    return (
      <div className="space-y-4">
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">Выберите способ регистрации</p>
          <p className="mt-1 text-sm text-muted">Можно использовать инвайт-ключ или подать заявку на вступление.</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-accent/25 bg-accent/10">
          <div className="flex gap-3 px-4 py-3.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white"><KeyRound className="h-4 w-4" aria-hidden /></span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">У меня есть инвайт-ключ</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">Используйте готовый ключ и получите доступ после подтверждения email.</p>
            </div>
          </div>
          <Link href="/invite-keys" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 border-t border-accent/20 bg-white/70 px-4 py-2.5 text-sm font-semibold text-accent hover:bg-white">
            Смотреть активные ключи <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
          <button type="button" onClick={() => setRegistrationMode("invite")} className="w-full border-t border-accent/20 px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-white/60">Ввести инвайт-ключ</button>
        </div>
        <button type="button" onClick={() => setRegistrationMode("application")} className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-sm text-blue-900 hover:bg-blue-100">
          <span className="font-semibold">Подать заявку без инвайта</span>
          <span className="mt-1 block text-blue-800">Подтвердите email и дождитесь одобрения администратора.</span>
        </button>
      </div>
    );
  }

  if (canChooseRegistrationMode && registrationMode === "application") {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <p className="font-semibold">Заявка на вступление</p>
          <p className="mt-1 text-blue-800">
            Заполните форму ниже. После подтверждения email заявка попадёт на рассмотрение администратору.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setRegistrationMode("choice"); setError(""); }}
          className="text-sm text-accent hover:underline"
        >
          У меня есть инвайт-ключ
        </button>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium">Email</label>
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
        <PasswordField id="password" label="Пароль" value={password} onChange={setPassword} onGenerated={(pwd) => setConfirmPassword(pwd)} autoComplete="new-password" showStrength showRequirements allowGenerate />
        <PasswordField id="confirm-password" label="Подтвердите пароль" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
        <label className="flex items-start gap-2 text-xs text-muted">
          <input type="checkbox" checked={policyAccepted} onChange={(e) => setPolicyAccepted(e.target.checked)} className="mt-0.5 rounded border-slate-300" />
          <span>Согласие с <a href={privacyPolicyUrl()} target="_blank" rel="noreferrer" className="text-accent hover:underline">политикой обработки персональных данных</a></span>
        </label>
        <button type="submit" disabled={loading || !canSubmit} className="w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? "Отправка…" : "Подать заявку"}
        </button>
        <p className="text-center text-sm text-muted">Уже есть аккаунт? <Link href="/auth/login" className="text-accent hover:underline">Войти</Link></p>
      </form>
    );
  }

  if (showInviteStep) {
    return (
      <form onSubmit={handleVerifyInvite} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-accent/25 bg-accent/10">
          <div className="flex gap-3 px-4 py-3.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
              <KeyRound className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                Нет инвайт-ключа?
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Регистрация только по ключу. Откройте список активных, скопируйте
                свободный и вставьте его ниже.
              </p>
            </div>
          </div>
          <Link
            href="/invite-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 border-t border-accent/20 bg-white/70 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
          >
            Смотреть активные ключи
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
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

      {isWorkspaceInviteRegistration && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Регистрация по приглашению в воркфлоу. Email должен совпадать с
          приглашением.
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
          readOnly={isWorkspaceInviteRegistration}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 read-only:bg-slate-50 read-only:text-muted"
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
        <Link
          href={
            nextPath
              ? `/auth/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent(nextPath)}`
              : "/auth/login"
          }
          className="text-accent hover:underline"
        >
          Войти
        </Link>
      </p>
    </form>
  );
}
