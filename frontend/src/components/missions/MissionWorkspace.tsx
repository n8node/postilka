"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApiError, fetchChannels, type ChannelListItem } from "@/lib/api";
import {
  approveMission,
  cancelMission,
  chatMission,
  completeMission,
  createMissionDrafts,
  fetchMission,
  MEASURABILITY_LABEL,
  MISSION_METRIC_LABEL,
  MISSION_ROLE_LABEL,
  MISSION_STATUS_LABEL,
  saveMissionAsTemplate,
  type Mission,
  type MissionMessage,
} from "@/lib/missions-api";
import type { Post } from "@/lib/posts-api";
import { postPreviewText } from "@/lib/posts-display";
import { cn } from "@/lib/utils";

export function MissionWorkspace({ missionId }: { missionId: string }) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [messages, setMessages] = useState<MissionMessage[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [channels, setChannels] = useState<ChannelListItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, ch] = await Promise.all([fetchMission(missionId), fetchChannels()]);
      setMission(detail.mission);
      setMessages(detail.messages || []);
      setPosts(detail.posts || []);
      setChannels(ch.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить задачу");
    } finally {
      setLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages.length]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setInput("");
    try {
      const res = await chatMission(missionId, text);
      setMission(res.mission);
      setMessages((prev) => [
        ...prev,
        { id: "tmp-user", workspace_id: "", mission_id: missionId, role: "user", content: text, created_at: new Date().toISOString() },
        res.reply,
      ]);
    } catch (err) {
      setInput(text);
      setError(err instanceof ApiError ? err.message : "Агент не ответил");
    } finally {
      setBusy(false);
    }
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Операция не выполнена");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !mission) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" />
        Загрузка…
      </div>
    );
  }
  if (!mission) {
    return <p className="text-sm text-red-700">{error || "Задача не найдена"}</p>;
  }

  const closed = mission.status === "canceled" || mission.status === "completed";
  const channelName = (id: string) => channels.find((c) => c.id === id)?.name || id.slice(0, 8);

  return (
    <div>
      <PageHeader
        title={mission.title}
        crumbs={[
          { label: "Главная", href: "/dashboard" },
          { label: "Задачи продвижения", href: "/missions" },
          { label: mission.title },
        ]}
        description={`${MISSION_STATUS_LABEL[mission.status]} · ${MISSION_METRIC_LABEL[mission.metric]} · измеримость: ${MEASURABILITY_LABEL[mission.measurability]}`}
      />

      {error ? (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : null}
      {notice ? (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex min-h-[32rem] flex-col rounded-xl border border-border bg-surface">
          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                  msg.role === "user" ? "ml-auto bg-accent text-white" : "bg-muted/15 text-text",
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {busy ? (
              <div className="flex items-center gap-2 text-xs text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Агент думает…
              </div>
            ) : null}
          </div>
          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={closed || busy}
              placeholder={closed ? "Задача закрыта" : "Напишите агенту…"}
              className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={closed || busy || !input.trim()}
              className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </section>

        <aside className="space-y-3">
          <div className="rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="text-xs text-muted">Цель</p>
            <p className="mt-1">{mission.goal || "Ещё не сформулирована"}</p>
            {mission.brief.product ? <p className="mt-2 text-xs text-muted">Продукт: {mission.brief.product}</p> : null}
            {mission.brief.audience ? <p className="text-xs text-muted">Аудитория: {mission.brief.audience}</p> : null}
            <p className="mt-2 text-xs text-muted">
              Каналы: {mission.channel_ids.length ? mission.channel_ids.map(channelName).join(", ") : "не выбраны"}
            </p>
            {mission.frequency ? <p className="text-xs text-muted">Частота: {mission.frequency}</p> : null}
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-semibold">Ход публикаций</p>
            {(mission.plan.items || []).length === 0 ? (
              <p className="mt-2 text-xs text-muted">Попросите агента составить ход — появятся черновики с ролями.</p>
            ) : (
              <ol className="mt-2 space-y-2">
                {(mission.plan.items || []).map((item, idx) => (
                  <li key={`${item.role}-${idx}`} className="rounded-md border border-border px-2 py-1.5 text-xs">
                    <span className="font-medium">{MISSION_ROLE_LABEL[item.role] || item.role}</span>
                    <p className="mt-0.5 line-clamp-3 text-muted">{item.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-semibold">Черновики</p>
            {posts.length === 0 ? (
              <p className="mt-2 text-xs text-muted">После хода нажмите «Создать черновики». Публикация только после разрешения.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {posts.map((post) => (
                  <li key={post.id}>
                    <Link href={`/posts/${post.id}`} className="text-xs text-accent hover:underline">
                      {postPreviewText(post)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={busy || closed || (mission.plan.items || []).length === 0}
              onClick={() =>
                run(async () => {
                  const res = await createMissionDrafts(missionId);
                  setMission(res.mission);
                  setPosts(res.posts);
                  setNotice("Черновики созданы. Проверьте тексты и утвердите ход.");
                })
              }
              className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
            >
              Создать черновики
            </button>
            <button
              type="button"
              disabled={busy || closed || posts.length === 0}
              onClick={() =>
                run(async () => {
                  const next = await approveMission(missionId);
                  setMission(next);
                  setNotice("Ход утверждён. Посты поставлены в расписание — смотрите календарь.");
                  await load();
                })
              }
              className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Утвердить ход
            </button>
            <button
              type="button"
              disabled={busy || closed}
              onClick={() =>
                run(async () => {
                  const next = await completeMission(missionId, {
                    summary: "Задача закрыта пользователем",
                  });
                  setMission(next);
                })
              }
              className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
            >
              Завершить
            </button>
            <button
              type="button"
              disabled={busy || closed}
              onClick={() =>
                run(async () => {
                  const next = await cancelMission(missionId);
                  setMission(next);
                })
              }
              className="rounded-md border border-border px-3 py-2 text-sm text-red-700 disabled:opacity-50"
            >
              Отменить
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await saveMissionAsTemplate(missionId);
                  setNotice("Шаблон сохранён — его можно выбрать при следующей задаче.");
                })
              }
              className="rounded-md border border-border px-3 py-2 text-sm disabled:opacity-50"
            >
              Сохранить как шаблон
            </button>
            <Link href="/calendar" className="text-center text-xs text-accent hover:underline">
              Открыть календарь
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
