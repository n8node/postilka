"use client";

import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  connectChannelOAuth,
  discoverChannelOAuth,
  startChannelOAuth,
  type DiscoveredChannelTarget,
  type SocialProviderKey,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type ConnectOAuthProviderDialogProps = {
  open: boolean;
  provider: SocialProviderKey;
  label: string;
  onClose: () => void;
  onConnected: () => void;
  initialSessionId?: string;
};

export function ConnectOAuthProviderDialog({
  open,
  provider,
  label,
  onClose,
  onConnected,
  initialSessionId,
}: ConnectOAuthProviderDialogProps) {
  const [step, setStep] = useState<"start" | "pick" | "connecting">("start");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [targets, setTargets] = useState<DiscoveredChannelTarget[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const loadDiscover = useCallback(async (sid: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await discoverChannelOAuth(provider, sid);
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
  }, [provider]);

  useEffect(() => {
    if (!open) {
      setStep("start");
      setError(null);
      setSessionId(null);
      setTargets([]);
      setHint(null);
      setSelected({});
      return;
    }
    if (initialSessionId) {
      setSessionId(initialSessionId);
      void loadDiscover(initialSessionId);
    }
  }, [open, initialSessionId, loadDiscover]);

  async function handleOAuthStart() {
    setLoading(true);
    setError(null);
    try {
      const result = await startChannelOAuth(provider);
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
      await connectChannelOAuth(provider, {
        session_id: sessionId,
        targets: picked.map((t) => ({ external_id: t.external_id, name: t.title })),
      });
      onConnected();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось подключить каналы");
      setStep("pick");
    }
  }

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

        <h2 className="text-lg font-semibold">Подключить {label}</h2>
        <p className="mt-1 text-sm text-muted">
          Авторизуйтесь в {label} и выберите каналы для публикации.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === "start" && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted">
              Нажмите кнопку ниже — откроется окно авторизации {label}. После подтверждения
              вы вернётесь сюда и сможете выбрать каналы.
            </p>
            <button
              type="button"
              onClick={() => void handleOAuthStart()}
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Войти через {label}
            </button>
          </div>
        )}

        {(step === "pick" || step === "connecting") && (
          <div className="mt-6 space-y-4">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка каналов…
              </p>
            ) : targets.length === 0 ? (
              <p className="text-sm text-muted">
                {hint ?? "Каналы не найдены. Проверьте права администратора в соцсети."}
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
          </div>
        )}
      </div>
    </div>
  );
}
