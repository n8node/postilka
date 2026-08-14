"use client";

import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchAdminMetrikaSettings,
  updateAdminMetrikaSettings,
  type MetrikaPlatformAdminView,
} from "@/lib/api";

function secretPlaceholder(set: boolean, hint: string, empty: string) {
  if (set && hint) return `Новый Client Secret (текущий: ${hint})`;
  if (set) return "Новый Client Secret (текущий: ••••)";
  return empty;
}

export function AdminMetrikaPage({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [clientSecretSet, setClientSecretSet] = useState(false);
  const [clientSecretHint, setClientSecretHint] = useState("");
  const [oauthClientID, setOAuthClientID] = useState("");
  const [oauthClientSecret, setOAuthClientSecret] = useState("");
  const [oauthRedirectURI, setOAuthRedirectURI] = useState("");

  const applyView = useCallback((data: MetrikaPlatformAdminView) => {
    setEnabled(data.enabled);
    setClientSecretSet(data.client_secret_set);
    setClientSecretHint(data.client_secret_hint || "");
    setOAuthClientID(data.oauth_client_id || "");
    setOAuthRedirectURI(data.oauth_redirect_uri || "");
  }, []);

  useEffect(() => {
    fetchAdminMetrikaSettings()
      .then(applyView)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить настройки"),
      )
      .finally(() => setLoading(false));
  }, [applyView]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await updateAdminMetrikaSettings({
        enabled,
        oauth_client_id: oauthClientID.trim(),
        ...(oauthClientSecret.trim() ? { oauth_client_secret: oauthClientSecret.trim() } : {}),
      });
      applyView(data);
      setOAuthClientSecret("");
      setSuccess("Настройки Яндекс Метрики сохранены");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Загрузка…</p>;
  }

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-3xl space-y-6"}>
      <div>
        {embedded ? (
          <h2 className="text-lg font-semibold text-slate-900">Яндекс Метрика — OAuth</h2>
        ) : (
          <h1 className="text-2xl font-semibold text-slate-900">Яндекс Метрика — OAuth</h1>
        )}
        <p className="mt-1 text-sm text-slate-500">
          OAuth-приложение платформы для подключения счётчиков пользователями. Создайте приложение в{" "}
          <a
            href="https://oauth.yandex.ru/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            oauth.yandex.ru
          </a>{" "}
          с правом «metrika:read».
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          {success}
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">Включить подключение Метрики</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Пользователи смогут привязать счётчик в разделе «Аналитика».
            </span>
          </span>
        </label>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Client ID</label>
          <input
            type="text"
            value={oauthClientID}
            onChange={(e) => setOAuthClientID(e.target.value)}
            placeholder="ID OAuth-приложения Яндекса"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Client Secret</label>
          <input
            type="password"
            autoComplete="new-password"
            value={oauthClientSecret}
            onChange={(e) => setOAuthClientSecret(e.target.value)}
            placeholder={secretPlaceholder(clientSecretSet, clientSecretHint, "Секрет OAuth-приложения")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Redirect URI</label>
          <input
            type="text"
            readOnly
            value={oauthRedirectURI}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-600"
          />
          <p className="mt-1 text-xs text-slate-500">
            Укажите этот адрес в настройках OAuth-приложения Яндекса как Callback URL.
          </p>
        </div>
      </section>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </div>
  );
}
