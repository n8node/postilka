"use client";

import { useEffect, useState } from "react";

type Health = {
  status: string;
  version: string;
  postgres: string;
};

export default function HomePage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "/app/api/v1";
    fetch(`${apiBase}/health`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json() as Promise<Health>;
      })
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted">
          Postilka
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Автопостинг и календарь публикаций
        </h1>
        <p className="mt-3 text-muted">
          Каркас приложения подключён. Дальше — auth, каналы, планировщик.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-medium text-muted">Backend API</h2>
        {health && (
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Статус</dt>
              <dd className="font-medium">{health.status}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Версия</dt>
              <dd>{health.version}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">PostgreSQL</dt>
              <dd>{health.postgres}</dd>
            </div>
          </dl>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-600">
            Не удалось связаться с API: {error}
          </p>
        )}
        {!health && !error && (
          <p className="mt-3 text-sm text-muted">Проверяем API…</p>
        )}
      </section>

      <p className="text-sm text-muted">
        Маркетинговый сайт — на{" "}
        <a
          href={
            process.env.NEXT_PUBLIC_SITE_URL ??
            "https://postilka.ru"
          }
          className="text-accent underline-offset-2 hover:underline"
        >
          главной (WordPress)
        </a>
        .
      </p>
    </main>
  );
}
