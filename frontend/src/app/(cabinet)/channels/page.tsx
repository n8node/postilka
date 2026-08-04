"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CabinetPage } from "@/components/layout/CabinetPage";
import { EmptyState } from "@/components/layout/EmptyState";
import { StubBadge } from "@/components/layout/StubBadge";
import { cn } from "@/lib/utils";

type ChannelStub = {
  id: string;
  name: string;
  network: string;
  status: "active" | "expired" | "error";
};

const stubs: ChannelStub[] = [
  { id: "1", name: "Postilka News", network: "Telegram", status: "active" },
  { id: "2", name: "Бренд VK", network: "VK", status: "expired" },
];

const statusLabel = {
  active: "Активен",
  expired: "Токен истёк",
  error: "Ошибка",
} as const;

export default function ChannelsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(stubs[0]?.id ?? null);
  const selected = stubs.find((c) => c.id === selectedId) ?? null;

  return (
    <div>
      <PageHeader
        title="Каналы"
        description="Подключённые соцсети workspace. Сейчас — макет без OAuth."
        actions={
          <button
            type="button"
            disabled
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white opacity-60"
          >
            Подключить канал
          </button>
        }
      />

      <CabinetPage
        rightTitle={selected ? selected.name : undefined}
        onCloseRight={selected ? () => setSelectedId(null) : undefined}
        right={
          selected ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted">Сеть</p>
                <p className="font-medium">{selected.network}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Статус</p>
                <p className="font-medium">{statusLabel[selected.status]}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Capabilities</p>
                <p className="text-muted">Текст, фото, отложенная публикация — заглушка</p>
              </div>
              <button
                type="button"
                disabled
                className="w-full rounded-md border border-border px-3 py-2 text-sm opacity-60"
              >
                Переподключить
              </button>
              <StubBadge label="Волна 3" />
            </div>
          ) : undefined
        }
      >
        {stubs.length === 0 ? (
          <EmptyState
            title="Нет каналов"
            description="Подключите Telegram или VK, чтобы публиковать посты."
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-zinc-50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Канал</th>
                  <th className="px-4 py-3 font-medium">Сеть</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {stubs.map((ch) => (
                  <tr
                    key={ch.id}
                    onClick={() => setSelectedId(ch.id)}
                    className={cn(
                      "cursor-pointer border-b border-border last:border-0 hover:bg-zinc-50",
                      selectedId === ch.id && "bg-zinc-50",
                    )}
                  >
                    <td className="px-4 py-3 font-medium">{ch.name}</td>
                    <td className="px-4 py-3 text-muted">{ch.network}</td>
                    <td className="px-4 py-3">{statusLabel[ch.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CabinetPage>
    </div>
  );
}
