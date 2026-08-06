"use client";

import { Mail, Save, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchAdminSMTPSettings,
  sendAdminSMTPTest,
  updateAdminSMTPSettings,
  type SMTPAdminView,
  type SMTPEncryption,
  type SMTPSettings,
} from "@/lib/api";

const DEFAULT_SETTINGS: SMTPSettings = {
  enabled: false,
  from_email: "",
  from_name: "Postilka",
  force_from_email: true,
  force_from_name: true,
  reply_to_from_email: true,
  host: "",
  port: 465,
  encryption: "ssl",
  auto_tls: true,
  auth: true,
  username: "",
};

export function AdminEmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<SMTPSettings>(DEFAULT_SETTINGS);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordSet, setPasswordSet] = useState(false);
  const [yandexHost, setYandexHost] = useState("smtp.yandex.ru");
  const [yandexPort, setYandexPort] = useState(465);
  const [testTo, setTestTo] = useState("");

  const applyView = useCallback((data: SMTPAdminView) => {
    setSettings(data.settings);
    setPasswordSet(data.password_set);
    setYandexHost(data.yandex_preset_host);
    setYandexPort(data.yandex_preset_port);
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminSMTPSettings();
      applyView(data);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Не удалось загрузить email-настройки",
      );
    } finally {
      setLoading(false);
    }
  }, [applyView]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function patch(partial: Partial<SMTPSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
    setSuccess(null);
  }

  function applyYandexPreset() {
    patch({
      host: yandexHost,
      port: yandexPort,
      encryption: "ssl",
      auto_tls: true,
      auth: true,
    });
    setSuccess(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await updateAdminSMTPSettings({
        settings,
        ...(passwordInput.trim() ? { password: passwordInput.trim() } : {}),
      });
      applyView(data);
      setPasswordInput("");
      setSuccess("Email-настройки сохранены");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Не удалось сохранить email-настройки",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSend() {
    if (!testTo.trim()) {
      setError("Укажите email для тестовой отправки");
      return;
    }
    setTesting(true);
    setError(null);
    setTestMessage(null);
    try {
      if (passwordInput.trim()) {
        const saved = await updateAdminSMTPSettings({
          settings,
          password: passwordInput.trim(),
        });
        applyView(saved);
        setPasswordInput("");
      }
      const result = await sendAdminSMTPTest(testTo.trim());
      setTestMessage(result.message);
      if (!result.ok) {
        setError(result.message);
      }
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Не удалось отправить тестовое письмо",
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Email / SMTP
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Упрощённая настройка внешнего SMTP-сервера (например, Yandex 360)
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {success}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : (
        <>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <input
              type="checkbox"
              checked={settings.enabled}
              disabled={saving}
              onChange={(e) => patch({ enabled: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">
              Включить отправку email в системе
            </span>
          </label>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Быстрый пресет</h2>
            <button
              type="button"
              onClick={applyYandexPreset}
              className="mt-3 rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Применить Yandex SMTP
            </button>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Настройки отправителя</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-medium text-slate-500">
                Эл. адрес отправителя
                <input
                  type="email"
                  value={settings.from_email}
                  onChange={(e) => patch({ from_email: e.target.value })}
                  placeholder="hi@postilka.ru"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Имя отправителя
                <input
                  type="text"
                  value={settings.from_name}
                  onChange={(e) => patch({ from_name: e.target.value })}
                  placeholder="Postilka"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-4 space-y-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.force_from_email}
                  onChange={(e) => patch({ force_from_email: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  Всегда использовать этот адрес отправителя
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.force_from_name}
                  onChange={(e) => patch({ force_from_name: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  Всегда использовать это имя отправителя
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.reply_to_from_email}
                  onChange={(e) => patch({ reply_to_from_email: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">
                  Использовать этот адрес как Reply-To
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">SMTP подключение</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-medium text-slate-500">
                SMTP host
                <input
                  type="text"
                  value={settings.host}
                  onChange={(e) => patch({ host: e.target.value })}
                  placeholder="smtp.yandex.ru"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                SMTP port
                <input
                  type="number"
                  min={1}
                  max={65535}
                  value={settings.port}
                  onChange={(e) => patch({ port: Number(e.target.value) || 465 })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500">Encryption</p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                {(["none", "ssl", "tls"] as SMTPEncryption[]).map((mode) => (
                  <label key={mode} className="flex cursor-pointer items-center gap-2 uppercase">
                    <input
                      type="radio"
                      name="smtpEncryption"
                      checked={settings.encryption === mode}
                      onChange={() => patch({ encryption: mode })}
                      className="h-4 w-4 border-slate-300"
                    />
                    {mode}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.auto_tls}
                  onChange={(e) => patch({ auto_tls: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Use Auto TLS</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.auth}
                  onChange={(e) => patch({ auth: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Authentication</span>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-medium text-slate-500">
                SMTP username
                <input
                  type="text"
                  value={settings.username}
                  disabled={!settings.auth}
                  onChange={(e) => patch({ username: e.target.value })}
                  placeholder="hi@postilka.ru"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                SMTP password
                <input
                  type="password"
                  value={passwordInput}
                  disabled={!settings.auth}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={
                    passwordSet ? "•••••••• (сохранён)" : "Введите пароль"
                  }
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Mail className="h-4 w-4" />
              Тестовая отправка
            </h2>
            <div className="mt-3 flex max-w-xl flex-wrap gap-2">
              <input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="email для тестовой отправки"
                className="min-w-[200px] flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={testing || !testTo.trim()}
                onClick={() => void handleTestSend()}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {testing ? "Отправка…" : "Отправить"}
              </button>
            </div>
            {testMessage && !error && (
              <p className="mt-2 text-sm text-green-700">{testMessage}</p>
            )}
          </section>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Сохранение…" : "Сохранить email-настройки"}
          </button>
        </>
      )}
    </div>
  );
}
