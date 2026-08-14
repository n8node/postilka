"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApiError, fetchChannels, type ChannelListItem } from "@/lib/api";
import {
  createMission,
  fetchAgentTemplates,
  MISSION_METRIC_LABEL,
  type AgentTemplate,
  type MissionMetric,
} from "@/lib/missions-api";
import { cn } from "@/lib/utils";

export function NewMissionPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [channels, setChannels] = useState<ChannelListItem[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [metric, setMetric] = useState<MissionMetric>("clicks");
  const [target, setTarget] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [channelIds, setChannelIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchAgentTemplates(), fetchChannels()])
      .then(([t, ch]) => {
        setTemplates(t.items);
        setChannels(ch.items);
        const first = t.items[0];
        if (first) {
          setTemplateId(first.id);
          if (first.settings.default_metric) {
            setMetric(first.settings.default_metric as MissionMetric);
          }
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Не удалось загрузить данные"))
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const mission = await createMission({
        agent_template_id: templateId,
        title: title.trim(),
        goal: goal.trim(),
        metric,
        metric_target: target ? Number(target) : null,
        channel_ids: channelIds,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        frequency: frequency.trim(),
      });
      router.push(`/missions/${mission.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать задачу");
      setBusy(false);
    }
  }

  function toggleChannel(id: string) {
    setChannelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Новая задача продвижения"
        crumbs={[
          { label: "Главная", href: "/dashboard" },
          { label: "Задачи продвижения", href: "/missions" },
          { label: "Новая" },
        ]}
        description="Короткая форма задаёт рамку. Дальше агент уточнит детали в чате."
      />

      <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        ) : null}

        <section>
          <h2 className="mb-2 text-sm font-semibold">Агент</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left",
                  templateId === t.id ? "border-accent bg-accent/5" : "border-border bg-surface",
                )}
              >
                <p className="text-sm font-medium">{t.name}</p>
                <p className="mt-1 text-xs text-muted">{t.description || (t.kind === "system" ? "Системный" : "Ваш шаблон")}</p>
              </button>
            ))}
          </div>
        </section>

        <label className="block text-sm">
          Название
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            placeholder="Например: Запуск лендинга в Telegram"
          />
        </label>

        <label className="block text-sm">
          Цель
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            placeholder="Что должно получиться и зачем"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Показатель
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MissionMetric)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            >
              {(Object.keys(MISSION_METRIC_LABEL) as MissionMetric[]).map((key) => (
                <option key={key} value={key}>
                  {MISSION_METRIC_LABEL[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Целевое значение
            <input
              type="number"
              min={0}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Необязательно"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            Старт
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Срок
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Частота
            <input
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
              placeholder="3 поста в неделю"
            />
          </label>
        </div>

        <section>
          <h2 className="mb-2 text-sm font-semibold">Каналы</h2>
          {channels.length === 0 ? (
            <p className="text-sm text-muted">Подключите каналы — агент будет публиковать только в них.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => toggleChannel(ch.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs",
                    channelIds.includes(ch.id)
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted",
                  )}
                >
                  {ch.name}
                </button>
              ))}
            </div>
          )}
        </section>

        <button
          type="submit"
          disabled={busy || !templateId || !title.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Запустить агента
        </button>
      </form>
    </div>
  );
}
