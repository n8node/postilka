"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Bell,
  Headphones,
  Loader2,
  MessageSquare,
  Save,
  Send,
  Settings,
  Tag,
  User,
} from "lucide-react";
import {
  createAdminSupportTheme,
  fetchAdminSupportSettings,
  fetchAdminSupportThemes,
  fetchAdminSupportTickets,
  fetchAdminSupportTicketsCount,
  replyAdminSupportTicket,
  testAdminSupportEmail,
  testAdminSupportMax,
  testAdminSupportTelegram,
  updateAdminSupportSettings,
  updateAdminSupportTheme,
  updateAdminSupportTicketStatus,
  type SupportSettings,
  type SupportTicket,
  type SupportTicketTheme,
  type TicketStatus,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Открыт",
  awaiting_admin: "Ожидает ответа",
  awaiting_user: "Ожидает пользователя",
  in_progress: "В работе",
  resolved: "Решён",
  closed: "Закрыт",
};

const DEFAULT_SETTINGS: SupportSettings = {
  admin_email_enabled: true,
  admin_email_recipients: "",
  telegram_enabled: false,
  telegram_chat_id: "",
  telegram_new_ticket_template: "",
  telegram_user_reply_template: "",
  max_enabled: false,
  max_recipient_id: "",
  max_new_ticket_template: "",
  max_user_reply_template: "",
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

export function AdminSupportPage() {
  const searchParams = useSearchParams();
  const ticketIdFromUrl = searchParams.get("ticket");

  const [tab, setTab] = useState<"tickets" | "themes" | "settings">("tickets");
  const [awaitingCount, setAwaitingCount] = useState(0);
  const [themes, setThemes] = useState<SupportTicketTheme[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [settings, setSettings] = useState<SupportSettings>(DEFAULT_SETTINGS);
  const [telegramTokenInput, setTelegramTokenInput] = useState("");
  const [maxTokenInput, setMaxTokenInput] = useState("");
  const [telegramTokenSet, setTelegramTokenSet] = useState(false);
  const [maxTokenSet, setMaxTokenSet] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  const [newThemeName, setNewThemeName] = useState("");
  const [newThemeSlug, setNewThemeSlug] = useState("");
  const [savingTheme, setSavingTheme] = useState(false);

  const loadCount = useCallback(() => {
    fetchAdminSupportTicketsCount()
      .then((d) => setAwaitingCount(d.awaiting_admin_count ?? 0))
      .catch(() => setAwaitingCount(0));
  }, []);

  const loadTickets = useCallback(() => {
    return fetchAdminSupportTickets()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setTickets(list);
        if (ticketIdFromUrl) {
          const t = list.find((x) => x.id === ticketIdFromUrl);
          if (t) setSelectedTicket(t);
        }
      })
      .catch(() => setTickets([]));
  }, [ticketIdFromUrl]);

  const loadThemes = useCallback(() => {
    fetchAdminSupportThemes()
      .then(setThemes)
      .catch(() => setThemes([]));
  }, []);

  const loadSettings = useCallback(() => {
    fetchAdminSupportSettings()
      .then((view) => {
        setSettings({ ...DEFAULT_SETTINGS, ...view.settings });
        setTelegramTokenSet(view.telegram_bot_token_set);
        setMaxTokenSet(view.max_bot_token_set);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadTickets(), loadThemes(), loadSettings(), Promise.resolve(loadCount())]).finally(
      () => setLoading(false),
    );
  }, [loadTickets, loadThemes, loadSettings, loadCount]);

  async function handleReply() {
    if (!selectedTicket || !replyBody.trim()) return;
    if (selectedTicket.status === "resolved" || selectedTicket.status === "closed") {
      setError("Тикет закрыт");
      return;
    }
    setSending(true);
    setError("");
    try {
      const updated = await replyAdminSupportTicket(selectedTicket.id, replyBody.trim());
      setSelectedTicket(updated);
      setReplyBody("");
      await loadTickets();
      loadCount();
      setMessage("Ответ отправлен. Пользователь получит уведомление и email.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSending(false);
    }
  }

  async function handleUpdateStatus(ticketId: string, status: TicketStatus) {
    try {
      const updated = await updateAdminSupportTicketStatus(ticketId, status);
      if (selectedTicket?.id === ticketId) setSelectedTicket(updated);
      await loadTickets();
      loadCount();
      setMessage("Статус обновлён");
    } catch {
      setError("Не удалось обновить статус");
    }
  }

  async function handleAddTheme() {
    if (!newThemeName.trim()) {
      setError("Введите название темы");
      return;
    }
    setSavingTheme(true);
    setError("");
    try {
      await createAdminSupportTheme({
        name: newThemeName.trim(),
        slug: newThemeSlug.trim() || undefined,
        sort_order: themes.length,
      });
      setNewThemeName("");
      setNewThemeSlug("");
      loadThemes();
      setMessage("Тема добавлена");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSavingTheme(false);
    }
  }

  async function handleToggleTheme(theme: SupportTicketTheme) {
    try {
      await updateAdminSupportTheme(theme.id, { is_active: !theme.is_active });
      loadThemes();
      setMessage(theme.is_active ? "Тема скрыта" : "Тема активирована");
    } catch {
      setError("Ошибка");
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    setError("");
    try {
      const view = await updateAdminSupportSettings({
        settings,
        telegram_bot_token: telegramTokenInput.trim() || undefined,
        max_bot_token: maxTokenInput.trim() || undefined,
      });
      setSettings({ ...DEFAULT_SETTINGS, ...view.settings });
      setTelegramTokenSet(view.telegram_bot_token_set);
      setMaxTokenSet(view.max_bot_token_set);
      setTelegramTokenInput("");
      setMaxTokenInput("");
      setMessage("Настройки сохранены");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleTest(kind: "telegram" | "max" | "email") {
    setTesting(kind);
    setError("");
    try {
      const fn =
        kind === "telegram"
          ? testAdminSupportTelegram
          : kind === "max"
            ? testAdminSupportMax
            : testAdminSupportEmail;
      const res = await fn();
      if (res.ok) setMessage(res.message);
      else setError(res.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка теста");
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Тикеты поддержки</h1>
        <p className="mt-1 text-sm text-slate-500">
          Обращения пользователей и отдельные каналы оповещений (Telegram, MAX, email).
        </p>
      </div>

      {(error || message) && (
        <div
          className={cn(
            "rounded-lg px-4 py-3 text-sm",
            error
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800",
          )}
        >
          {error || message}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {(
          [
            ["tickets", "Тикеты", MessageSquare, awaitingCount],
            ["themes", "Темы", Tag, 0],
            ["settings", "Оповещения", Settings, 0],
          ] as const
        ).map(([key, label, Icon, badge]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setError("");
              setMessage("");
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === key
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:bg-slate-100",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {badge > 0 && key === "tickets" && (
              <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "tickets" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <Headphones className="h-4 w-4" />
              Список тикетов
            </h2>
            {tickets.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">Нет тикетов</p>
            ) : (
              <ul className="space-y-1">
                {tickets.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(t)}
                      className={cn(
                        "w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        selectedTicket?.id === t.id
                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                          : "hover:bg-slate-50",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="truncate font-medium">{t.user?.email}</span>
                        {t.status === "awaiting_admin" && (
                          <Bell className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        )}
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {t.theme?.name} · {formatDate(t.updated_at)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            {selectedTicket ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-semibold">{selectedTicket.theme?.name}</h2>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                      <User className="h-3.5 w-3.5" />
                      {selectedTicket.user?.email}
                      {selectedTicket.user?.name ? ` (${selectedTicket.user.name})` : ""}
                    </p>
                  </div>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) =>
                      handleUpdateStatus(selectedTicket.id, e.target.value as TicketStatus)
                    }
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs"
                  >
                    {(Object.entries(STATUS_LABELS) as [TicketStatus, string][]).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="max-h-[280px] space-y-3 overflow-y-auto">
                  {(selectedTicket.messages ?? []).map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-lg px-4 py-3",
                        m.author_role === "admin"
                          ? "ml-4 border border-blue-200 bg-blue-50"
                          : "mr-4 bg-slate-50",
                      )}
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                        {m.author_role === "admin" ? "Вы" : "Пользователь"}
                        <span>{formatDate(m.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                    </div>
                  ))}
                </div>

                {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" && (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Введите ответ..."
                      rows={3}
                      className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <button
                      type="button"
                      onClick={handleReply}
                      disabled={sending || !replyBody.trim()}
                      className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {sending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Отправить ответ
                    </button>
                    <p className="mt-2 text-xs text-slate-500">
                      Пользователь получит in-app уведомление и email
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
                <MessageSquare className="mb-3 h-12 w-12 opacity-50" />
                <p>Выберите тикет</p>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === "themes" && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Темы тикетов</h2>
          <p className="mt-1 text-sm text-slate-500">
            Темы отображаются в выпадающем списке при создании тикета
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              placeholder="Название темы"
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              className="h-10 max-w-xs rounded-lg border border-slate-200 px-3 text-sm"
            />
            <input
              placeholder="slug (опционально)"
              value={newThemeSlug}
              onChange={(e) => setNewThemeSlug(e.target.value)}
              className="h-10 max-w-xs rounded-lg border border-slate-200 px-3 text-sm"
            />
            <button
              type="button"
              onClick={handleAddTheme}
              disabled={savingTheme}
              className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Добавить
            </button>
          </div>
          <ul className="mt-6 divide-y divide-slate-100">
            {themes.map((theme) => (
              <li key={theme.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{theme.name}</p>
                  <p className="text-xs text-slate-500">{theme.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleTheme(theme)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium",
                    theme.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {theme.is_active ? "Активна" : "Скрыта"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "settings" && (
        <section className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">Email администратора</h2>
            <p className="mt-1 text-sm text-slate-500">
              Отдельно от системных писем — только оповещения о тикетах поддержки
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.admin_email_enabled}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, admin_email_enabled: e.target.checked }))
                }
              />
              Включить email-оповещения
            </label>
            <input
              value={settings.admin_email_recipients}
              onChange={(e) =>
                setSettings((s) => ({ ...s, admin_email_recipients: e.target.value }))
              }
              placeholder="support@postilka.ru, admin@postilka.ru"
              className="mt-3 h-10 w-full max-w-lg rounded-lg border border-slate-200 px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => handleTest("email")}
              disabled={testing === "email"}
              className="mt-3 text-sm text-blue-600 hover:underline disabled:opacity-50"
            >
              {testing === "email" ? "Отправка…" : "Тест email"}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">Telegram-бот поддержки</h2>
            <p className="mt-1 text-sm text-slate-500">
              Отдельный бот и чат — не путать с ботом системных уведомлений в разделе Telegram
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.telegram_enabled}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, telegram_enabled: e.target.checked }))
                }
              />
              Включить Telegram-оповещения
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                value={telegramTokenInput}
                onChange={(e) => setTelegramTokenInput(e.target.value)}
                placeholder={telegramTokenSet ? "Токен сохранён — введите новый для замены" : "Bot token"}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              />
              <input
                value={settings.telegram_chat_id}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, telegram_chat_id: e.target.value }))
                }
                placeholder="Chat ID (-100...)"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>
            <textarea
              value={settings.telegram_new_ticket_template}
              onChange={(e) =>
                setSettings((s) => ({ ...s, telegram_new_ticket_template: e.target.value }))
              }
              rows={3}
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Шаблон нового тикета"
            />
            <textarea
              value={settings.telegram_user_reply_template}
              onChange={(e) =>
                setSettings((s) => ({ ...s, telegram_user_reply_template: e.target.value }))
              }
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Шаблон ответа пользователя"
            />
            <button
              type="button"
              onClick={() => handleTest("telegram")}
              disabled={testing === "telegram"}
              className="mt-3 text-sm text-blue-600 hover:underline disabled:opacity-50"
            >
              {testing === "telegram" ? "Отправка…" : "Тест Telegram"}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">MAX-бот поддержки</h2>
            <p className="mt-1 text-sm text-slate-500">
              Отдельный бот — не путать с platform bot для каналов MAX
            </p>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.max_enabled}
                onChange={(e) => setSettings((s) => ({ ...s, max_enabled: e.target.checked }))}
              />
              Включить MAX-оповещения
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                value={maxTokenInput}
                onChange={(e) => setMaxTokenInput(e.target.value)}
                placeholder={maxTokenSet ? "Токен сохранён — введите новый для замены" : "Bot token"}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              />
              <input
                value={settings.max_recipient_id}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, max_recipient_id: e.target.value }))
                }
                placeholder="User ID или chat ID"
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => handleTest("max")}
              disabled={testing === "max"}
              className="mt-3 text-sm text-blue-600 hover:underline disabled:opacity-50"
            >
              {testing === "max" ? "Отправка…" : "Тест MAX"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {savingSettings ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Сохранить настройки
          </button>
        </section>
      )}
    </div>
  );
}
