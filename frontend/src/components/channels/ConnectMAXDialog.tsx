"use client";

import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  connectMAXChannels,
  discoverMAXChannels,
  fetchChannelProviderInfo,
  type ChannelProviderInfo,
} from "@/lib/api";

type ConnectMAXDialogProps = {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
};

export function ConnectMAXDialog({ open, onClose, onConnected }: ConnectMAXDialogProps) {
  const [providerInfo, setProviderInfo] = useState<ChannelProviderInfo | null>(null);
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [chatID, setChatID] = useState("");
  const [chatName, setChatName] = useState("");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const reset = useCallback(() => {
    setBotToken("");
    setChatID("");
    setChatName("");
    setError(null);
    setHint(null);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    fetchChannelProviderInfo().then(setProviderInfo).catch(() => {});
  }, [open, reset]);

  async function handleDiscover() {
    setLoading(true);
    setError(null);
    try {
      const result = await discoverMAXChannels(botToken.trim(), chatID.trim());
      setHint(result.hint ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось проверить токен");
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    const token = botToken.trim();
    const id = chatID.trim();
    if (!token || !id) {
      setError("Укажите токен бота и chat_id канала");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      await connectMAXChannels({
        bot_token: token,
        channels: [{ external_id: id, name: chatName.trim() || id }],
      });
      onConnected();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось подключить канал");
    } finally {
      setConnecting(false);
    }
  }

  const maxProvider = providerInfo?.providers.find((p) => p.provider === "max");
  const enabled = maxProvider?.enabled ?? false;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted hover:text-foreground"
          aria-label="Закрыть"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-semibold">Подключить MAX</h2>
        <p className="mt-1 text-sm text-muted">
          Создайте бота в MAX, добавьте его в канал и укажите токен и chat_id.
        </p>

        {!enabled && (
          <p className="mt-4 text-sm text-amber-700">
            Подключение MAX временно отключено администратором.
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {hint && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            {hint}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Токен бота MAX</span>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                disabled={!enabled}
                className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Chat ID канала</span>
            <input
              type="text"
              value={chatID}
              onChange={(e) => setChatID(e.target.value)}
              placeholder="ID канала MAX"
              disabled={!enabled}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Название (необязательно)</span>
            <input
              type="text"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              disabled={!enabled}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleDiscover()}
              disabled={!enabled || loading || !botToken.trim()}
              className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Проверить токен"}
            </button>
            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={!enabled || connecting || !botToken.trim() || !chatID.trim()}
              className="flex-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {connecting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Подключить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
