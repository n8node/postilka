"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CabinetPage } from "@/components/layout/CabinetPage";
import { StubBadge } from "@/components/layout/StubBadge";

export default function PostsPage() {
  const [text, setText] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  return (
    <div>
      <PageHeader
        title="Посты"
        description="Композер и черновики. Публикация появится в волне 4."
        actions={<StubBadge label="Волна 4" />}
      />

      <CabinetPage
        rightTitle="Превью"
        onCloseRight={() => setShowPreview(false)}
        right={
          showPreview ? (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Telegram · заглушка
              </p>
              <div className="rounded-lg border border-border bg-zinc-50 p-3 text-sm whitespace-pre-wrap">
                {text.trim() || "Текст поста появится здесь…"}
              </div>
              <p className="text-xs text-muted">
                Превью «как в сети» — позже, по capabilities провайдера.
              </p>
            </div>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {!showPreview && (
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="text-sm text-accent hover:underline"
            >
              Показать превью →
            </button>
          )}
          <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <label className="mb-2 block text-sm font-medium" htmlFor="post-body">
              Текст поста
            </label>
            <textarea
              id="post-body"
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Напишите текст… (только локальный макет, без сохранения)"
              className="w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white opacity-60"
              >
                Опубликовать
              </button>
              <button
                type="button"
                disabled
                className="rounded-md border border-border px-3 py-2 text-sm opacity-60"
              >
                В черновик
              </button>
              <button
                type="button"
                disabled
                className="rounded-md border border-border px-3 py-2 text-sm opacity-60"
              >
                Запланировать
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Черновики</h2>
            <p className="mt-2 text-sm text-muted">Пока пусто — список появится после API постов.</p>
          </div>
        </div>
      </CabinetPage>
    </div>
  );
}
