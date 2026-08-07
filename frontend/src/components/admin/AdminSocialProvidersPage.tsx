"use client";

import { Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ApiError,
  fetchAdminSocialProviders,
  fetchAdminTelegramProviderSettings,
  updateAdminSocialProvider,
  updateAdminTelegramProviderSettings,
  type SocialProviderAdminView,
  type SocialProviderSettings,
  type TelegramProviderSettings,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type ProviderKey = "telegram" | "vk" | "ok" | "max" | "rutube" | "dzen";

const PROVIDER_MENU: { key: ProviderKey; label: string; connectFlow: string }[] = [
  { key: "telegram", label: "Telegram", connectFlow: "bot_token" },
  { key: "vk", label: "VK", connectFlow: "oauth" },
  { key: "ok", label: "OK", connectFlow: "oauth" },
  { key: "max", label: "MAX", connectFlow: "bot_token" },
  { key: "rutube", label: "Rutube", connectFlow: "oauth" },
  { key: "dzen", label: "Дзен", connectFlow: "oauth" },
];

const DEFAULT_TELEGRAM: TelegramProviderSettings = {
  enabled: true,
  proxy_enabled: false,
  proxy_active_url: "",
  proxy_auto_failover: true,
  proxy_urls: [],
  connect_help_text: "",
  connect_help_url: "https://postilka.ru/docs/telegram",
  docs_url: "https://postilka.ru/docs",
  support_telegram_username: "postilka_support",
  support_email: "support@postilka.ru",
  support_hours_text: "пн–вс 10:00–19:00 (МСК)",
};

const DEFAULT_SOCIAL: SocialProviderSettings = {
  enabled: false,
  oauth_client_id: "",
  oauth_client_secret: "",
  connect_help_text: "",
  connect_help_url: "",
  docs_url: "https://postilka.ru/docs",
  support_telegram_username: "postilka_support",
  support_email: "support@postilka.ru",
  support_hours_text: "пн–вс 10:00–19:00 (МСК)",
};

export function AdminSocialProvidersPage() {
  const searchParams = useSearchParams();
  const initialProvider = (searchParams.get("provider") as ProviderKey) || "telegram";

  const [selected, setSelected] = useState<ProviderKey>(initialProvider);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [telegram, setTelegram] = useState<TelegramProviderSettings>(DEFAULT_TELEGRAM);
  const [socialProviders, setSocialProviders] = useState<SocialProviderAdminView[]>([]);
  const [socialForm, setSocialForm] = useState<SocialProviderSettings>(DEFAULT_SOCIAL);

  const currentSocial = useMemo(
    () => socialProviders.find((p) => p.provider === selected),
    [socialProviders, selected],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [telegramData, socialData] = await Promise.all([
        fetchAdminTelegramProviderSettings(),
        fetchAdminSocialProviders(),
      ]);
      const proxyUrls = telegramData.settings.proxy_urls || [];
      const proxyActive =
        telegramData.settings.proxy_active_url && proxyUrls.includes(telegramData.settings.proxy_active_url)
          ? telegramData.settings.proxy_active_url
          : "";
      setTelegram({
        ...telegramData.settings,
        proxy_urls: proxyUrls,
        proxy_active_url: proxyActive,
      });
      setSocialProviders(socialData.providers);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить настройки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selected === "telegram") return;
    const item = socialProviders.find((p) => p.provider === selected);
    if (item) setSocialForm(item.settings);
  }, [selected, socialProviders]);

  useEffect(() => {
    const p = searchParams.get("provider") as ProviderKey | null;
    if (p && PROVIDER_MENU.some((m) => m.key === p)) {
      setSelected(p);
    }
  }, [searchParams]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (selected === "telegram") {
        const data = await updateAdminTelegramProviderSettings(telegram);
        const proxyUrls = data.settings.proxy_urls || [];
        setTelegram({ ...data.settings, proxy_urls: proxyUrls });
        setSuccess("Настройки Telegram сохранены");
      } else {
        const updated = await updateAdminSocialProvider(selected, socialForm);
        setSocialProviders((prev) =>
          prev.map((p) => (p.provider === updated.provider ? updated : p)),
        );
        setSocialForm(updated.settings);
        setSuccess(`Настройки ${updated.label} сохранены`);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  function patchTelegram(partial: Partial<TelegramProviderSettings>) {
    setTelegram((prev) => ({ ...prev, ...partial }));
    setSuccess(null);
  }

  function patchSocial(partial: Partial<SocialProviderSettings>) {
    setSocialForm((prev) => ({ ...prev, ...partial }));
    setSuccess(null);
  }

  const menuItem = PROVIDER_MENU.find((m) => m.key === selected)!;
  const proxyOptions = telegram.proxy_urls.filter(Boolean);
  const proxySelectValue =
    telegram.proxy_active_url && proxyOptions.includes(telegram.proxy_active_url)
      ? telegram.proxy_active_url
      : "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Соцсети — подключение каналов
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Настройка провайдеров для пользовательских каналов: OAuth-приложения, включение и инструкции.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="flex min-h-[620px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Провайдеры
            </p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-0.5">
              {PROVIDER_MENU.map((item) => {
                const active = selected === item.key;
                const enabled =
                  item.key === "telegram"
                    ? telegram.enabled
                    : socialProviders.find((p) => p.provider === item.key)?.settings.enabled;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(item.key);
                        setSuccess(null);
                        setError(null);
                      }}
                      className={cn(
                        "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                        active
                          ? "bg-white font-medium text-slate-900 shadow-sm"
                          : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{item.label}</span>
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            enabled ? "bg-emerald-500" : "bg-slate-300",
                          )}
                          title={enabled ? "Включён" : "Выключен"}
                        />
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {item.connectFlow === "oauth" ? "OAuth" : "Токен бота"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-slate-500">Загрузка…</p>
          ) : selected === "telegram" ? (
            <TelegramSettingsForm
              settings={telegram}
              proxyOptions={proxyOptions}
              proxySelectValue={proxySelectValue}
              onPatch={patchTelegram}
              onSave={() => void handleSave()}
              saving={saving}
            />
          ) : (
            <SocialSettingsForm
              provider={selected}
              label={currentSocial?.label ?? menuItem.label}
              connectFlow={menuItem.connectFlow}
              settings={socialForm}
              onPatch={patchSocial}
              onSave={() => void handleSave()}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TelegramSettingsForm({
  settings,
  proxyOptions,
  proxySelectValue,
  onPatch,
  onSave,
  saving,
}: {
  settings: TelegramProviderSettings;
  proxyOptions: string[];
  proxySelectValue: string;
  onPatch: (p: Partial<TelegramProviderSettings>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-lg font-medium text-slate-900">Telegram</h2>
        <p className="text-sm text-slate-500">Подключение через BotFather-токен.</p>
      </div>

      <Section title="Провайдер">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => onPatch({ enabled: e.target.checked })}
            className="rounded border-slate-300"
          />
          Разрешить пользователям подключать Telegram-каналы
        </label>
      </Section>

      <Section title="Прокси для Telegram Bot API">
        <p className="text-xs text-slate-500">
          Используется при проверке токена, поиске чатов и публикации.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.proxy_enabled}
            onChange={(e) => onPatch({ proxy_enabled: e.target.checked })}
            className="rounded border-slate-300"
          />
          Включить прокси
        </label>
        <textarea
          value={settings.proxy_urls.join("\n")}
          onChange={(e) => {
            const proxy_urls = e.target.value.split("\n").map((s) => s.trim()).filter(Boolean);
            const proxy_active_url =
              settings.proxy_active_url && proxy_urls.includes(settings.proxy_active_url)
                ? settings.proxy_active_url
                : "";
            onPatch({ proxy_urls, proxy_active_url });
          }}
          rows={3}
          placeholder="http://user:pass@host:3128"
          className="w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
        />
        {proxyOptions.length > 0 && (
          <select
            value={proxySelectValue}
            onChange={(e) => onPatch({ proxy_active_url: e.target.value })}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Авто: первый в списке</option>
            {proxyOptions.map((url) => (
              <option key={url} value={url}>{url}</option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.proxy_auto_failover}
            onChange={(e) => onPatch({ proxy_auto_failover: e.target.checked })}
            className="rounded border-slate-300"
          />
          Автоматический failover прокси
        </label>
      </Section>

      <HelpSupportFields
        connectHelpUrl={settings.connect_help_url}
        docsUrl={settings.docs_url}
        supportTelegram={settings.support_telegram_username}
        supportEmail={settings.support_email}
        supportHours={settings.support_hours_text}
        onPatch={(p) => onPatch(p as Partial<TelegramProviderSettings>)}
      />

      <Section title="Инструкция для пользователей">
        <textarea
          value={settings.connect_help_text}
          onChange={(e) => onPatch({ connect_help_text: e.target.value })}
          rows={6}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </Section>

      <SaveButton onSave={onSave} saving={saving} />
    </div>
  );
}

function SocialSettingsForm({
  provider,
  label,
  connectFlow,
  settings,
  onPatch,
  onSave,
  saving,
}: {
  provider: string;
  label: string;
  connectFlow: string;
  settings: SocialProviderSettings;
  onPatch: (p: Partial<SocialProviderSettings>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const isUserOAuthApp = provider === "vk";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-lg font-medium text-slate-900">{label}</h2>
        <p className="text-sm text-slate-500">
          {isUserOAuthApp
            ? "Пользователи подключают сообщества через своё приложение VK."
            : connectFlow === "oauth"
              ? "OAuth-приложение платформы для подключения каналов пользователями."
              : "Подключение через токен бота MAX."}
        </p>
      </div>

      <Section title="Провайдер">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => onPatch({ enabled: e.target.checked })}
            className="rounded border-slate-300"
          />
          Разрешить пользователям подключать каналы {label}
        </label>
      </Section>

      {isUserOAuthApp ? (
        <Section title="Приложение VK пользователя">
          <p className="text-xs text-slate-500">
            Ключи OAuth не хранятся в админке. Каждый пользователь создаёт Standalone-приложение
            на{" "}
            <a
              href="https://vk.com/apps?act=manage"
              target="_blank"
              rel="noreferrer"
              className="text-slate-700 underline"
            >
              vk.com/apps
            </a>{" "}
            и указывает Redirect URI:
          </p>
          <code className="block rounded bg-slate-100 px-2 py-1.5 text-xs">
            https://postilka.ru/app/api/v1/channels/oauth/vk/callback
          </code>
          <p className="text-xs text-slate-500">
            Нужны права: wall, photos, video, groups, offline. Пользователь вводит ID приложения и
            защищённый ключ при подключении канала.
          </p>
        </Section>
      ) : (
        connectFlow === "oauth" && (
          <Section title="OAuth-приложение">
            <p className="text-xs text-slate-500">
              Redirect URI для приложения:{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                https://postilka.ru/app/api/v1/channels/oauth/{provider}/callback
              </code>
            </p>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Client ID / App ID</span>
              <input
                type="text"
                value={settings.oauth_client_id}
                onChange={(e) => onPatch({ oauth_client_id: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Client Secret</span>
              <input
                type="password"
                value={settings.oauth_client_secret}
                onChange={(e) => onPatch({ oauth_client_secret: e.target.value })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </Section>
        )
      )}

      <HelpSupportFields
        connectHelpUrl={settings.connect_help_url}
        docsUrl={settings.docs_url}
        supportTelegram={settings.support_telegram_username}
        supportEmail={settings.support_email}
        supportHours={settings.support_hours_text}
        onPatch={(p) => onPatch(p as Partial<SocialProviderSettings>)}
      />

      <Section title="Инструкция для пользователей">
        <textarea
          value={settings.connect_help_text}
          onChange={(e) => onPatch({ connect_help_text: e.target.value })}
          rows={6}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </Section>

      <SaveButton onSave={onSave} saving={saving} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <h3 className="font-medium text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function HelpSupportFields({
  connectHelpUrl,
  docsUrl,
  supportTelegram,
  supportEmail,
  supportHours,
  onPatch,
}: {
  connectHelpUrl: string;
  docsUrl: string;
  supportTelegram: string;
  supportEmail: string;
  supportHours: string;
  onPatch: (p: Record<string, string>) => void;
}) {
  return (
    <Section title="Помощь и поддержка">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">URL инструкции</span>
        <input
          type="url"
          value={connectHelpUrl}
          onChange={(e) => onPatch({ connect_help_url: e.target.value })}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">URL центра помощи</span>
        <input
          type="url"
          value={docsUrl}
          onChange={(e) => onPatch({ docs_url: e.target.value })}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Telegram поддержки</span>
          <input
            type="text"
            value={supportTelegram}
            onChange={(e) => onPatch({ support_telegram_username: e.target.value })}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Email поддержки</span>
          <input
            type="email"
            value={supportEmail}
            onChange={(e) => onPatch({ support_email: e.target.value })}
            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">Часы работы поддержки</span>
        <input
          type="text"
          value={supportHours}
          onChange={(e) => onPatch({ support_hours_text: e.target.value })}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
    </Section>
  );
}

function SaveButton({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end border-t border-slate-200 pt-4">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </div>
  );
}
