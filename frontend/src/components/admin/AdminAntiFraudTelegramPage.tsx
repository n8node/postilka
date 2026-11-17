"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ApiError,
  fetchAdminAntiFraudTelegramSettings,
  updateAdminAntiFraudTelegramSettings,
  type AntiFraudTelegramAdminView,
  type AntiFraudTelegramSettings,
} from "@/lib/api";

const DEFAULT_SETTINGS: AntiFraudTelegramSettings = {
  enabled: false,
  admin_telegram_id: 0,
  proxy_enabled: false,
  proxy_active_url: "",
  proxy_auto_failover: true,
  proxy_urls: [],
  notify_high: true,
  notify_critical: true,
  require_confirmation: true,
};

export function AdminAntiFraudTelegramPage({ embedded = false }: { embedded?: boolean }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [botToken, setBotToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [botTokenSet, setBotTokenSet] = useState(false);
  const [webhookSecretSet, setWebhookSecretSet] = useState(false);
  const [proxyText, setProxyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminAntiFraudTelegramSettings().then((data: AntiFraudTelegramAdminView) => {
      setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      setProxyText((data.settings.proxy_urls || []).join("\n"));
      setBotTokenSet(data.bot_token_set);
      setWebhookSecretSet(data.webhook_secret_set);
    }).catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить настройки")).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const data = await updateAdminAntiFraudTelegramSettings({
        settings: { ...settings, proxy_urls: proxyText.split(/[\s,;]+/).map((v) => v.trim()).filter(Boolean) },
        bot_token: botToken.trim() || undefined,
        webhook_secret: webhookSecret.trim() || undefined,
      });
      setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      setProxyText((data.settings.proxy_urls || []).join("\n"));
      setBotToken(""); setWebhookSecret(""); setBotTokenSet(data.bot_token_set); setWebhookSecretSet(data.webhook_secret_set);
      setSuccess("Настройки антифрод-бота сохранены");
    } catch (e) { setError(e instanceof ApiError ? e.message : "Не удалось сохранить настройки"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Загрузка…</div>;
  return <div className={embedded ? "space-y-6" : "mx-auto max-w-3xl space-y-6 p-6"}>
    <div><h2 className="text-xl font-semibold">Telegram — антифрод-модерация</h2><p className="mt-1 text-sm text-slate-500">Отдельный бот для уведомлений о рисках и подтверждаемых действий модератора.</p></div>
    {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {success && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>}
    <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      <label className="flex items-center gap-3"><input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })} /><span className="font-medium">Включить антифрод-бота</span></label>
      <label className="block text-sm font-medium">Telegram ID администратора<input className="mt-1 w-full rounded-lg border p-2" type="number" value={settings.admin_telegram_id || ""} onChange={(e) => setSettings({ ...settings, admin_telegram_id: Number(e.target.value) || 0 })} placeholder="Например, 123456789" /></label>
      <label className="block text-sm font-medium">Токен отдельного бота {botTokenSet && <span className="font-normal text-emerald-600">(уже сохранён)</span>}<input className="mt-1 w-full rounded-lg border p-2" type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder={botTokenSet ? "Оставьте пустым, чтобы не менять" : "Токен от @BotFather"} /></label>
      <label className="block text-sm font-medium">Webhook secret {webhookSecretSet && <span className="font-normal text-emerald-600">(уже сохранён)</span>}<input className="mt-1 w-full rounded-lg border p-2" type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder={webhookSecretSet ? "Оставьте пустым, чтобы не менять" : "Случайная строка"} /></label>
    </div>
    <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
      <h3 className="font-medium">Прокси Telegram Bot API</h3><p className="text-sm text-slate-500">Настройка отдельная от бота уведомлений. Поддерживаются только http:// proxy URL.</p>
      <label className="flex items-center gap-3"><input type="checkbox" checked={settings.proxy_enabled} onChange={(e) => setSettings({ ...settings, proxy_enabled: e.target.checked })} />Использовать прокси</label>
      <textarea className="min-h-24 w-full rounded-lg border p-2 font-mono text-sm" value={proxyText} onChange={(e) => setProxyText(e.target.value)} placeholder="http://user:password@host:3128" />
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={settings.proxy_auto_failover} onChange={(e) => setSettings({ ...settings, proxy_auto_failover: e.target.checked })} />Автоматический failover</label>
    </div>
    <div className="space-y-3 rounded-xl border bg-white p-5 shadow-sm"><h3 className="font-medium">Политика уведомлений</h3>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={settings.notify_high} onChange={(e) => setSettings({ ...settings, notify_high: e.target.checked })} />Уведомлять о high risk</label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={settings.notify_critical} onChange={(e) => setSettings({ ...settings, notify_critical: e.target.checked })} />Уведомлять о critical risk</label>
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={settings.require_confirmation} onChange={(e) => setSettings({ ...settings, require_confirmation: e.target.checked })} />Требовать второе подтверждение блокировки</label>
    </div>
    <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Сохранение…" : "Сохранить настройки"}</button>
  </div>;
}