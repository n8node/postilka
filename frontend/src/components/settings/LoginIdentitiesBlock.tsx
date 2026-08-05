"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchLoginIdentities,
  unlinkLoginIdentity,
  type LoginIdentity,
} from "@/lib/api";

const providers = [
  { id: "vk" as const, label: "ВКонтакте" },
  { id: "max" as const, label: "MAX" },
];

function linkStartURL(provider: "vk" | "max", nextPath: string) {
  const params = new URLSearchParams({ next: nextPath });
  return `/app/api/v1/auth/oauth/${provider}/link?${params.toString()}`;
}

export function LoginIdentitiesBlock() {
  const [loading, setLoading] = useState(true);
  const [identities, setIdentities] = useState<LoginIdentity[]>([]);
  const [vkEnabled, setVkEnabled] = useState(false);
  const [maxEnabled, setMaxEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [maxLinkHint, setMaxLinkHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLoginIdentities();
      setIdentities(data.identities ?? []);
      setVkEnabled(Boolean(data.methods?.vk_login_enabled));
      setMaxEnabled(Boolean(data.methods?.max_login_enabled));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить привязки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUnlink(provider: "vk" | "max") {
    const label = providers.find((p) => p.id === provider)?.label ?? provider;
    if (!window.confirm(`Отвязать ${label}?`)) return;
    setUnlinking(provider);
    setError(null);
    try {
      await unlinkLoginIdentity(provider);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось отвязать аккаунт");
    } finally {
      setUnlinking(null);
    }
  }

  async function handleLink(provider: "vk" | "max") {
    if (provider === "vk") {
      window.location.href = linkStartURL("vk", "/settings");
      return;
    }
    try {
      const res = await fetch(linkStartURL("max", "/settings"), {
        credentials: "include",
      });
      const data = await res.json();
      if (data.deep_link) {
        setMaxLinkHint(
          "Откройте MAX, нажмите «Запустить» у бота и вернитесь сюда — привязка обновится автоматически.",
        );
        window.open(data.deep_link, "_blank", "noopener,noreferrer");
        window.setTimeout(() => void load(), 4000);
      }
    } catch {
      setError("Не удалось начать привязку MAX");
    }
  }

  function isProviderEnabled(provider: "vk" | "max") {
    return provider === "vk" ? vkEnabled : maxEnabled;
  }

  function identityFor(provider: "vk" | "max") {
    return identities.find((item) => item.provider === provider);
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold">Вход через соцсети</h2>
      <p className="mt-1 text-sm text-muted">
        Привяжите аккаунты для быстрого входа без пароля. Доступно всем
        пользователям, включая администраторов.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-muted">Загрузка…</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {providers.map((provider) => {
            const linked = identityFor(provider.id);
            const enabled = isProviderEnabled(provider.id);

            return (
              <li
                key={provider.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{provider.label}</p>
                  {linked ? (
                    <p className="text-xs text-muted">
                      {linked.display_name || linked.provider_user_id}
                    </p>
                  ) : enabled ? (
                    <p className="text-xs text-muted">Не привязан</p>
                  ) : (
                    <p className="text-xs text-muted">
                      Недоступно — включите и настройте в админке
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  {linked ? (
                    <button
                      type="button"
                      disabled={unlinking === provider.id}
                      onClick={() => void handleUnlink(provider.id)}
                      className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-bg disabled:opacity-50"
                    >
                      Отвязать
                    </button>
                  ) : enabled ? (
                    <button
                      type="button"
                      onClick={() => void handleLink(provider.id)}
                      className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Привязать
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {maxLinkHint && (
        <p className="mt-3 text-xs text-muted">{maxLinkHint}</p>
      )}

      {!loading && !vkEnabled && !maxEnabled && (
        <p className="mt-3 text-xs text-muted">
          Чтобы привязать аккаунты, администратор должен включить VK или MAX в
          разделе «Вход и регистрация» и указать ключи провайдеров.
        </p>
      )}
    </section>
  );
}
