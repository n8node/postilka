"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  MessageSquare,
  Save,
  Settings,
  Tag,
} from "lucide-react";
import { SupportInbox } from "@/components/support/SupportInbox";
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
  const [newThemeDescription, setNewThemeDescription] = useState("");
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
        setSelectedTicket((current) => {
          const fromUrl = ticketIdFromUrl ? list.find((x) => x.id === ticketIdFromUrl) : undefined;
          if (fromUrl) return fromUrl;
          if (current) return list.find((x) => x.id === current.id) ?? current;
          return current;
        });
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

  async function handleReply(body: string, files: File[]) {
    if (!selectedTicket) return;
    if (selectedTicket.status === "resolved" || selectedTicket.status === "closed") {
      setError("Тикет закрыт");
      return;
    }
    setSending(true);
    setError("");
    try {
      const updated = await replyAdminSupportTicket(selectedTicket.id, body, files);
      setSelectedTicket(updated);
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
        description: newThemeDescription.trim() || undefined,
        sort_order: themes.length,
      });
      setNewThemeName("");
      setNewThemeSlug("");
      setNewThemeDescription("");
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
        <SupportInbox
          mode="admin"
          tickets={tickets}
          selected={selectedTicket}
          sending={sending}
          onSelect={setSelectedTicket}
          onSend={handleReply}
          onResolve={() => selectedTicket && handleUpdateStatus(selectedTicket.id, "resolved")}
          onCloseTicket={() => selectedTicket && handleUpdateStatus(selectedTicket.id, "closed")}
          onStatusChange={(status) => selectedTicket && handleUpdateStatus(selectedTicket.id, status)}
        />
      )}

      {tab === "themes" && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Темы тикетов</h2>
          <p className="mt-1 text-sm text-slate-500">
            Темы отображаются плитками при создании тикета
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
            <input
              placeholder="Подпись на плитке"
              value={newThemeDescription}
              onChange={(e) => setNewThemeDescription(e.target.value)}
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
                  <p className="text-xs text-slate-500">
                    {theme.slug}
                    {theme.description ? ` · ${theme.description}` : ""}
                  </p>
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
