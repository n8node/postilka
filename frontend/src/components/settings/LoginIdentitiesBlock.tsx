"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchLoginIdentities,
  unlinkLoginIdentity,
  type LoginIdentity,
} from "@/lib/api";
import { SocialLoginButtons } from "@/components/auth/SocialLoginButtons";

const providerLabels: Record<string, string> = {
  vk: "ВКонтакте",
  max: "MAX",
};

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
    if (!window.confirm(`Отвязать ${providerLabels[provider] ?? provider}?`)) return;
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

  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Вход через соцсети</h2>
        <p className="mt-2 text-sm text-muted">Загрузка…</p>
      </section>
    );
  }

  if (!vkEnabled && !maxEnabled) {
    return null;
  }

  const linkedProviders = new Set(identities.map((i) => i.provider));

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold">Вход через соцсети</h2>
      <p className="mt-1 text-sm text-muted">
        Привяжите аккаунты для быстрого входа без пароля.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-4 space-y-3">
        {identities.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-medium">
                {providerLabels[item.provider] ?? item.provider}
              </p>
              <p className="text-xs text-muted">
                {item.display_name || item.provider_user_id}
              </p>
            </div>
            <button
              type="button"
              disabled={unlinking === item.provider}
              onClick={() => void handleUnlink(item.provider)}
              className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-bg disabled:opacity-50"
            >
              Отвязать
            </button>
          </li>
        ))}
        {identities.length === 0 && (
          <li className="text-sm text-muted">Привязанных аккаунтов пока нет.</li>
        )}
      </ul>

      {(vkEnabled && !linkedProviders.has("vk")) ||
      (maxEnabled && !linkedProviders.has("max")) ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-muted">Привязать аккаунт</p>
          <SocialLoginButtons
            mode="link"
            nextPath="/settings"
            onLinkStart={(_provider, data) => {
              if (data.deep_link) {
                setMaxLinkHint(
                  "Откройте MAX, нажмите «Запустить» у бота и вернитесь сюда — привязка обновится автоматически.",
                );
                window.open(data.deep_link, "_blank", "noopener,noreferrer");
                window.setTimeout(() => void load(), 4000);
              }
            }}
          />
          {maxLinkHint && (
            <p className="mt-2 text-xs text-muted">{maxLinkHint}</p>
          )}
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted">
        После привязки VK вы вернётесь в настройки автоматически.
      </p>
    </section>
  );
}
