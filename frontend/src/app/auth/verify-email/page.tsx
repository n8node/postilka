"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ApiError, verifyEmail } from "@/lib/api";
import {
  clearPendingWorkspaceInvite,
  getPendingWorkspaceInvite,
} from "@/lib/workspace-invite-cookie";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const nextPath = searchParams.get("next")?.trim() ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(
    token ? "Подтверждаем email…" : "Ссылка недействительна",
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    verifyEmail(token)
      .then(() => {
        if (cancelled) return;
        setStatus("success");
        setMessage("Email подтверждён. Переходим…");

        const pendingInvite = getPendingWorkspaceInvite();
        if (pendingInvite) {
          clearPendingWorkspaceInvite();
          router.replace(
            `/auth/accept-invite?token=${encodeURIComponent(pendingInvite)}`,
          );
          router.refresh();
          return;
        }

        router.replace(nextPath || "/dashboard");
        router.refresh();
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          err instanceof ApiError
            ? err.message
            : "Не удалось подтвердить email",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token, nextPath, router]);

  return (
    <div className="rounded-xl border border-white/60 bg-surface/90 p-6 shadow-sm backdrop-blur-sm">
      {status === "loading" && (
        <p className="text-sm text-muted">{message}</p>
      )}

      {status === "success" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {message}
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/auth/login"
              className="inline-flex w-full items-center justify-center rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900"
            >
              Войти
            </Link>
            <Link
              href="/auth/register"
              className="text-center text-sm text-accent hover:underline"
            >
              Зарегистрироваться снова
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          Postilka
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Подтверждение email
        </h1>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">Загрузка…</p>}>
        <VerifyEmailContent />
      </Suspense>
    </main>
  );
}
