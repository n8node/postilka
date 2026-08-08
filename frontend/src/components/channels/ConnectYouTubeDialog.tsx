"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ContextHelpLinks } from "@/components/support/ContextHelpLinks";
import { ConnectHelpSteps } from "@/components/channels/ConnectHelpSteps";
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

const YOUTUBE_REDIRECT_URI =
  "https://postilka.ru/app/api/v1/channels/oauth/youtube/callback";

type ConnectYouTubeDialogProps = {
  open: boolean;
  onClose: () => void;
  onConnected: (connected?: ChannelListItem[]) => void;
  initialSessionId?: string;
};

export function ConnectYouTubeDialog({
  open,
  onClose,
  onConnected,
  initialSessionId,
}: ConnectYouTubeDialogProps) {
  const [providerInfo, setProviderInfo] = useState<ChannelProviderInfo | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [showDetailedHelp, setShowDetailedHelp] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [step, setStep] = useState<"start" | "pick" | "connecting">("start");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [targets, setTargets] = useState<DiscoveredChannelTarget[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const ytProvider = providerInfo?.providers.find((p) => p.provider === "youtube");
  const enabled = ytProvider?.enabled ?? false;

  const supportInfo = useMemo((): ChannelProviderInfo | null => {
    if (!providerInfo || !ytProvider) return providerInfo;
    return {
      ...providerInfo,
      connect_help_text: ytProvider.connect_help_text,
      connect_help_url: ytProvider.connect_help_url,
      docs_url: ytProvider.docs_url,
      support_telegram_username: ytProvider.support_telegram_username,
      support_telegram_url: ytProvider.support_telegram_url,
      support_email: ytProvider.support_email,
      support_hours_text: ytProvider.support_hours_text,
    };
  }, [providerInfo, ytProvider]);

  const reset = useCallback(() => {
    setClientId("");
    setClientSecret("");
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
      const result: ChannelDiscoverResult = await discoverChannelOAuth("youtube", sid);
      setTargets(result.targets);
      setHint(result.hint ?? null);
      setStep("pick");
      const initial: Record<string, boolean> = {};
      for (const t of result.targets) {
        if (t.can_post) initial[t.external_id] = true;
      }
      setSelected(initial);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить список каналов");
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
    const id = clientId.trim();
    const secret = clientSecret.trim();
    if (!id || !secret) {
      setError("Укажите OAuth Client ID и Client Secret Google");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await startChannelOAuth("youtube", {
        oauth_client_id: id,
        oauth_client_secret: secret,
      });
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
      setError("Выберите хотя бы один канал");
      return;
    }
    setStep("connecting");
    setError(null);
    try {
      const result = await connectChannelOAuth("youtube", {
        session_id: sessionId,
        targets: picked.map((t) => ({ external_id: t.external_id, name: t.title })),
      });
      onConnected(result.connected);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось подключить каналы");
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
              <h2 className="text-lg font-semibold">Подключить YouTube</h2>
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
                Подключение YouTube временно отключено администратором.
              </p>
            )}

            <ContextHelpLinks
              helpURL={ytProvider?.connect_help_url}
              onSupportClick={() => setSupportOpen(true)}
            />

            {ytProvider?.connect_help_text && step === "start" && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowDetailedHelp((v) => !v)}
                  className="text-sm text-accent hover:underline"
                >
                  {showDetailedHelp ? "Скрыть шаги" : "Показать шаги подключения"}
                </button>
                {showDetailedHelp && (
                  <div className="mt-3 rounded-lg border border-border bg-zinc-50 px-4 py-3">
                    <ConnectHelpSteps text={ytProvider.connect_help_text} />
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
                <p className="text-sm text-muted">
                  В Google Cloud Console включите YouTube Data API v3 и создайте OAuth Client (Web).
                  Redirect URI:{" "}
                  <code className="rounded bg-zinc-100 px-1 text-xs">{YOUTUBE_REDIRECT_URI}</code>
                </p>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">OAuth Client ID</span>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    disabled={!enabled}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    autoComplete="off"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium">OAuth Client Secret</span>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    disabled={!enabled}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    autoComplete="off"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleOAuthStart()}
                  disabled={loading || !enabled}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Войти через Google
                </button>
              </>
            )}

            {(step === "pick" || step === "connecting") && (
              <>
                {loading ? (
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка каналов…
                  </p>
                ) : targets.length === 0 ? (
                  <p className="text-sm text-muted">
                    {hint ?? "Каналы не найдены. Проверьте права на YouTube-канал."}
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
        context="youtube_connect"
      />
    </>
  );
}
