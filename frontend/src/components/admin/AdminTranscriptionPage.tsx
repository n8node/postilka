"use client";

import { PlugZap, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, fetchAdminKieSettings, testAdminKieConnection, updateAdminKieSettings, type KieAdminSettings, type KieModel } from "@/lib/api";

const DEFAULTS: Pick<KieAdminSettings, "transcription_enabled" | "transcription_model" | "transcription_credits_per_second" | "transcription_api_base_url" | "transcription_api_key_set"> = {
  transcription_enabled: false,
  transcription_model: "nvidia/nemotron-3-5-transcribe",
  transcription_credits_per_second: 0.005,
  transcription_api_base_url: "https://api.kie.ai",
  transcription_api_key_set: false,
};

export function AdminTranscriptionPage({ embedded = false }: { embedded?: boolean }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [models, setModels] = useState<KieModel[]>([]);

  useEffect(() => {
    void fetchAdminKieSettings()
      .then(({ settings: loaded }) => setSettings({
        transcription_enabled: loaded.transcription_enabled,
        transcription_model: loaded.transcription_model || DEFAULTS.transcription_model,
        transcription_credits_per_second: loaded.transcription_credits_per_second || DEFAULTS.transcription_credits_per_second,
        transcription_api_base_url: loaded.transcription_api_base_url || DEFAULTS.transcription_api_base_url,
        transcription_api_key_set: Boolean(loaded.transcription_api_key_set),
      }))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Не удалось загрузить настройки"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const { settings: saved } = await updateAdminKieSettings(settings);
      setSettings({
        transcription_enabled: saved.transcription_enabled,
        transcription_model: saved.transcription_model,
        transcription_credits_per_second: saved.transcription_credits_per_second,
        transcription_api_base_url: saved.transcription_api_base_url,
        transcription_api_key_set: saved.transcription_api_key_set,
      });
      setMessage("Настройки транскрибации сохранены");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true); setMessage(null); setError(null);
    try {
      const result = await testAdminKieConnection({ api_base_url: settings.transcription_api_base_url, ...(apiKey ? { api_key: apiKey } : {}) });
      if (!result.ok) throw new Error(result.message || "Соединение не установлено");
      setModels(result.models || []);
      if (result.models?.some((model) => model.id === settings.transcription_model)) setMessage("Соединение проверено");
      else if (result.models?.[0]) { setSettings((prev) => ({ ...prev, transcription_model: result.models![0].id })); setMessage("Соединение проверено, модель выбрана автоматически"); }
      else setMessage("Соединение проверено");
    } catch (err) { setError(err instanceof ApiError || err instanceof Error ? err.message : "Не удалось проверить соединение"); }
    finally { setTesting(false); }
  }

  if (loading) return <p className="text-sm text-slate-500">Загрузка…</p>;

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-3xl space-y-6"}>
      <div>
        <h1 className={embedded ? "text-lg font-semibold text-slate-900" : "text-2xl font-semibold text-slate-900"}>Транскрибация</h1>
        <p className="mt-1 text-sm text-slate-500">Распознавание речи и автоматические субтитры для проектов Shorts.</p>
      </div>
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      {message && <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{message}</div>}
      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">URL API<input value={settings.transcription_api_base_url} onChange={(e) => setSettings((prev) => ({ ...prev, transcription_api_base_url: e.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="block text-sm font-medium text-slate-700">API key<input type="password" value={apiKey} placeholder={settings.transcription_api_key_set ? "Ключ сохранён" : "Введите ключ"} onChange={(e) => setApiKey(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
        </div>
        <button type="button" onClick={() => void testConnection()} disabled={testing} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"><PlugZap className="h-4 w-4" />{testing ? "Проверка…" : "Проверить соединение и загрузить модели"}</button>
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={settings.transcription_enabled} onChange={(e) => setSettings((prev) => ({ ...prev, transcription_enabled: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
          Использовать автоматическую транскрибацию
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Модель распознавания
          <select value={settings.transcription_model} onChange={(e) => setSettings((prev) => ({ ...prev, transcription_model: e.target.value }))} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
            {models.length === 0 && <option value={settings.transcription_model}>{settings.transcription_model} (проверьте соединение для обновления)</option>}
            {models.map((model) => <option key={model.id} value={model.id}>{model.name || model.id} ({model.id})</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Стоимость, кредитов за секунду
          <input type="number" min={0.000001} step={0.000001} value={settings.transcription_credits_per_second} onChange={(e) => setSettings((prev) => ({ ...prev, transcription_credits_per_second: Math.max(0, Number(e.target.value) || 0) }))} className="mt-1 w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <span className="mt-1 block text-xs font-normal text-slate-500">Стоимость рассчитывается по длительности аудио.</span>
        </label>
        <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Сохранение…" : "Сохранить настройки"}
        </button>
      </section>
    </div>
  );
}