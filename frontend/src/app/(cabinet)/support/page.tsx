"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Headphones,
  Loader2,
  Plus,
  Send,
  Bell,
  Clock,
  CheckCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  createSupportTicket,
  fetchSupportThemes,
  fetchSupportTickets,
  sendSupportTicketMessage,
  type SupportTicket,
  type SupportTicketTheme,
  type TicketStatus,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; icon: typeof Clock; badge: string | null; className: string }
> = {
  open: {
    label: "Открыт",
    icon: Clock,
    badge: null,
    className: "bg-slate-500/15 text-slate-600",
  },
  awaiting_admin: {
    label: "В ожидании ответа",
    icon: Clock,
    badge: null,
    className: "bg-amber-500/15 text-amber-700",
  },
  awaiting_user: {
    label: "Есть ответ",
    icon: Bell,
    badge: "Ответ от поддержки",
    className: "bg-emerald-500/15 text-emerald-700",
  },
  in_progress: {
    label: "В работе",
    icon: Clock,
    badge: null,
    className: "bg-blue-500/15 text-blue-700",
  },
  resolved: {
    label: "Решён",
    icon: CheckCircle,
    badge: null,
    className: "bg-emerald-500/15 text-emerald-700",
  },
  closed: {
    label: "Закрыт",
    icon: CheckCircle,
    badge: null,
    className: "bg-slate-500/15 text-slate-600",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SupportPage() {
  const searchParams = useSearchParams();
  const ticketIdFromUrl = searchParams.get("ticket");

  const [themes, setThemes] = useState<SupportTicketTheme[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [createThemeId, setCreateThemeId] = useState("");
  const [createBody, setCreateBody] = useState("");
  const [replyBody, setReplyBody] = useState("");

  const loadThemes = useCallback(() => {
    fetchSupportThemes()
      .then(setThemes)
      .catch(() => setThemes([]));
  }, []);

  const loadTickets = useCallback(() => {
    return fetchSupportTickets()
      .then((data) => {
        setTickets(Array.isArray(data) ? data : []);
        if (ticketIdFromUrl && Array.isArray(data)) {
          const t = data.find((x) => x.id === ticketIdFromUrl);
          if (t) setSelectedTicket(t);
        }
      })
      .catch(() => setTickets([]));
  }, [ticketIdFromUrl]);

  useEffect(() => {
    setLoading(true);
    loadThemes();
    loadTickets().finally(() => setLoading(false));
  }, [loadThemes, loadTickets]);

  async function handleCreate() {
    if (!createThemeId || !createBody.trim()) {
      setError("Выберите тему и введите сообщение");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const ticket = await createSupportTicket({
        theme_id: createThemeId,
        body: createBody.trim(),
      });
      setSuccess("Тикет создан");
      setShowCreate(false);
      setCreateThemeId("");
      setCreateBody("");
      await loadTickets();
      setSelectedTicket(ticket);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setCreating(false);
    }
  }

  async function handleReply() {
    if (!selectedTicket || !replyBody.trim()) return;
    if (selectedTicket.status === "resolved" || selectedTicket.status === "closed") {
      setError("Тикет закрыт");
      return;
    }
    setSending(true);
    setError("");
    try {
      const updated = await sendSupportTicketMessage(selectedTicket.id, replyBody.trim());
      setSelectedTicket(updated);
      setReplyBody("");
      await loadTickets();
      setSuccess("Сообщение отправлено");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Поддержка"
          description="Создайте тикет или продолжите переписку с командой Postilka."
        />
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          disabled={showCreate}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Создать тикет
        </button>
      </div>

      {(error || success) && (
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            error ? "border border-red-200 bg-red-50 text-red-700" : "border border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {error || success}
        </div>
      )}

      {showCreate && (
        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-base font-semibold">Новый тикет</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Тема</label>
              <select
                value={createThemeId}
                onChange={(e) => setCreateThemeId(e.target.value)}
                className="h-10 w-full max-w-md rounded-lg border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Выберите тему</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Сообщение</label>
              <textarea
                value={createBody}
                onChange={(e) => setCreateBody(e.target.value)}
                placeholder="Опишите вашу проблему или вопрос..."
                rows={4}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Создать
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm hover:bg-zinc-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm lg:col-span-1">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <Headphones className="h-4 w-4" />
            Мои тикеты
          </h2>
          {tickets.length === 0 ? (
            <p className="py-4 text-sm text-muted">Нет тикетов. Создайте первый.</p>
          ) : (
            <ul className="space-y-1">
              {tickets.map((t) => {
                const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.awaiting_admin;
                const Icon = cfg.icon;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(t)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        selectedTicket?.id === t.id
                          ? "bg-accent/10 text-accent ring-1 ring-accent/30"
                          : "hover:bg-zinc-50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate font-medium">{t.theme?.name}</span>
                        {cfg.badge && (
                          <span className="shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                            {cfg.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{formatDate(t.updated_at)}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-4 shadow-sm lg:col-span-2">
          {selectedTicket ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <h2 className="text-base font-semibold">{selectedTicket.theme?.name}</h2>
                {(() => {
                  const statusCfg = STATUS_CONFIG[selectedTicket.status] ?? STATUS_CONFIG.awaiting_admin;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        statusCfg.className,
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </span>
                  );
                })()}
              </div>

              <div className="max-h-[320px] space-y-3 overflow-y-auto">
                {(selectedTicket.messages ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "rounded-lg px-4 py-3",
                      m.author_role === "admin"
                        ? "ml-4 border border-accent/20 bg-accent/10"
                        : "mr-4 bg-zinc-50",
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                      {m.author_role === "admin" ? "Поддержка" : "Вы"}
                      <span>{formatDate(m.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  </div>
                ))}
              </div>

              {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" ? (
                <div className="mt-4 border-t border-border pt-4">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Введите сообщение..."
                    rows={3}
                    className="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    type="button"
                    onClick={handleReply}
                    disabled={sending || !replyBody.trim()}
                    className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {sending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Отправить
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">Тикет закрыт. Создайте новый, если вопрос остался.</p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
              <Headphones className="mb-3 h-12 w-12 opacity-40" />
              <p>Выберите тикет или создайте новый</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
