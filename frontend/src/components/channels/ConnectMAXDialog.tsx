"use client";

import { Copy, Eye, EyeOff, ExternalLink, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  connectMAXChannels,
  discoverMAXChannels,
  fetchChannelProviderInfo,
  type ChannelDiscoverResult,
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
  const [loadingBot, setLoadingBot] = useState(false);
  const [loadingChannel, setLoadingChannel] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botResult, setBotResult] = useState<ChannelDiscoverResult | null>(null);
  const [channelHint, setChannelHint] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const reset = useCallback(() => {
    setBotToken("");
    setChatID("");
    setChatName("");
    setError(null);
    setBotResult(null);
    setChannelHint(null);
    setCopied(null);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    fetchChannelProviderInfo().then(setProviderInfo).catch(() => {});
  }, [open, reset]);

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Не удалось скопировать в буфер обмена");
    }
  }

  async function handleVerifyBot() {
    setLoadingBot(true);
    setError(null);
    setBotResult(null);
    setChannelHint(null);
    try {
      const result = await discoverMAXChannels(botToken.trim());
      setBotResult(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось проверить токен");
    } finally {
      setLoadingBot(false);
    }
  }

  async function handleVerifyChannel() {
    setLoadingChannel(true);
    setError(null);
    setChannelHint(null);
    try {
      const result = await discoverMAXChannels(botToken.trim(), chatID.trim());
      setChannelHint(result.hint ?? null);
      if (result.bot) setBotResult(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось проверить канал");
    } finally {
      setLoadingChannel(false);
    }
  }

  async function handleConnect() {
    const token = botToken.trim();
    const id = chatID.trim();
    if (!token || !id) {
      setError("Укажите токен бота и ссылку на канал");
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
  const bot = botResult?.bot;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-surface p-6 shadow-xl">
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
          Сначала проверьте токен — Postilka покажет <strong>@username</strong> бота для поиска в MAX.
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

        <div className="mt-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">1. Токен бота MAX</span>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={botToken}
                onChange={(e) => {
                  setBotToken(e.target.value);
                  setBotResult(null);
                  setChannelHint(null);
                }}
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

          <button
            type="button"
            onClick={() => void handleVerifyBot()}
            disabled={!enabled || loadingBot || !botToken.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            {loadingBot && <Loader2 className="h-4 w-4 animate-spin" />}
            Проверить бота
          </button>

          {bot && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              <p className="font-medium">Бот найден</p>
              {bot.name && <p className="mt-1">Название: {bot.name}</p>}
              <p className="mt-2">
                Ищите в MAX по нику:{" "}
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-sm">{bot.search_query}</code>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyText("nick", bot.search_query)}
                  className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs hover:bg-emerald-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied === "nick" ? "Скопировано" : "Копировать @ник"}
                </button>
                {bot.profile_url && (
                  <a
                    href={bot.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs hover:bg-emerald-100"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Открыть max.ru
                  </a>
                )}
              </div>
              <p className="mt-3 text-xs text-emerald-900">
                В поиске MAX не работают название бота и user_id ({bot.user_id}). Только {bot.search_query}.
              </p>
            </div>
          )}

          {botResult?.hint && !channelHint && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              {botResult.hint}
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p className="font-medium">2. Добавьте бота в канал MAX</p>
            <ol className="mt-1 list-inside list-decimal space-y-0.5 text-xs">
              <li>Канал → <strong>Участники</strong> → <strong>Добавить</strong></li>
              <li>В поиске введите <strong>@username</strong> бота (из шага 1)</li>
              <li>Канал → <strong>Администраторы</strong> → добавьте бота с правом «Публикация»</li>
            </ol>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">3. Ссылка на канал</span>
            <input
              type="text"
              value={chatID}
              onChange={(e) => setChatID(e.target.value)}
              placeholder="channel_postilka или https://max.ru/channel_postilka"
              disabled={!enabled}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Название в Postilka (необязательно)</span>
            <input
              type="text"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              disabled={!enabled}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </label>

          {channelHint && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              {channelHint}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleVerifyChannel()}
              disabled={!enabled || loadingChannel || !botToken.trim() || !chatID.trim()}
              className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              {loadingChannel ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Проверить канал"}
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
