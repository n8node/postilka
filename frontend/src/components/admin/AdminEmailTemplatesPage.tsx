"use client";

import { Eye, Plus, Save, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  adminEmailTemplatePreviewURL,
  ApiError,
  fetchAdminEmailTemplates,
  sendAdminEmailTemplateTest,
  updateAdminEmailTemplates,
  type EmailFooterLink,
  type EmailSocialLink,
  type EmailTemplateSettings,
} from "@/lib/api";

const DEFAULT_SETTINGS: EmailTemplateSettings = {
  logo_url: "",
  logo_alt: "Postilka",
  primary_color: "#2563eb",
  background_color: "#eef1f6",
  card_radius_px: 20,
  signature_title: "Делаем автопостинг проще!",
  signature_team: "Команда сервиса Postilka",
  footer_links: [
    { label: "Возможности", url: "https://postilka.ru" },
    { label: "Документация", url: "https://postilka.ru/docs" },
    { label: "Полезное", url: "https://postilka.ru/blog" },
  ],
  social_links: [
    { label: "Telegram", url: "https://t.me/postilka", icon_url: "" },
    { label: "VK", url: "https://vk.com/postilka", icon_url: "" },
    { label: "Дзен", url: "https://dzen.ru/postilka", icon_url: "" },
  ],
  app_download_text: "Скачайте приложение Postilka",
  app_store_url: "",
  google_play_url: "",
  footer_legal_text:
    "Вы получили это письмо, потому что зарегистрировались в сервисе Postilka или подписались на рассылку.",
  unsubscribe_text: "Отписаться от рассылки",
  unsubscribe_url: "https://postilka.ru/app/settings",
};

function emptyFooterLink(): EmailFooterLink {
  return { label: "", url: "" };
}

function emptySocialLink(): EmailSocialLink {
  return { label: "", url: "", icon_url: "" };
}

