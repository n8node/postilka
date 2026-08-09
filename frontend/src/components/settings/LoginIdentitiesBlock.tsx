"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

function oauthStatusMessage(
  oauthError: string | null,
  oauthLinked: string | null,
  oauthDetail: string | null,
) {
  if (oauthLinked === "vk") {
    return { type: "success" as const, text: "Аккаунт ВКонтакте успешно привязан." };
  }
  if (oauthLinked === "max") {
    return { type: "success" as const, text: "Аккаунт MAX успешно привязан." };
  }
  if (!oauthError) return null;

  switch (oauthError) {
    case "ip_denied":
      return {
        type: "error" as const,
        text: "VK отклонил запрос. Для публичного приложения IP whitelist не нужен — проверьте, что приложение «Публичное», а не «Конфиденциальное».",
      };
    case "invalid_token":
      return {
        type: "error" as const,
        text: "Неверный Защищённый ключ (client_secret). Проверьте значение в админке Postilka.",
      };
    case "redirect_uri":
      return {
        type: "error" as const,
        text: "Redirect URI не совпадает с настройками VK ID. Скопируйте URI из админки Postilka в «Доверенный redirect URL» без изменений.",
      };
    case "session_expired":
    case "code_expired":
      return {
        type: "error" as const,
        text: "Сессия VK истекла. Нажмите «Привязать» ещё раз и подтвердите быстрее.",
      };
    case "max_session_expired":
      return {
        type: "error" as const,
        text: "Сессия MAX истекла. Нажмите «Привязать» ещё раз и запустите бота быстрее.",
      };
    case "max_not_configured":
      return {
        type: "error" as const,
        text: "MAX не настроен: укажите username и token бота в админке и сохраните настройки.",
      };
    case "max_webhook":
      return {
        type: "error" as const,
        text: "Webhook MAX не настроен. Сохраните настройки бота в админке Postilka ещё раз.",
      };
    case "link_conflict":
      return {
        type: "error" as const,
        text: "Этот аккаунт VK уже привязан к другому пользователю Postilka.",
      };
    case "invalid_callback":
    case "invalid_state":
      return {
        type: "error" as const,
        text: "Некорректный ответ VK. Попробуйте привязать аккаунт заново.",
      };
    case "network_error":
      return {
        type: "error" as const,
        text: "Сервер Postilka не может связаться с VK ID (id.vk.ru). Проверьте исходящий HTTPS с сервера или обратитесь к хостингу.",
      };
    case "access_denied":
      return {
        type: "error" as const,
        text: "VK не выдал доступ. Подтвердите разрешения в окне VK ID.",
      };
    case "already_linked":
      return {
        type: "error" as const,
        text: "VK уже привязан к этому аккаунту Postilka.",
      };
    case "invalid_session":
      return {
        type: "error" as const,
        text: "Сессия привязки повреждена. Нажмите «Привязать» ещё раз.",
      };
    default: {
      const detail = oauthDetail?.trim();
      return {
        type: "error" as const,
        text: detail
          ? `Не удалось привязать аккаунт: ${detail}`
          : "Не удалось привязать аккаунт. Проверьте настройки VK ID в админке Postilka.",
      };
    }
  }
}

export function LoginIdentitiesBlock({ embedded = false }: { embedded?: boolean }) {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("oauth_error");
  const oauthLinked = searchParams.get("oauth_linked");
  const oauthDetail = searchParams.get("oauth_detail");
  const statusMessage = oauthStatusMessage(oauthError, oauthLinked, oauthDetail);
  const [loading, setLoading] = useState(true);
  const [identities, setIdentities] = useState<LoginIdentity[]>([]);
  const [vkEnabled, setVkEnabled] = useState(false);
  const [maxEnabled, setMaxEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);

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
    window.location.href = linkStartURL(provider, "/settings?section=login");
  }

  function isProviderEnabled(provider: "vk" | "max") {
    return provider === "vk" ? vkEnabled : maxEnabled;
  }

  function identityFor(provider: "vk" | "max") {
    return identities.find((item) => item.provider === provider);
  }

  const content = (
    <>
      {!embedded && (
        <>
          <h2 className="text-sm font-semibold">Вход через соцсети</h2>
          <p className="mt-1 text-sm text-muted">
            Привяжите аккаунты для быстрого входа без пароля.
          </p>
        </>
      )}

      {embedded && (
        <div>
          <h2 className="text-lg font-semibold text-text">Вход через соцсети</h2>
          <p className="mt-1 text-sm text-muted">
            Привяжите аккаунты для быстрого входа без пароля.
          </p>
        </div>
      )}

      {statusMessage && (
        <p
          className={`${embedded ? "mt-4" : "mt-3"} text-sm ${
            statusMessage.type === "success" ? "text-green-700" : "text-red-600"
          }`}
        >
          {statusMessage.text}
        </p>
      )}

      {error && (
        <p className={`${embedded ? "mt-4" : "mt-3"} text-sm text-red-600`}>{error}</p>
      )}

      {loading ? (
        <p className={`${embedded ? "mt-4" : "mt-4"} text-sm text-muted`}>Загрузка…</p>
      ) : (
        <ul className={`${embedded ? "mt-4" : "mt-4"} space-y-3`}>
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

      {!loading && !vkEnabled && !maxEnabled && (
        <p className="mt-3 text-xs text-muted">
          Чтобы привязать аккаунты, администратор должен включить VK или MAX в
          разделе «Вход и регистрация» и указать ключи провайдеров.
        </p>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-0">{content}</div>;
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      {content}
    </section>
  );
}
