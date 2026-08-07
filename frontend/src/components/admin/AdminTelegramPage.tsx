"use client";

import { Eye, EyeOff, RefreshCw, Save, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchAdminTelegramQueue,
  fetchAdminTelegramSettings,
  fetchAdminTelegramStatus,
  restartAdminTelegramBot,
  retryAdminTelegramQueueItem,
  sendAdminTelegramTest,
  updateAdminTelegramSettings,
  type TelegramAdminView,
  type TelegramBotStatus,
  type TelegramNotificationRecord,
  type TelegramNotificationStatus,
  type TelegramRuntimeStatus,
  type TelegramSettings,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const DEFAULT_SETTINGS: TelegramSettings = {
  enabled: false,
  chat_id: "",
  proxy_enabled: false,
  proxy_active_url: "",
  proxy_auto_failover: true,
  proxy_urls: [],
  notify_registration: true,
  registration_template: "",
  notify_email_verified: true,
  email_verified_template: "",
  notify_payment: true,
  payment_template: "",
  notify_wallet_topup: true,
  wallet_topup_template: "",
  notify_support: false,
  support_template: "",
};

const DEFAULT_RUNTIME: TelegramRuntimeStatus = {
  status: "starting",
  message: "",
  supervisor_running: false,
};

const QUEUE_PAGE_SIZE = 10;

function statusDotClass(status: TelegramBotStatus): string {
  switch (status) {
    case "online":
      return "bg-emerald-500";
    case "offline":
    case "misconfigured":
      return "bg-red-500";
    case "starting":
      return "bg-amber-500 animate-pulse";
    default:
      return "bg-slate-400";
  }
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ru-RU");
}

export function AdminTelegramPage() {
  const [settings, setSettings] = useState<TelegramSettings>(DEFAULT_SETTINGS);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenHint, setTokenHint] = useState("");
  const [tokenSet, setTokenSet] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testOk, setTestOk] = useState<boolean | null>(null);
  const [runtime, setRuntime] = useState<TelegramRuntimeStatus>(DEFAULT_RUNTIME);
  const [restarting, setRestarting] = useState(false);
  const [queueItems, setQueueItems] = useState<TelegramNotificationRecord[]>([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueOffset, setQueueOffset] = useState(0);
  const [queueStatus, setQueueStatus] = useState<"" | TelegramNotificationStatus>("");
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [retryingQueueID, setRetryingQueueID] = useState("");

  const applyView = useCallback((data: TelegramAdminView) => {
    const proxyUrls = data.settings.proxy_urls || [];
    const proxyActive =
      data.settings.proxy_active_url &&
      proxyUrls.includes(data.settings.proxy_active_url)
        ? data.settings.proxy_active_url
        : "";
    setSettings({
      ...data.settings,
      proxy_urls: proxyUrls,
      proxy_active_url: proxyActive,
      proxy_auto_failover: data.settings.proxy_auto_failover ?? true,
      proxy_enabled: data.settings.proxy_enabled ?? false,
    });
    setTokenSet(data.bot_token_set);
    setTokenHint(data.bot_token_hint || "");
    if (data.runtime) setRuntime(data.runtime);
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const st = await fetchAdminTelegramStatus();
      setRuntime(st);
    } catch {
      /* keep last known status */
    }
  }, []);

  const refreshQueue = useCallback(
    async (next?: { offset?: number; status?: "" | TelegramNotificationStatus }) => {
      const offset = next?.offset ?? queueOffset;
      const status = next?.status ?? queueStatus;
      setQueueLoading(true);
      if (!next) setQueueError(null);
      try {
        const data = await fetchAdminTelegramQueue({
          limit: QUEUE_PAGE_SIZE,
          offset,
          ...(status ? { status } : {}),
        });
        setQueueItems(data.items);
        setQueueTotal(data.total);
        setQueueOffset(offset);
        setQueueStatus(status);
      } catch (err) {
        setQueueError(
          err instanceof ApiError ? err.message : "Не удалось загрузить очередь",
        );
      } finally {
        setQueueLoading(false);
      }
    },
    [queueOffset, queueStatus],
  );

  useEffect(() => {
    fetchAdminTelegramSettings()
      .then(applyView)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить настройки"),
      )
      .finally(() => setLoading(false));
  }, [applyView]);

  useEffect(() => {
    if (loading) return;
    void refreshQueue({ offset: 0 });
  }, [loading, refreshQueue]);

  useEffect(() => {
    if (loading) return;
    const id = setInterval(refreshStatus, 5000);
    return () => clearInterval(id);
  }, [loading, refreshStatus]);

  useEffect(() => {
    if (loading) return;
    const id = setInterval(() => {
      void refreshQueue();
    }, 10000);
    return () => clearInterval(id);
  }, [loading, refreshQueue]);

  function patch(partial: Partial<TelegramSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
    setSuccess(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await updateAdminTelegramSettings({
        settings,
        ...(tokenInput.trim() ? { bot_token: tokenInput.trim() } : {}),
      });
      applyView(data);
      setTokenInput("");
      setSuccess("Настройки Telegram сохранены");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    setTestMessage(null);
    setTestOk(null);
    try {
      if (tokenInput.trim()) {
        const saved = await updateAdminTelegramSettings({
          settings,
          bot_token: tokenInput.trim(),
        });
        applyView(saved);
        setTokenInput("");
      }
      const result = await sendAdminTelegramTest();
      setTestOk(result.ok);
      setTestMessage(result.message);
      if (result.runtime) setRuntime(result.runtime);
      if (!result.ok) {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось отправить тест");
    } finally {
      setTesting(false);
    }
  }

  async function handleRestart() {
    setRestarting(true);
    setError(null);
    try {
      const st = await restartAdminTelegramBot();
      setRuntime(st);
      setSuccess("Супервизор перезапущен");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось перезапустить бота");
    } finally {
      setRestarting(false);
    }
  }

  async function handleRetryQueue(id: string) {
    setRetryingQueueID(id);
    try {
      await retryAdminTelegramQueueItem(id);
      await refreshQueue();
    } catch (err) {
      setQueueError(
        err instanceof ApiError ? err.message : "Не удалось повторить отправку",
      );
    } finally {
      setRetryingQueueID("");
    }
  }

  const proxyOptions = settings.proxy_urls.filter(Boolean);
  const proxySelectValue =
    settings.proxy_active_url && proxyOptions.includes(settings.proxy_active_url)
      ? settings.proxy_active_url
      : "";

  if (loading) {
    return <p className="text-sm text-slate-500">Загрузка настроек Telegram…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Telegram-уведомления</h1>
        <p className="mt-1 text-sm text-slate-500">
          Уведомления администратору о регистрациях, оплатах и пополнениях кошелька.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={cn("mt-1.5 h-2.5 w-2.5 rounded-full", statusDotClass(runtime.status))} />
            <div>
              <h2 className="font-medium text-slate-900">Статус бота</h2>
              <p className="mt-1 text-sm text-slate-600">{runtime.message || "—"}</p>
              <p className="mt-1 text-xs text-slate-400">
                Последняя проверка: {formatDateTime(runtime.last_check_at)}
              </p>
              {runtime.last_error && (
                <p className="mt-1 text-xs text-red-600">{runtime.last_error}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRestart}
            disabled={restarting}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", restarting && "animate-spin")} />
            Перепроверить и перезапустить
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Супервизор запускается вместе с backend при старте контейнера и проверяет подключение каждые 30 секунд.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-medium text-slate-900">Подключение</h2>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="rounded border-slate-300"
          />
          Включить Telegram-уведомления
        </label>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Токен бота</label>
          <p className="mb-2 text-xs text-slate-500">
            Получите у @BotFather. Хранится в БД (доступ только суперадмину).
            {tokenSet && tokenHint ? ` Текущий: ${tokenHint}` : ""}
          </p>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={tokenSet ? "Оставьте пустым, чтобы не менять" : "123456:ABC..."}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">ID чата</label>
          <p className="mb-2 text-xs text-slate-500">
            Числовой ID личного чата или группы. Узнать: @userinfobot или getUpdates API.
          </p>
          <input
            type="text"
            value={settings.chat_id}
            onChange={(e) => patch({ chat_id: e.target.value })}
            placeholder="639160984"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-medium text-slate-900">Прокси для Telegram API</h2>
        <p className="text-xs text-slate-500">
          Используйте, если сервер в регионе с нестабильным доступом к api.telegram.org.
          На prod в Docker укажите внешний прокси здесь (для справки) — backend автоматически
          ходит через <code className="rounded bg-slate-100 px-1">host.docker.internal:8889</code>,
          если задан <code className="rounded bg-slate-100 px-1">TELEGRAM_UPSTREAM_PROXY</code> в{" "}
          <code className="rounded bg-slate-100 px-1">.env</code>.
        </p>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.proxy_enabled}
            onChange={(e) => patch({ proxy_enabled: e.target.checked })}
            className="rounded border-slate-300"
          />
          Включить прокси для запросов к Telegram API
        </label>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Список прокси (по одному URL на строку)
          </label>
          <textarea
            value={settings.proxy_urls.join("\n")}
            onChange={(e) => {
              const proxy_urls = e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
              const proxy_active_url =
                settings.proxy_active_url &&
                proxy_urls.includes(settings.proxy_active_url)
                  ? settings.proxy_active_url
                  : "";
              patch({ proxy_urls, proxy_active_url });
            }}
            rows={3}
            placeholder="http://user:pass@5.35.83.120:3128"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
          />
          <p className="mt-1 text-xs text-slate-400">
            Только http://user:pass@host:port (HTTP CONNECT). SOCKS5 не поддерживается.
          </p>
        </div>

        {proxyOptions.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Активный прокси</label>
            <select
              value={proxySelectValue}
              onChange={(e) => patch({ proxy_active_url: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Авто: первый в списке</option>
              {proxyOptions.map((url) => (
                <option key={url} value={url}>
                  {url}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.proxy_auto_failover}
            onChange={(e) => patch({ proxy_auto_failover: e.target.checked })}
            className="rounded border-slate-300"
          />
          Автоматически пробовать следующий прокси при ошибке
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-6">
        <h2 className="font-medium text-slate-900">События и шаблоны</h2>

        <NotificationBlock
          title="Регистрация пользователя"
          enabled={settings.notify_registration}
          onEnabledChange={(v) => patch({ notify_registration: v })}
          template={settings.registration_template}
          onTemplateChange={(v) => patch({ registration_template: v })}
          vars="{email}, {name}, {inviteCode}, {inviteScope}, {inviteOwner}"
        />

        <NotificationBlock
          title="Email подтверждён"
          enabled={settings.notify_email_verified}
          onEnabledChange={(v) => patch({ notify_email_verified: v })}
          template={settings.email_verified_template}
          onTemplateChange={(v) => patch({ email_verified_template: v })}
          vars="{email}, {name}"
        />

        <NotificationBlock
          title="Оплата тарифа"
          enabled={settings.notify_payment}
          onEnabledChange={(v) => patch({ notify_payment: v })}
          template={settings.payment_template}
          onTemplateChange={(v) => patch({ payment_template: v })}
          vars="{userEmail}, {userName}, {planName}, {amount}, {currency}"
        />

        <NotificationBlock
          title="Пополнение кошелька"
          enabled={settings.notify_wallet_topup}
          onEnabledChange={(v) => patch({ notify_wallet_topup: v })}
          template={settings.wallet_topup_template}
          onTemplateChange={(v) => patch({ wallet_topup_template: v })}
          vars="{userEmail}, {userName}, {amount}, {balance}, {currency}"
        />

        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 opacity-60">
          <NotificationBlock
            title="Тикеты поддержки"
            enabled={settings.notify_support}
            onEnabledChange={(v) => patch({ notify_support: v })}
            template={settings.support_template}
            onTemplateChange={(v) => patch({ support_template: v })}
            vars="{userEmail}, {subject}"
            disabled
            hint="Будет доступно после запуска модуля поддержки"
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-slate-600" />
          <h2 className="font-medium text-slate-900">Проверка</h2>
        </div>
        <p className="mt-1 text-sm text-blue-600">
          Отправит тестовое сообщение в указанный чат
        </p>
        {testMessage && (
          <p
            className={cn(
              "mt-2 text-sm",
              testOk ? "text-emerald-700" : "text-red-600",
            )}
          >
            {testMessage}
          </p>
        )}
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {testing ? "Отправка…" : "Отправить тестовое сообщение"}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-slate-900">Журнал отправки уведомлений</h2>
            <p className="mt-1 text-xs text-slate-500">
              Очередь с повторами. Если бот недоступен, сообщения сохраняются и отправляются после восстановления.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={queueStatus}
              onChange={(e) =>
                void refreshQueue({
                  offset: 0,
                  status: e.target.value as "" | TelegramNotificationStatus,
                })
              }
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            >
              <option value="">Все статусы</option>
              <option value="pending">pending</option>
              <option value="processing">processing</option>
              <option value="sent">sent</option>
              <option value="failed">failed</option>
            </select>
            <button
              type="button"
              onClick={() => void refreshQueue()}
              disabled={queueLoading}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Обновить
            </button>
          </div>
        </div>

        {queueError && (
          <p className="mt-3 text-sm text-red-600">{queueError}</p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="px-2 py-2">Создано</th>
                <th className="px-2 py-2">Тип</th>
                <th className="px-2 py-2">Статус</th>
                <th className="px-2 py-2">Попытки</th>
                <th className="px-2 py-2">Последняя ошибка</th>
                <th className="px-2 py-2">Действия</th>
              </tr>
            </thead>
            <tbody>
              {queueItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-slate-400">
                    {queueLoading ? "Загрузка…" : "Записей пока нет"}
                  </td>
                </tr>
              ) : (
                queueItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 whitespace-nowrap text-xs">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="px-2 py-2">{item.kind}</td>
                    <td className="px-2 py-2">{item.status}</td>
                    <td className="px-2 py-2">{item.attempt_count}</td>
                    <td className="max-w-xs truncate px-2 py-2 text-xs text-red-600">
                      {item.last_error || "—"}
                    </td>
                    <td className="px-2 py-2">
                      {item.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => void handleRetryQueue(item.id)}
                          disabled={retryingQueueID === item.id}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                        >
                          Повторить
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {queueTotal > QUEUE_PAGE_SIZE && (
          <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
            <span>
              {queueOffset + 1}–{Math.min(queueOffset + QUEUE_PAGE_SIZE, queueTotal)} из {queueTotal}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={queueOffset === 0}
                onClick={() => void refreshQueue({ offset: Math.max(0, queueOffset - QUEUE_PAGE_SIZE) })}
                className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={queueOffset + QUEUE_PAGE_SIZE >= queueTotal}
                onClick={() => void refreshQueue({ offset: queueOffset + QUEUE_PAGE_SIZE })}
                className="rounded border border-slate-200 px-2 py-1 disabled:opacity-50"
              >
                Вперёд
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Сохранение…" : "Сохранить настройки"}
        </button>
      </div>
    </div>
  );
}

function NotificationBlock({
  title,
  enabled,
  onEnabledChange,
  template,
  onTemplateChange,
  vars,
  disabled,
  hint,
}: {
  title: string;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  template: string;
  onTemplateChange: (v: string) => void;
  vars: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="rounded border-slate-300"
        />
        {title}
      </label>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
      <p className="text-xs text-slate-500">Переменные: {vars}</p>
      <textarea
        value={template}
        disabled={disabled}
        onChange={(e) => onTemplateChange(e.target.value)}
        rows={5}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm disabled:opacity-60"
      />
    </div>
  );
}
