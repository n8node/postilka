"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { pollMAXOAuthStatus } from "@/lib/api";

export function MaxOAuthWaitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Сессия не найдена. Начните вход заново.");
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      while (!cancelled && attempts < 120) {
        attempts += 1;
        try {
          const data = await pollMAXOAuthStatus(token);
          if (data.deep_link) {
            setDeepLink(data.deep_link);
          }
          if (data.status === "completed" && data.redirect_url) {
            const path =
              data.redirect_url.replace(/^https?:\/\/[^/]+/, "").replace(/^\/app/, "") ||
              "/dashboard";
            router.replace(path);
            router.refresh();
            return;
          }
          if (data.status === "expired") {
            setError(data.error ?? "Сессия истекла. Попробуйте войти снова.");
            return;
          }
          if (data.status === "error") {
            setError(data.error ?? "Не удалось завершить вход через MAX.");
            return;
          }
        } catch {
          if (attempts > 5) {
            setError("Не удалось проверить статус входа.");
            return;
          }
        }
        await new Promise((r) => window.setTimeout(r, 2000));
      }
      if (!cancelled) {
        setError("Время ожидания истекло. Попробуйте войти снова.");
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-xl border border-slate-200 bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Вход через MAX</h1>
        <p className="mt-2 text-sm text-muted">
          Откройте MAX, перейдите к боту и нажмите «Запустить». Эта страница
          автоматически завершит вход.
        </p>
        {deepLink && (
          <a
            href={deepLink}
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
          >
            Открыть MAX
          </a>
        )}
        {!deepLink && !error && (
          <p className="mt-4 text-sm text-muted">Подготовка ссылки…</p>
        )}
        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/auth/login" className="text-accent hover:underline">
            Вернуться ко входу
          </Link>
        </p>
      </div>
    </main>
  );
}