export function AdminEmailTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<EmailTemplateSettings>(DEFAULT_SETTINGS);
  const [previewKey, setPreviewKey] = useState(0);
  const [testTo, setTestTo] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminEmailTemplates();
      setSettings(data.settings);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Не удалось загрузить шаблоны писем",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function patch(partial: Partial<EmailTemplateSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
    setSuccess(null);
  }

  function patchFooterLink(index: number, partial: Partial<EmailFooterLink>) {
    setSettings((prev) => ({
      ...prev,
      footer_links: prev.footer_links.map((item, i) =>
        i === index ? { ...item, ...partial } : item,
      ),
    }));
    setSuccess(null);
  }

  function patchSocialLink(index: number, partial: Partial<EmailSocialLink>) {
    setSettings((prev) => ({
      ...prev,
      social_links: prev.social_links.map((item, i) =>
        i === index ? { ...item, ...partial } : item,
      ),
    }));
    setSuccess(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await updateAdminEmailTemplates({ settings });
      setSettings(data.settings);
      setPreviewKey((k) => k + 1);
      setSuccess("Шаблоны писем сохранены");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Не удалось сохранить шаблоны писем",
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
      const result = await sendAdminEmailTemplateTest(testTo.trim());
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
          Шаблоны писем
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Общий стиль писем: логотип, подпись, меню, соцсети и подвал
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
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Логотип</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-medium text-slate-500">
                URL логотипа
                <input
                  type="url"
                  value={settings.logo_url}
                  onChange={(e) => patch({ logo_url: e.target.value })}
                  placeholder="https://postilka.ru/logo.png"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Alt-текст (если нет картинки)
                <input
                  type="text"
                  value={settings.logo_alt}
                  onChange={(e) => patch({ logo_alt: e.target.value })}
                  placeholder="Postilka"
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            {settings.logo_url && (
              <div className="mt-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={settings.logo_url}
                  alt={settings.logo_alt}
                  className="h-10 max-w-[220px] object-contain"
                />
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Стиль</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <label className="block text-xs font-medium text-slate-500">
                Основной цвет
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => patch({ primary_color: e.target.value })}
                  className="mt-1 h-10 w-full cursor-pointer rounded-md border border-slate-200"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Фон письма
                <input
                  type="color"
                  value={settings.background_color}
                  onChange={(e) => patch({ background_color: e.target.value })}
                  className="mt-1 h-10 w-full cursor-pointer rounded-md border border-slate-200"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Скругление карточки (px)
                <input
                  type="number"
                  min={8}
                  max={40}
                  value={settings.card_radius_px}
                  onChange={(e) =>
                    patch({ card_radius_px: Number(e.target.value) || 20 })
                  }
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Подпись</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-medium text-slate-500">
                Слоган
                <input
                  type="text"
                  value={settings.signature_title}
                  onChange={(e) => patch({ signature_title: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Команда
                <input
                  type="text"
                  value={settings.signature_team}
                  onChange={(e) => patch({ signature_team: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Меню в подвале
              </h2>
              <button
                type="button"
                onClick={() =>
                  patch({
                    footer_links: [...settings.footer_links, emptyFooterLink()],
                  })
                }
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {settings.footer_links.map((link, index) => (
                <div
                  key={`footer-${index}`}
                  className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto]"
                >
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) =>
                      patchFooterLink(index, { label: e.target.value })
                    }
                    placeholder="Название"
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) =>
                      patchFooterLink(index, { url: e.target.value })
                    }
                    placeholder="https://..."
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        footer_links: settings.footer_links.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                    className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
                    aria-label="Удалить пункт меню"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Социальные сети
              </h2>
              <button
                type="button"
                onClick={() =>
                  patch({
                    social_links: [...settings.social_links, emptySocialLink()],
                  })
                }
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Укажите URL иконки (PNG/SVG по HTTPS) или оставьте пустым — покажем
              инициалы
            </p>
            <div className="mt-3 space-y-3">
              {settings.social_links.map((link, index) => (
                <div
                  key={`social-${index}`}
                  className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) =>
                      patchSocialLink(index, { label: e.target.value })
                    }
                    placeholder="Telegram"
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) =>
                      patchSocialLink(index, { url: e.target.value })
                    }
                    placeholder="https://t.me/..."
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="url"
                    value={link.icon_url}
                    onChange={(e) =>
                      patchSocialLink(index, { icon_url: e.target.value })
                    }
                    placeholder="URL иконки"
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        social_links: settings.social_links.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                    className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
                    aria-label="Удалить соцсеть"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Приложения и юридический текст
            </h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="block text-xs font-medium text-slate-500 md:col-span-2">
                Текст блока приложений
                <input
                  type="text"
                  value={settings.app_download_text}
                  onChange={(e) => patch({ app_download_text: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                App Store URL
                <input
                  type="url"
                  value={settings.app_store_url}
                  onChange={(e) => patch({ app_store_url: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Google Play URL
                <input
                  type="url"
                  value={settings.google_play_url}
                  onChange={(e) => patch({ google_play_url: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500 md:col-span-2">
                Юридический текст в подвале
                <textarea
                  value={settings.footer_legal_text}
                  onChange={(e) => patch({ footer_legal_text: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                Текст ссылки «Отписаться»
                <input
                  type="text"
                  value={settings.unsubscribe_text}
                  onChange={(e) => patch({ unsubscribe_text: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500">
                URL отписки
                <input
                  type="url"
                  value={settings.unsubscribe_url}
                  onChange={(e) => patch({ unsubscribe_url: e.target.value })}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Eye className="h-4 w-4" />
              Превью письма
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Показывает сохранённые настройки. Сохраните изменения, чтобы обновить
              превью.
            </p>
            <iframe
              key={previewKey}
              title="Превью шаблона письма"
              src={adminEmailTemplatePreviewURL()}
              className="mt-3 h-[640px] w-full rounded-lg border border-slate-200 bg-white"
            />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Send className="h-4 w-4" />
              Тестовая отправка
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Отправляет письмо в текущем стиле шаблона (SMTP должен быть включён)
            </p>
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
            {saving ? "Сохранение…" : "Сохранить шаблоны писем"}
          </button>
        </>
      )}
    </div>
  );
}
