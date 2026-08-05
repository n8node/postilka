"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchAdminAuthSettings,
  updateAdminAuthSettings,
} from "@/lib/api";

export function AdminAuthSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [inviteEnabled, setInviteEnabled] = useState(false);
  const [vkLoginEnabled, setVkLoginEnabled] = useState(false);
  const [maxLoginEnabled, setMaxLoginEnabled] = useState(false);
  const [vkClientId, setVkClientId] = useState("");
  const [vkClientSecret, setVkClientSecret] = useState("");
  const [vkClientSecretSet, setVkClientSecretSet] = useState(false);
  const [vkRedirectUri, setVkRedirectUri] = useState("");
  const [maxBotUsername, setMaxBotUsername] = useState("");
  const [maxBotToken, setMaxBotToken] = useState("");
  const [maxBotTokenSet, setMaxBotTokenSet] = useState(false);
  const [maxWebhookSecret, setMaxWebhookSecret] = useState("");
  const [maxWebhookSecretSet, setMaxWebhookSecretSet] = useState(false);
  const [maxWebhookUrl, setMaxWebhookUrl] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminAuthSettings();
      setInviteEnabled(data.invite_registration_enabled);
      setVkLoginEnabled(Boolean(data.vk_login_enabled));
      setMaxLoginEnabled(Boolean(data.max_login_enabled));
      setVkClientId(data.oauth?.vk.client_id ?? "");
      setVkClientSecret("");
      setVkClientSecretSet(Boolean(data.oauth?.vk.client_secret_set));
      setVkRedirectUri(data.oauth?.vk.redirect_uri ?? "");
      setMaxBotUsername(data.oauth?.max.bot_username ?? "");
      setMaxBotToken("");
      setMaxBotTokenSet(Boolean(data.oauth?.max.bot_token_set));
      setMaxWebhookSecret("");
      setMaxWebhookSecretSet(Boolean(data.oauth?.max.webhook_secret_set));
      setMaxWebhookUrl(data.oauth?.max.webhook_url ?? "");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Не удалось загрузить настройки",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleSave() {
    setSettingsSaving(true);
    setError(null);
    try {
      await updateAdminAuthSettings({
        invite_registration_enabled: inviteEnabled,
        vk_login_enabled: vkLoginEnabled,
        max_login_enabled: maxLoginEnabled,
        vk: {
          client_id: vkClientId,
          client_secret: vkClientSecret,
        },
        max: {
          bot_username: maxBotUsername,
          bot_token: maxBotToken,
          webhook_secret: maxWebhookSecret,
        },
      });
      await loadSettings();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить настройки");
    } finally {
      setSettingsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Настройки входа и регистрации
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Способы входа, регистрация по инвайтам и ключи OAuth-провайдеров
          </p>
        </div>
        <button
          type="button"
          disabled={settingsSaving || loading}
          onClick={() => void handleSave()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {settingsSaving ? "Сохранение…" : "Сохранить"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Способы входа и регистрации
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Ключи провайдеров хранятся в базе и доступны только администраторам.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-3">
                <input
                  type="checkbox"
                  checked={inviteEnabled}
                  disabled={settingsSaving}
                  onChange={(e) => setInviteEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  Регистрация по инвайтам
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-3">
                <input
                  type="checkbox"
                  checked={vkLoginEnabled}
                  disabled={settingsSaving}
                  onChange={(e) => setVkLoginEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Вход через ВКонтакте</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-3">
                <input
                  type="checkbox"
                  checked={maxLoginEnabled}
                  disabled={settingsSaving}
                  onChange={(e) => setMaxLoginEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Вход через MAX</span>
              </label>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">VK ID</h2>
              <div className="mt-3 space-y-3">
                <label className="block text-xs font-medium text-slate-500">
                  Client ID
                  <input
                    value={vkClientId}
                    onChange={(e) => setVkClientId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  Сервисный ключ (service_token)
                  <input
                    type="password"
                    value={vkClientSecret}
                    onChange={(e) => setVkClientSecret(e.target.value)}
                    placeholder={
                      vkClientSecretSet
                        ? "Уже задан — оставьте пустым"
                        : "Защищённый ключ из настроек VK ID"
                    }
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                {vkRedirectUri && (
                  <p className="text-xs text-slate-500">
                    Redirect URI для VK ID:{" "}
                    <code className="rounded bg-slate-100 px-1">{vkRedirectUri}</code>
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">MAX бот</h2>
              <div className="mt-3 space-y-3">
                <label className="block text-xs font-medium text-slate-500">
                  Username бота
                  <input
                    value={maxBotUsername}
                    onChange={(e) => setMaxBotUsername(e.target.value)}
                    placeholder="my_bot"
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  Bot token
                  <input
                    type="password"
                    value={maxBotToken}
                    onChange={(e) => setMaxBotToken(e.target.value)}
                    placeholder={
                      maxBotTokenSet ? "Уже задан — оставьте пустым" : "Токен бота"
                    }
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  Webhook secret
                  <input
                    type="password"
                    value={maxWebhookSecret}
                    onChange={(e) => setMaxWebhookSecret(e.target.value)}
                    placeholder={
                      maxWebhookSecretSet
                        ? "Уже задан — оставьте пустым"
                        : "Секрет для X-Max-Bot-Api-Secret"
                    }
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                {maxWebhookUrl && (
                  <p className="text-xs text-slate-500">
                    Webhook URL:{" "}
                    <code className="rounded bg-slate-100 px-1">{maxWebhookUrl}</code>
                  </p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
