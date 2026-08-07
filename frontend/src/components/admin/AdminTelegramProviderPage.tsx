"use client";

import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchAdminTelegramProviderSettings,
  updateAdminTelegramProviderSettings,
  type TelegramProviderAdminView,
  type TelegramProviderSettings,
} from "@/lib/api";

const DEFAULT_SETTINGS: TelegramProviderSettings = {
  enabled: true,
  proxy_enabled: false,
  proxy_active_url: "",
  proxy_auto_failover: true,
  proxy_urls: [],
  connect_help_text: "",
};

export function AdminTelegramProviderPage() {
  const [settings, setSettings] = useState<TelegramProviderSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applyView = useCallback((data: TelegramProviderAdminView) => {
    const proxyUrls = data.settings.proxy_urls || [];
    const proxyActive =
      data.settings.proxy_active_url && proxyUrls.includes(data.settings.proxy_active_url)
        ? data.settings.proxy_active_url
        : "";
    setSettings({
      ...data.settings,
      proxy_urls: proxyUrls,
      proxy_active_url: proxyActive,
    });
  }, []);

  useEffect(() => {
    fetchAdminTelegramProviderSettings()
      .then(applyView)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить настройки"),
      )
      .finally(() => setLoading(false));
  }, [applyView]);

  function patch(partial: Partial<TelegramProviderSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
    setSuccess(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await updateAdminTelegramProviderSettings(settings);
      applyView(data);
      setSuccess("Настройки Telegram-провайдера сохранены");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  const proxyOptions = settings.proxy_urls.filter(Boolean);
  const proxySelectValue =
    settings.proxy_active_url && proxyOptions.includes(settings.proxy_active_url)
      ? settings.proxy_active_url
      : "";

  if (loading) {
    return <p className="text-sm text-slate-500">Загрузка настроек Telegram-провайдера…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Telegram — каналы пользователей</h1>
        <p className="mt-1 text-sm text-slate-500">
          Пользователи подключают свой бот и chat_id. Здесь — включение провайдера, прокси и инструкция.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-medium text-slate-900">Провайдер</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
            className="rounded border-slate-300"
          />
          Разрешить пользователям подключать Telegram-каналы
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-medium text-slate-900">Прокси для Telegram Bot API</h2>
        <p className="text-xs text-slate-500">
          Используется при проверке токена, поиске чатов и публикации от имени ботов пользователей.
        </p>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.proxy_enabled}
            onChange={(e) => patch({ proxy_enabled: e.target.checked })}
            className="rounded border-slate-300"
          />
          Включить прокси для запросов к Telegram API
        </label>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Список прокси (по одному URL на строку)
          </label>
          <textarea
            value={settings.proxy_urls.join("\n")}
            onChange={(e) => {
              const proxy_urls = e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
              const proxy_active_url =
                settings.proxy_active_url && proxy_urls.includes(settings.proxy_active_url)
                  ? settings.proxy_active_url
                  : "";
              patch({ proxy_urls, proxy_active_url });
            }}
            rows={3}
            placeholder="http://user:pass@5.35.83.120:3128"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm"
          />
        </div>

        {proxyOptions.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Активный прокси</label>
            <select
              value={proxySelectValue}
              onChange={(e) => patch({ proxy_active_url: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Авто: первый в списке</option>
              {proxyOptions.map((url) => (
                <option key={url} value={url}>
                  {url}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.proxy_auto_failover}
            onChange={(e) => patch({ proxy_auto_failover: e.target.checked })}
            className="rounded border-slate-300"
          />
          Автоматически пробовать следующий прокси при ошибке
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-medium text-slate-900">Инструкция для пользователей</h2>
        <p className="text-xs text-slate-500">
          Показывается в диалоге «Подключить Telegram» в приложении.
        </p>
        <textarea
          value={settings.connect_help_text}
          onChange={(e) => patch({ connect_help_text: e.target.value })}
          rows={8}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Сохранение…" : "Сохранить настройки"}
        </button>
      </div>
    </div>
  );
}
