"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CabinetPage } from "@/components/layout/CabinetPage";
import { StubBadge } from "@/components/layout/StubBadge";
import { cn } from "@/lib/utils";

const fakeEvents = [
  { id: "1", day: 3, title: "Пост в Telegram", time: "10:00" },
  { id: "2", day: 5, title: "VK + Telegram", time: "14:30" },
  { id: "3", day: 12, title: "Анонс (черновик)", time: "—" },
];

export default function CalendarPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = fakeEvents.find((e) => e.id === selectedId) ?? null;
  const days = Array.from({ length: 28 }, (_, i) => i + 1);

  return (
    <div>
      <PageHeader
        title="Календарь"
        description="Планирование публикаций. Сетка-заглушка без реального расписания."
        actions={<StubBadge label="Волна 5" />}
      />

      <CabinetPage
        rightTitle={selected ? selected.title : undefined}
        onCloseRight={selected ? () => setSelectedId(null) : undefined}
        right={
          selected ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted">Время</p>
                <p className="font-medium">{selected.time}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Статус</p>
                <p className="font-medium">Заглушка</p>
              </div>
              <button
                type="button"
                disabled
                className="w-full rounded-md border border-border px-3 py-2 text-sm opacity-60"
              >
                Перенести
              </button>
            </div>
          ) : undefined
        }
      >
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Август 2026 · неделя / месяц (макет)</p>
            <StubBadge />
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
              <div key={d} className="py-1 font-medium">
                {d}
              </div>
            ))}
            {days.map((day) => {
              const events = fakeEvents.filter((e) => e.day === day);
              return (
                <div
                  key={day}
                  className="min-h-16 rounded-md border border-border bg-bg p-1 text-left"
                >
                  <span className="text-[11px] text-muted">{day}</span>
                  {events.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => setSelectedId(ev.id)}
                      className={cn(
                        "mt-0.5 block w-full truncate rounded px-1 py-0.5 text-[10px] text-left",
                        selectedId === ev.id
                          ? "bg-accent text-white"
                          : "bg-zinc-200 text-text hover:bg-zinc-300",
                      )}
                    >
                      {ev.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </CabinetPage>
    </div>
  );
}
