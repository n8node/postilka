"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CabinetPage } from "@/components/layout/CabinetPage";
import { EmptyState } from "@/components/layout/EmptyState";
import { StubBadge } from "@/components/layout/StubBadge";
import { cn } from "@/lib/utils";

const stubs = [
  { id: "1", name: "hero-cover.jpg", type: "image", size: "1.2 МБ" },
  { id: "2", name: "reel-draft.mp4", type: "video", size: "8.4 МБ" },
  { id: "3", name: "logo-square.png", type: "image", size: "240 КБ" },
];

export default function MediaPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = stubs.find((m) => m.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        title="Медиатека"
        description="Файлы workspace. Upload и S3 — в следующих волнах."
        actions={
          <>
            <StubBadge label="Волна 4" />
            <button
              type="button"
              disabled
              className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white opacity-60"
            >
              Загрузить
            </button>
          </>
        }
      />

      <CabinetPage
        rightTitle={selected?.name}
        onCloseRight={selected ? () => setSelectedId(null) : undefined}
        right={
          selected ? (
            <div className="space-y-3">
              <div className="aspect-square rounded-lg bg-zinc-100" />
              <div>
                <p className="text-xs text-muted">Тип</p>
                <p className="font-medium">{selected.type}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Размер</p>
                <p className="font-medium">{selected.size}</p>
              </div>
              <p className="text-xs text-muted">Использование в постах — заглушка</p>
            </div>
          ) : undefined
        }
      >
        {stubs.length === 0 ? (
          <EmptyState
            title="Медиатека пуста"
            description="Загрузите изображения и видео для постов."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stubs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "rounded-xl border border-border bg-surface p-3 text-left shadow-sm transition-colors hover:border-zinc-300",
                  selectedId === item.id && "border-accent ring-1 ring-accent/30",
                )}
              >
                <div className="mb-3 aspect-video rounded-lg bg-zinc-100" />
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted">
                  {item.type} · {item.size}
                </p>
              </button>
            ))}
          </div>
        )}
      </CabinetPage>
    </div>
  );
}
