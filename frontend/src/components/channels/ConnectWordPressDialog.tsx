"use client";

import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  connectWordPressChannel,
  fetchChannelProviderInfo,
  type ChannelListItem,
  type ChannelProviderInfo,
} from "@/lib/api";

type ConnectWordPressDialogProps = {
  open: boolean;
  onClose: () => void;
  onConnected: (connected: ChannelListItem[]) => void;
};

export function ConnectWordPressDialog({
  open,
  onClose,
  onConnected,
}: ConnectWordPressDialogProps) {
  const [providerInfo, setProviderInfo] = useState<ChannelProviderInfo | null>(null);
  const [siteURL, setSiteURL] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setSiteURL("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
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
    if (!siteURL.trim()) {
      setError("Укажите адрес сайта WordPress");
      return;
    }
    if (!username.trim()) {
      setError("Укажите имя пользователя WordPress");
      return;
    }
    if (!password.trim()) {
      setError("Укажите пароль приложения");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const result = await connectWordPressChannel({
        site_url: siteURL.trim(),
        username: username.trim(),
        application_password: password,
      });
      onConnected(result.connected ?? []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Не удалось подключить WordPress");
      }
    } finally {
      setConnecting(false);
    }
  }

  if (!open) return null;

  const helpText =
    providerInfo?.wordpress_connect_help_text ??
    "Создайте пароль приложения в WordPress: Пользователи → Профиль → Пароли приложений.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
        role="dialog"
        aria-labelledby="connect-wordpress-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded p-1 text-muted hover:bg-zinc-100"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="connect-wordpress-title" className="text-lg font-semibold text-foreground">
          Подключить WordPress
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm text-muted">{helpText}</p>

        <label className="mt-4 block text-sm font-medium text-foreground">
          Адрес сайта
          <input
            type="url"
            value={siteURL}
            onChange={(e) => setSiteURL(e.target.value)}
            placeholder="https://blog.example.com"
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-foreground">
          Имя пользователя
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="editor"
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-foreground">
          Пароль приложения
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
              autoComplete="off"
              className="w-full rounded-md border border-border bg-white py-2 pl-3 pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted"
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
