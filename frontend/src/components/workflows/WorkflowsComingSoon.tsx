"use client";

import { GitBranch } from "lucide-react";

const WORKFLOWS_TELEGRAM_URL = "https://t.me/postilka_ai";

export function WorkflowsComingSoon() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/45 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-7 text-center shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflows-coming-soon-title"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <GitBranch className="h-6 w-6" />
        </div>
        <h1
          id="workflows-coming-soon-title"
          className="mt-5 text-xl font-semibold tracking-tight text-zinc-900"
        >
          Процессы уже в разработке
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Мы доводим раздел до готовности. Сообщим вам, когда он откроется, а новости опубликуем в нашем Telegram-канале.
        </p>
        <a
          href={WORKFLOWS_TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Следить за новостями в Telegram
        </a>
      </div>
    </div>
  );
}