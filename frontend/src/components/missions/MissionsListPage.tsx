"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Target } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { ApiError } from "@/lib/api";
import {
  fetchMissions,
  MISSION_METRIC_LABEL,
  MISSION_STATUS_LABEL,
  type Mission,
  type MissionStatus,
} from "@/lib/missions-api";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { id: MissionStatus | ""; label: string }[] = [
  { id: "", label: "Все" },
  { id: "running", label: "Запущенные" },
  { id: "pending_approval", label: "Ждут разрешения" },
  { id: "clarifying", label: "В работе" },
  { id: "completed", label: "Завершённые" },
];

export function MissionsListPage() {
  const [items, setItems] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<MissionStatus | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMissions({ status: status || undefined, limit: 50 });
      setItems(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить агентов");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Ai агенты"
        description="Агент ведёт от цели к ходу публикаций. Классический композер и календарь никуда не делись."
        actions={
          <Link
            href="/missions/new"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" />
            Новый агент
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((opt) => (
          <button
            key={opt.id || "all"}
            type="button"
            onClick={() => setStatus(opt.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              status === opt.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted hover:text-text",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Пока нет агентов"
          description="Запустите Ai агента или продолжайте публиковать вручную — оба пути равноправны."
          action={
            <Link
              href="/missions/new"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
            >
              <Target className="h-4 w-4" />
              Создать агента
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {items.map((m) => (
            <li key={m.id}>
              <Link
                href={`/missions/${m.id}`}
                className="block rounded-xl border border-border bg-surface px-4 py-3 transition hover:border-accent/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{m.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {m.template_name || "Агент"} · {MISSION_METRIC_LABEL[m.metric]}
                      {m.metric_target ? ` · цель ${m.metric_target}` : ""}
                      {m.post_count ? ` · ${m.post_count} пост.` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted/20 px-2 py-0.5 text-[11px] text-muted">
                    {MISSION_STATUS_LABEL[m.status]}
                  </span>
                </div>
                {m.goal ? <p className="mt-2 line-clamp-2 text-sm text-muted">{m.goal}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
