"use client";

import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  connectPhotochkaChannel,
  fetchChannelProviderInfo,
  type ChannelListItem,
  type ChannelProviderInfo,
} from "@/lib/api";

type ConnectPhotochkaDialogProps = {
  open: boolean;
  onClose: () => void;
  onConnected: (connected: ChannelListItem[]) => void;
};

export function ConnectPhotochkaDialog({
  open,
  onClose,
  onConnected,
}: ConnectPhotochkaDialogProps) {
  const [providerInfo, setProviderInfo] = useState<ChannelProviderInfo | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setApiKey("");
    setShowKey(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    fetchChannelProviderInfo().then(setProviderInfo).catch(() => {});
  }, [open, reset]);

  async function handleConnect() {
    const key = apiKey.trim();
    if (!key) {
      setError("Вставьте API-ключ Photochka");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const result = await connectPhotochkaChannel(key);
      onConnected(result.connected ?? []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Не удалось подключить Photochka");
      }
    } finally {
      setConnecting(false);
    }
  }

  if (!open) return null;

  const helpText =
    providerInfo?.photochka_connect_help_text ??
    "Ключ создаётся в Photochka → Настройки → API-ключи (тариф Business).";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
        role="dialog"
        aria-labelledby="connect-photochka-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-muted hover:bg-zinc-100"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="connect-photochka-title" className="text-lg font-semibold text-foreground">
          Подключить Photochka
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm text-muted">{helpText}</p>

        <label className="mt-4 block text-sm font-medium text-foreground">
          API-ключ
          <div className="relative mt-1">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="phk_live_..."
              autoComplete="off"
              className="w-full rounded-md border border-border bg-white py-2 pl-3 pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted"
              aria-label={showKey ? "Скрыть ключ" : "Показать ключ"}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
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
            disabled={connecting}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Подключить
          </button>
        </div>
      </div>
    </div>
  );
}
