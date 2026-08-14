"use client";

import { Eye, EyeOff, Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ChannelAvatar } from "@/components/channels/ChannelAvatar";
import {
  ApiError,
  connectTelegramBusiness,
  fetchChannelProviderInfo,
  syncTelegramBusiness,
  type ChannelListItem,
  type ChannelProviderInfo,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const DEFAULT_HINT =
  "Подключите бота в Telegram Business (Настройки → Telegram Business → Chatbots) с правом «Управление историями», затем нажмите «Проверить подключение».";

type ConnectTelegramBusinessDialogProps = {
  open: boolean;
  onClose: () => void;
  onConnected: (connected: ChannelListItem[]) => void;
};

export function ConnectTelegramBusinessDialog({
  open,
  onClose,
  onConnected,
}: ConnectTelegramBusinessDialogProps) {
  const [providerInfo, setProviderInfo] = useState<ChannelProviderInfo | null>(null);
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [connected, setConnected] = useState<ChannelListItem[]>([]);

  useEffect(() => {
    if (!open) return;
    fetchChannelProviderInfo()
      .then(setProviderInfo)
      .catch(() => {});
  }, [open]);

  const resetForm = useCallback(() => {
    setBotToken("");
    setError(null);
    setHint(null);
    setRegistrationId(null);
    setBotUsername(null);
    setConnected([]);
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  const enabled =
    providerInfo?.telegram_business_stories_enabled ?? providerInfo?.telegram_enabled ?? true;

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const result = await connectTelegramBusiness({ bot_token: botToken.trim() });
      setRegistrationId(result.registration_id);
      setBotUsername(result.bot_username);
      setConnected(result.connected ?? []);
      setHint(result.hint || providerInfo?.business_connect_help_text || DEFAULT_HINT);
      if (result.connected?.length) {
        onConnected(result.connected);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось подключить бота");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSync() {
    if (!registrationId || syncing) return;
    setSyncing(true);
    setError(null);
    try {
      const result = await syncTelegramBusiness({ registration_id: registrationId });
      setConnected(result.connected ?? []);
      if (result.connected?.length) {
        onConnected(result.connected);
        setError(null);
        setHint("Профиль подключён. Можно закрыть окно и публиковать истории.");
      } else if (result.issues?.length) {
        setError(result.issues.join(" "));
        setHint(null);
      } else if (result.hint) {
        setError(result.hint);
        setHint(null);
      } else {
        setError("Business-подключение не найдено. Проверьте права бота в Telegram Business.");
        setHint(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось проверить подключение");
    } finally {
      setSyncing(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface shadow-xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Telegram Business — Stories</h2>
            <p className="mt-1 text-sm text-muted">
              Подключите личный или business-профиль для публикации историй через бота.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть">
            <X className="h-5 w-5 text-muted" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {!enabled && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Telegram Business Stories отключены администратором платформы.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {hint && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 whitespace-pre-line">
              {hint}
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Токен бота</span>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456789:ABC..."
                className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm"
                disabled={!enabled}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted"
                onClick={() => setShowToken((v) => !v)}
                aria-label={showToken ? "Скрыть токен" : "Показать токен"}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!enabled || connecting || !botToken.trim()}
              onClick={() => void handleConnect()}
              className={cn(
                "inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white",
                "disabled:opacity-50",
              )}
            >
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Подключить бота
            </button>
            {registrationId && (
              <button
                type="button"
                disabled={syncing}
                onClick={() => void handleSync()}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50 disabled:opacity-50"
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Проверить подключение
              </button>
            )}
          </div>

          {botUsername && (
            <p className="text-xs text-muted">
              Бот: @{botUsername}. После подключения в Telegram Business профиль появится здесь автоматически
              или после проверки.
            </p>
          )}

          {connected.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Подключённые профили</p>
              {connected.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <ChannelAvatar
                    name={item.name}
                    metadata={item.metadata}
                    channelId={item.id}
                    provider={item.provider}
                    chatType={item.chat_type}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted">Telegram Business · Stories</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
