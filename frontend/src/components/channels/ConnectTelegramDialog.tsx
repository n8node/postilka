"use client";

import { Eye, EyeOff, Info, Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  connectTelegramChannels,
  discoverTelegramChannels,
  fetchChannelProviderInfo,
  type TelegramDiscoveredChat,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const ANONYMITY_HINT =
  "При назначении бота администратором не включайте «Оставаться анонимным» (Remain Anonymous). Анонимный админ не может публиковать сообщения от имени бота — Postilka не сможет постить в этот чат.";

const MANUAL_HINT =
  "Если чат не появился в списке, укажите chat_id вручную (например −1001234567890 или @public_channel). Бот должен быть администратором канала или группы с правом публикации — иначе автопостинг работать не будет.";

type ConnectTelegramDialogProps = {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
};

export function ConnectTelegramDialog({ open, onClose, onConnected }: ConnectTelegramDialogProps) {
  const [helpText, setHelpText] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [discoveredOnce, setDiscoveredOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [chats, setChats] = useState<TelegramDiscoveredChat[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [manualChatID, setManualChatID] = useState("");
  const [manualName, setManualName] = useState("");

  useEffect(() => {
    if (!open) return;
    fetchChannelProviderInfo()
      .then((info) => {
        setEnabled(info.telegram_enabled);
        setHelpText(info.connect_help_text);
      })
      .catch(() => {});
  }, [open]);

  const resetForm = useCallback(() => {
    setBotToken("");
    setChats([]);
    setSelected({});
    setHint(null);
    setBotUsername(null);
    setDiscoveredOnce(false);
    setManualChatID("");
    setManualName("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) resetForm();
  }, [open, resetForm]);

  const hasToken = botToken.trim().length > 0;
  const pickedFromList = chats.filter((c) => selected[c.chat_id]);
  const manualChatTrimmed = manualChatID.trim();
  const canConnect =
    hasToken && (pickedFromList.length > 0 || manualChatTrimmed.length > 0);

  async function handleDiscover() {
    setDiscovering(true);
    setError(null);
    setHint(null);
    setDiscoveredOnce(true);
    try {
      const result = await discoverTelegramChannels(botToken.trim());
      setBotUsername(result.bot.username ? `@${result.bot.username}` : null);
      setChats(result.chats);
      setHint(result.hint || null);
      const next: Record<string, boolean> = {};
      for (const chat of result.chats) {
        if (chat.can_post) next[chat.chat_id] = true;
      }
      setSelected(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось найти чаты");
    } finally {
      setDiscovering(false);
    }
  }

  async function handleConnect() {
    if (!canConnect) {
      setError("Выберите чат из списка или укажите chat_id вручную");
      return;
    }
    setConnecting(true);
    setError(null);

    const channels: { chat_id: string; name?: string }[] = pickedFromList.map((c) => ({
      chat_id: c.chat_id,
      name: c.title,
    }));
    if (manualChatTrimmed) {
      const alreadyListed = channels.some((c) => c.chat_id === manualChatTrimmed);
      if (!alreadyListed) {
        channels.push({
          chat_id: manualChatTrimmed,
          ...(manualName.trim() ? { name: manualName.trim() } : {}),
        });
      }
    }

    try {
      await connectTelegramChannels({
        bot_token: botToken.trim(),
        channels,
      });
      onConnected();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось подключить каналы");
    } finally {
      setConnecting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Подключить Telegram</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {!enabled && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Подключение Telegram временно отключено администратором платформы.
            </div>
          )}

          {helpText && (
            <div className="rounded-lg border border-border bg-zinc-50 px-3 py-2 text-sm whitespace-pre-line text-muted">
              {helpText}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Токен бота</label>
            <p className="mb-2 text-xs text-muted">Создайте бота через @BotFather и вставьте токен.</p>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder="123456:ABC..."
                className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm"
                disabled={!enabled}
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {hasToken && (
            <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <p>{ANONYMITY_HINT}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleDiscover}
            disabled={!enabled || discovering || !hasToken}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            {discovering ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {discovering ? "Поиск…" : "Найти чаты"}
          </button>

          {botUsername && (
            <p className="text-sm text-muted">
              Бот: <span className="font-medium text-foreground">{botUsername}</span>
            </p>
          )}

          {hint && chats.length === 0 && discoveredOnce && (
            <p className="text-sm text-amber-700">{hint}</p>
          )}

          {chats.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Выберите каналы и группы</p>
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {chats.map((chat) => (
                  <li key={chat.chat_id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-50",
                        !chat.can_post && "opacity-50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={!!selected[chat.chat_id]}
                        disabled={!chat.can_post}
                        onChange={(e) =>
                          setSelected((prev) => ({ ...prev, [chat.chat_id]: e.target.checked }))
                        }
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-medium">{chat.title}</span>
                        <span className="block text-xs text-muted">
                          {chat.type} · {chat.chat_id}
                          {!chat.can_post && " · нет права публикации"}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasToken && (
            <div className="space-y-3 rounded-lg border border-dashed border-border bg-zinc-50 p-3">
              <p className="text-sm font-medium">Добавить вручную</p>
              <p className="text-xs text-muted">{MANUAL_HINT}</p>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Chat ID</label>
                <input
                  type="text"
                  value={manualChatID}
                  onChange={(e) => setManualChatID(e.target.value)}
                  placeholder="-1001234567890"
                  className="w-full rounded-md border border-border bg-white px-3 py-2 font-mono text-sm"
                  disabled={!enabled}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Название (необязательно)
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Мой канал"
                  className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                  disabled={!enabled}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConnect}
            disabled={!enabled || connecting || !canConnect}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {connecting ? "Подключение…" : "Подключить"}
          </button>
        </div>
      </div>
    </div>
  );
}
