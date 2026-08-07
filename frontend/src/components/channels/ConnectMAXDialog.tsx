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
import { cn } from "@/lib/utils";

type ConnectMAXDialogProps = {
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
};

export function ConnectMAXDialog({ open, onClose, onConnected }: ConnectMAXDialogProps) {
  const [providerInfo, setProviderInfo] = useState<ChannelProviderInfo | null>(null);
  const [postMode, setPostMode] = useState<"own" | "platform">("own");
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
    setPostMode("own");
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
      const result = await discoverMAXChannels(
        postMode === "own" ? botToken.trim() : "",
        undefined,
        postMode,
      );
      setBotResult(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось проверить бота");
    } finally {
      setLoadingBot(false);
    }
  }

  async function handleVerifyChannel() {
    setLoadingChannel(true);
    setError(null);
    setChannelHint(null);
    try {
      const result = await discoverMAXChannels(
        postMode === "own" ? botToken.trim() : "",
        chatID.trim(),
        postMode,
      );
      setChannelHint(result.hint ?? null);
      setBotResult(result);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось проверить канал");
    } finally {
      setLoadingChannel(false);
    }
  }

  async function handleConnect() {
    const id = chatID.trim();
    if ((postMode === "own" && !botToken.trim()) || !id) {
      setError(
        postMode === "own"
          ? "Укажите токен бота и канал"
          : "Укажите канал",
      );
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      await connectMAXChannels({
        ...(postMode === "own" ? { bot_token: botToken.trim() } : {}),
        post_mode: postMode,
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
  const platformBotAvailable =
    Boolean(maxProvider?.platform_bot_enabled && maxProvider.platform_bot?.search_query);
  const platformBot = maxProvider?.platform_bot;
  const bot = postMode === "platform" ? (botResult?.bot ?? platformBot ?? null) : botResult?.bot;
  const botReady = postMode === "platform" ? platformBotAvailable : Boolean(botResult?.bot);
  const canVerifyChannel = enabled && botReady && chatID.trim().length > 0;
  const canConnect = enabled && botReady && chatID.trim().length > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Подключить MAX</h2>
            <p className="mt-0.5 text-sm text-muted">
              {postMode === "platform"
                ? "Публикация через общего бота Postilka — добавьте его администратором канала."
                : "Свой бот — проверьте токен, Postilka покажет @username для поиска в MAX."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-muted hover:text-foreground"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
        {!enabled && (
          <p className="text-sm text-amber-700">
            Подключение MAX временно отключено администратором.
          </p>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1">
            <button
              type="button"
              onClick={() => {
                setPostMode("own");
                setBotResult(null);
                setChannelHint(null);
                setError(null);
              }}
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                postMode === "own" ? "bg-zinc-100 font-medium" : "text-muted hover:text-foreground",
              )}
            >
              Свой бот
            </button>
            <button
              type="button"
              disabled={!platformBotAvailable}
              onClick={() => {
                setPostMode("platform");
                setBotToken("");
                setBotResult(null);
                setChannelHint(null);
                setError(null);
              }}
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                postMode === "platform" ? "bg-zinc-100 font-medium" : "text-muted hover:text-foreground",
                !platformBotAvailable && "cursor-not-allowed opacity-50",
              )}
            >
              Бот Postilka
            </button>
          </div>

          {postMode === "platform" && !platformBotAvailable && (
            <p className="text-xs text-muted">
              Публикация через бота Postilka пока недоступна — администратор платформы не настроил общего бота.
            </p>
          )}

          {postMode === "platform" && platformBotAvailable && (
            <p className="text-xs leading-relaxed text-muted">
              Посты пойдут через бота Postilka. Если бот платформы недоступен или отключён, публикации и
              запланированные посты в этом канале тоже остановятся.
            </p>
          )}

          {postMode === "own" && (
          <>
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
          </>
          )}

          {postMode === "platform" && platformBotAvailable && (
            <button
              type="button"
              onClick={() => void handleVerifyBot()}
              disabled={!enabled || loadingBot}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
            >
              {loadingBot && <Loader2 className="h-4 w-4 animate-spin" />}
              Обновить список каналов
            </button>
          )}

          {bot && (
            <div className="rounded-lg border border-border bg-zinc-50/80 px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted">
                    {postMode === "platform" ? "Бот Postilka для MAX" : "Ник для поиска в MAX"}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[15px] font-semibold tracking-tight">
                    {bot.search_query}
                  </p>
                  {(bot.name || bot.user_id) && (
                    <p className="mt-1.5 text-xs text-muted">
                      {bot.name}
                      {bot.name && bot.user_id ? (
                        <span className="mx-1.5 text-border">·</span>
                      ) : null}
                      {bot.user_id ? `id ${bot.user_id}` : null}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => void copyText("nick", bot.search_query)}
                    title={copied === "nick" ? "Скопировано" : "Копировать @ник"}
                    className="rounded-md p-2 text-muted hover:bg-white hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {bot.profile_url && (
                    <a
                      href={bot.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Открыть max.ru"
                      className="rounded-md p-2 text-muted hover:bg-white hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-muted">
                В MAX ищите бота только по этому нику — название и числовой id в поиске не работают.
              </p>
            </div>
          )}

          {botResult?.targets && botResult.targets.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Каналы, где есть бот</p>
              <ul className="space-y-1 rounded-lg border border-border p-2">
                {botResult.targets.map((target) => (
                  <li key={target.external_id}>
                    <button
                      type="button"
                      onClick={() => {
                        setChatID(target.external_id);
                        setChatName(target.title);
                        setChannelHint(null);
                        setError(null);
                      }}
                      className="flex w-full items-start justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-50"
                    >
                      <span>
                        <span className="font-medium">{target.title}</span>
                        <span className="mt-0.5 block font-mono text-xs text-muted">
                          chat_id {target.external_id}
                          {!target.can_post ? " · нет права публикации" : ""}
                        </span>
                      </span>
                      {chatID === target.external_id && (
                        <span className="text-xs text-accent">выбран</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">
                Ссылка max.ru часто не находится через API — выберите канал из списка или вставьте chat_id.
              </p>
            </div>
          )}

          <div className="text-sm">
            <p className="font-medium">
              {postMode === "platform" ? "1." : "2."} Добавьте бота в канал MAX
            </p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-muted">
              <li>
                Канал → <span className="text-foreground">Участники</span> →{" "}
                <span className="text-foreground">Добавить</span>
              </li>
              <li>
                В поиске введите{" "}
                {bot ? (
                  <span className="font-mono text-foreground">{bot.search_query}</span>
                ) : (
                  <span className="text-foreground">@username</span>
                )}{" "}
                из шага 1
              </li>
              <li>
                Канал → <span className="text-foreground">Администраторы</span> → право «Публикация»
              </li>
            </ol>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">
              {postMode === "platform" ? "2." : "3."} Канал
            </span>
            <input
              type="text"
              value={chatID}
              onChange={(e) => setChatID(e.target.value)}
              placeholder="chat_id или channel_postilka"
              disabled={!enabled}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted">
              Надёжнее указать chat_id из списка выше. Публичная ссылка max.ru в API MAX часто не находится.
            </p>
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
            <p
              className={
                channelHint.includes("нет права")
                  ? "text-sm text-amber-700"
                  : "text-sm text-muted"
              }
            >
              {channelHint}
            </p>
          )}
        </div>
        </div>

        <div className="flex gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={() => void handleVerifyChannel()}
            disabled={!enabled || loadingChannel || !canVerifyChannel}
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-zinc-50 disabled:opacity-50"
          >
            {loadingChannel ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Проверить канал"}
          </button>
          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={!enabled || connecting || !canConnect}
            className="flex-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {connecting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Подключить"}
          </button>
        </div>
      </div>
    </div>
  );
}
