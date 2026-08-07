"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContextHelpLinks } from "@/components/support/ContextHelpLinks";
import { SupportSheet } from "@/components/support/SupportSheet";
import { ChannelAvatar } from "@/components/channels/ChannelAvatar";
import {
  ApiError,
  connectChannelOAuth,
  discoverChannelOAuth,
  fetchChannelProviderInfo,
  startChannelOAuth,
  type ChannelDiscoverResult,
  type ChannelListItem,
  type ChannelProviderInfo,
  type DiscoveredChannelTarget,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type ConnectVKDialogProps = {
  open: boolean;
  onClose: () => void;
  onConnected: (connected?: ChannelListItem[]) => void;
  initialSessionId?: string;
};

export function ConnectVKDialog({
  open,
  onClose,
  onConnected,
  initialSessionId,
}: ConnectVKDialogProps) {
  const [providerInfo, setProviderInfo] = useState<ChannelProviderInfo | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [showDetailedHelp, setShowDetailedHelp] = useState(false);
  const [oauthMode, setOauthMode] = useState<"own" | "platform">("own");
  const [vkAppId, setVkAppId] = useState("");
  const [vkAppSecret, setVkAppSecret] = useState("");
  const [step, setStep] = useState<"start" | "pick" | "connecting">("start");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [targets, setTargets] = useState<DiscoveredChannelTarget[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const vkProvider = providerInfo?.providers.find((p) => p.provider === "vk");
  const platformOAuthAvailable = Boolean(vkProvider?.platform_oauth_enabled);
  const enabled = vkProvider?.enabled ?? false;

  const supportInfo = useMemo((): ChannelProviderInfo | null => {
    if (!providerInfo || !vkProvider) return providerInfo;
    return {
      ...providerInfo,
      connect_help_text: vkProvider.connect_help_text,
      connect_help_url: vkProvider.connect_help_url,
      docs_url: vkProvider.docs_url,
      support_telegram_username: vkProvider.support_telegram_username,
      support_telegram_url: vkProvider.support_telegram_url,
      support_email: vkProvider.support_email,
      support_hours_text: vkProvider.support_hours_text,
    };
  }, [providerInfo, vkProvider]);

  const reset = useCallback(() => {
    setOauthMode("own");
    setVkAppId("");
    setVkAppSecret("");
    setStep("start");
    setError(null);
    setSessionId(null);
    setTargets([]);
    setHint(null);
    setSelected({});
    setSupportOpen(false);
    setShowDetailedHelp(false);
  }, []);

  const loadDiscover = useCallback(async (sid: string) => {
    setLoading(true);
    setError(null);
    try {
      const result: ChannelDiscoverResult = await discoverChannelOAuth("vk", sid);
      setTargets(result.targets);
      setHint(result.hint ?? null);
      setStep("pick");
      const initial: Record<string, boolean> = {};
      for (const t of result.targets) {
        if (t.can_post) initial[t.external_id] = true;
      }
      setSelected(initial);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить список сообществ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    fetchChannelProviderInfo().then(setProviderInfo).catch(() => {});
    if (initialSessionId) {
      setSessionId(initialSessionId);
      void loadDiscover(initialSessionId);
    }
  }, [open, initialSessionId, loadDiscover, reset]);

  async function handleOAuthStart() {
    if (oauthMode === "own") {
      const appId = vkAppId.trim();
      const appSecret = vkAppSecret.trim();
      if (!appId || !appSecret) {
        setError("Укажите ID приложения VK и защищённый ключ");
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const result =
        oauthMode === "own"
          ? await startChannelOAuth("vk", {
              oauth_app_mode: "own",
              oauth_client_id: vkAppId.trim(),
              oauth_client_secret: vkAppSecret.trim(),
            })
          : await startChannelOAuth("vk", { oauth_app_mode: "platform" });
      window.location.href = result.redirect_url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось начать OAuth");
      setLoading(false);
    }
  }

  async function handleConnect() {
    if (!sessionId) return;
    const picked = targets.filter((t) => selected[t.external_id]);
    if (picked.length === 0) {
      setError("Выберите хотя бы одно сообщество");
      return;
    }
    setStep("connecting");
    setError(null);
    try {
      const result = await connectChannelOAuth("vk", {
        session_id: sessionId,
        targets: picked.map((t) => ({ external_id: t.external_id, name: t.title })),
      });
      onConnected(result.connected);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось подключить сообщества");
      setStep("pick");
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">Подключить VK</h2>
              <p className="mt-0.5 text-sm text-muted">
                {oauthMode === "platform"
                  ? "Вход через приложение Postilka — выберите сообщества, где вы администратор."
                  : "Своё приложение VK — укажите ключи, войдите и выберите сообщества."}
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
                Подключение VK временно отключено администратором.
              </p>
            )}

            <ContextHelpLinks
              helpURL={vkProvider?.connect_help_url}
              onSupportClick={() => setSupportOpen(true)}
            />

            {vkProvider?.connect_help_text && step === "start" && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowDetailedHelp((v) => !v)}
                  className="text-sm text-accent hover:underline"
                >
                  {showDetailedHelp ? "Скрыть шаги" : "Показать шаги подключения"}
                </button>
                {showDetailedHelp && (
                  <div className="mt-2 rounded-lg border border-border bg-zinc-50 px-3 py-2 text-sm whitespace-pre-line text-muted">
                    {vkProvider.connect_help_text}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {step === "start" && (
              <>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOauthMode("own");
                      setError(null);
                    }}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm",
                      oauthMode === "own" ? "bg-zinc-100 font-medium" : "text-muted hover:text-foreground",
                    )}
                  >
                    Своё приложение
                  </button>
                  <button
                    type="button"
                    disabled={!platformOAuthAvailable}
                    onClick={() => {
                      setOauthMode("platform");
                      setError(null);
                    }}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm",
                      oauthMode === "platform"
                        ? "bg-zinc-100 font-medium"
                        : "text-muted hover:text-foreground",
                      !platformOAuthAvailable && "cursor-not-allowed opacity-50",
                    )}
                  >
                    Приложение Postilka
                  </button>
                </div>

                {oauthMode === "platform" && !platformOAuthAvailable && (
                  <p className="text-xs text-muted">
                    Вход через приложение Postilka пока недоступен — администратор не настроил OAuth
                    приложение платформы.
                  </p>
                )}

                {oauthMode === "own" && (
                  <>
                    <p className="text-sm text-muted">
                      Создайте Standalone-приложение на{" "}
                      <a
                        href="https://vk.com/apps?act=manage"
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent underline"
                      >
                        vk.com/apps
                      </a>
                      . Redirect URI:{" "}
                      <code className="rounded bg-zinc-100 px-1 text-xs">
                        https://postilka.ru/app/api/v1/channels/oauth/vk/callback
                      </code>
                    </p>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium">ID приложения</span>
                      <input
                        type="text"
                        value={vkAppId}
                        onChange={(e) => setVkAppId(e.target.value)}
                        disabled={!enabled}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                        autoComplete="off"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-sm font-medium">Защищённый ключ</span>
                      <input
                        type="password"
                        value={vkAppSecret}
                        onChange={(e) => setVkAppSecret(e.target.value)}
                        disabled={!enabled}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                        autoComplete="off"
                      />
                    </label>
                  </>
                )}

                {oauthMode === "platform" && platformOAuthAvailable && (
                  <p className="text-sm text-muted">
                    Нажмите кнопку ниже — откроется окно авторизации VK через приложение Postilka.
                    После входа выберите сообщества для публикации на стене.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handleOAuthStart()}
                  disabled={!enabled || loading || (oauthMode === "platform" && !platformOAuthAvailable)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Войти через VK
                </button>
              </>
            )}

            {(step === "pick" || step === "connecting") && (
              <>
                {loading ? (
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка сообществ…
                  </p>
                ) : targets.length === 0 ? (
                  <p className="text-sm text-muted">
                    {hint ?? "Сообщества не найдены. Проверьте права администратора в VK."}
                  </p>
                ) : (
                  <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                    {targets.map((t) => (
                      <li key={t.external_id}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-zinc-50",
                            !t.can_post && "opacity-50",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={!!selected[t.external_id]}
                            disabled={!t.can_post || step === "connecting"}
                            onChange={(e) =>
                              setSelected((prev) => ({
                                ...prev,
                                [t.external_id]: e.target.checked,
                              }))
                            }
                            className="rounded border-border"
                          />
                          <ChannelAvatar name={t.title} avatarUrl={t.avatar_url} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{t.title}</span>
                            <span className="block truncate text-xs text-muted">{t.external_id}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                {targets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleConnect()}
                    disabled={step === "connecting"}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {step === "connecting" && <Loader2 className="h-4 w-4 animate-spin" />}
                    Подключить выбранные
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <SupportSheet
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        info={supportInfo}
        context="vk_connect"
      />
    </>
  );
}
