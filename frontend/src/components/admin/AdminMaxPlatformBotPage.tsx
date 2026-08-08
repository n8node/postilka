"use client";

import { Eye, EyeOff, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchAdminMAXPlatformBot,
  updateAdminMAXPlatformBot,
  type MAXPlatformBotAdminView,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type MaxPlatformBotSettingsPanelProps = {
  data: MAXPlatformBotAdminView | null;
  enabled: boolean;
  tokenInput: string;
  onEnabledChange: (enabled: boolean) => void;
  onTokenInputChange: (token: string) => void;
  embedded?: boolean;
};

export function MaxPlatformBotSettingsPanel({
  data,
  enabled,
  tokenInput,
  onEnabledChange,
  onTokenInputChange,
  embedded = false,
}: MaxPlatformBotSettingsPanelProps) {
  const [showToken, setShowToken] = useState(false);

  return (
    <div
      className={cn(
        "space-y-5",
        embedded ? "rounded-xl border border-slate-200 bg-white p-5 shadow-sm" : "",
      )}
    >
      <div>
        <h2 className={cn("font-semibold text-slate-900", embedded ? "text-base" : "text-xl")}>
          Бот Postilka
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Общий бот платформы для публикации в MAX. Пользователи смогут выбрать его вместо своего бота.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="rounded border-slate-300"
        />
        Разрешить пользователям постить через бота Postilka
      </label>

      <div>
        <label className="mb-1 block text-sm font-medium">Токен бота MAX</label>
        <p className="mb-2 text-xs text-slate-500">
          {data?.bot_token_set
            ? `Текущий токен: ${data.bot_token_hint ?? "настроен"}. Оставьте поле пустым, чтобы не менять.`
            : "Создайте бота через @MasterBot или business.max.ru и вставьте токен."}
        </p>
        <div className="relative max-w-xl">
          <input
            type={showToken ? "text" : "password"}
            value={tokenInput}
            onChange={(e) => onTokenInputChange(e.target.value)}
            placeholder="Токен бота Postilka для MAX"
            className="w-full rounded-md border border-slate-200 px-3 py-2 pr-10 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {data?.bot?.search_query && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm">
          <p className="text-xs text-slate-500">Ник бота для пользователей</p>
          <p className="mt-0.5 font-mono font-semibold">{data.bot.search_query}</p>
          {data.bot.name && <p className="mt-1 text-xs text-slate-500">{data.bot.name}</p>}
        </div>
      )}
    </div>
  );
}

export function AdminMaxPlatformBotPage() {
  const [data, setData] = useState<MAXPlatformBotAdminView | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const view = await fetchAdminMAXPlatformBot();
      setData(view);
      setEnabled(view.enabled);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить настройки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const view = await updateAdminMAXPlatformBot({
        enabled,
        ...(tokenInput.trim() ? { bot_token: tokenInput.trim() } : {}),
      });
      setData(view);
      setEnabled(view.enabled);
      setTokenInput("");
      setSuccess("Сохранено");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">MAX — бот Postilka</h1>
        <p className="mt-1 text-sm text-slate-500">
          Перенесено в раздел «Соцсети — каналы» → MAX.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Загрузка…</p>
      ) : (
        <>
          <MaxPlatformBotSettingsPanel
            data={data}
            enabled={enabled}
            tokenInput={tokenInput}
            onEnabledChange={setEnabled}
            onTokenInputChange={setTokenInput}
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || (enabled && !data?.bot_token_set && !tokenInput.trim())}
            className={cn(
              "inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white",
              "disabled:opacity-50",
            )}
          >
            <Save className="h-4 w-4" />
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </>
      )}
    </div>
  );
}
