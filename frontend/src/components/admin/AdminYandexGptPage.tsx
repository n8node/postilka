"use client";

import { PlugZap, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  fetchAdminYandexGptSettings,
  testAdminYandexGptConnection,
  updateAdminYandexGptSettings,
  type YandexGptAdminView,
  type YandexModelPricing,
} from "@/lib/api";

function secretPlaceholder(set: boolean, hint: string, empty: string) {
  if (set && hint) return `Новый ключ (текущий: ${hint})`;
  if (set) return "Новый ключ (текущий: ••••)";
  return empty;
}

function folderPlaceholder(set: boolean, hint: string, empty: string) {
  if (set && hint) return `Новый folder ID (текущий: ${hint})`;
  if (set) return "Новый folder ID (текущий: ••••)";
  return empty;
}

const DEFAULT_PRICING: YandexModelPricing = {
  input_per_1k: 0,
  output_per_1k: 0,
  currency: "RUB",
};

export function AdminYandexGptPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testOk, setTestOk] = useState<boolean | null>(null);

  const [apiKeySet, setApiKeySet] = useState(false);
  const [apiKeyHint, setApiKeyHint] = useState("");
  const [folderHint, setFolderHint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [folderID, setFolderID] = useState("");
  const [modelDefault, setModelDefault] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [modelPricing, setModelPricing] = useState<Record<string, YandexModelPricing>>({});
  const [inputPer1K, setInputPer1K] = useState(0);
  const [outputPer1K, setOutputPer1K] = useState(0);

  const applyView = useCallback((data: YandexGptAdminView) => {
    setApiKeySet(data.api_key_set);
    setApiKeyHint(data.api_key_hint || "");
    setFolderHint(data.folder_hint || "");
    setFolderID(data.folder_id || "");
    setModelDefault(data.model_default || "");
    setModels(data.models || []);
    setModelPricing(data.model_pricing || {});
    const pricing = data.model_pricing?.[data.model_default] ?? DEFAULT_PRICING;
    setInputPer1K(pricing.input_per_1k ?? 0);
    setOutputPer1K(pricing.output_per_1k ?? 0);
  }, []);

  useEffect(() => {
    fetchAdminYandexGptSettings()
      .then(applyView)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить настройки"),
      )
      .finally(() => setLoading(false));
  }, [applyView]);

  const sortedModels = useMemo(() => [...models].sort(), [models]);

  function handleModelChange(nextModel: string) {
    setModelDefault(nextModel);
    const pricing = modelPricing[nextModel] ?? DEFAULT_PRICING;
    setInputPer1K(pricing.input_per_1k ?? 0);
    setOutputPer1K(pricing.output_per_1k ?? 0);
  }

  async function handleTest() {
    setTesting(true);
    setTestMessage(null);
    setTestOk(null);
    setError(null);
    try {
      const result = await testAdminYandexGptConnection({
        ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
        ...(folderID.trim() ? { folder_id: folderID.trim() } : {}),
      });
      setTestOk(result.ok);
      setTestMessage(result.message);
      if (result.ok && result.models?.length) {
        setModels(result.models);
        if (!modelDefault || !result.models.includes(modelDefault)) {
          handleModelChange(result.models[0]);
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось проверить соединение");
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const pricingPatch: Record<string, YandexModelPricing> = {};
      if (modelDefault) {
        pricingPatch[modelDefault] = {
          input_per_1k: inputPer1K,
          output_per_1k: outputPer1K,
          currency: "RUB",
        };
      }
      const data = await updateAdminYandexGptSettings({
        api_base_url: "https://llm.api.cloud.yandex.net/v1",
        folder_id: folderID.trim(),
        model_default: modelDefault,
        model_pricing: pricingPatch,
        ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
      });
      applyView(data);
      setModelPricing((prev) => ({ ...prev, ...data.model_pricing }));
      setApiKey("");
      setSuccess("Настройки Yandex GPT сохранены");
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Yandex GPT — текст</h1>
        <p className="mt-1 text-sm text-slate-500">
          Провайдер для генерации и рерайта текста. Стоимость — в ₽ за 1000 токенов input/output.
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

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold text-slate-900">Yandex GPT</h2>
          {apiKeySet && (
            <p className="text-xs text-slate-400">
              {apiKeyHint ? `Ключ: ${apiKeyHint}` : "Ключ задан"}
              {folderHint ? ` · Folder: ${folderHint}` : folderID ? ` · Folder: ${folderID}` : ""}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">API-ключ Yandex</label>
          <input
            type="password"
            autoComplete="new-password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={secretPlaceholder(apiKeySet, apiKeyHint, "AQVN...")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Folder ID (каталог Yandex Cloud)</label>
          <input
            type="text"
            value={folderID}
            onChange={(e) => setFolderID(e.target.value)}
            placeholder={folderPlaceholder(!!folderID, folderHint, "b1g...")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            ID каталога из консоли Yandex Cloud (начинается с b1…). Это не email аккаунта.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <PlugZap className="h-4 w-4" />
            {testing ? "Проверка…" : "Проверить соединение"}
          </button>
          {testMessage && (
            <span className={`text-sm ${testOk ? "text-green-700" : "text-red-700"}`}>
              {testMessage}
            </span>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Модели и параметры</p>
          <h2 className="mt-1 text-base font-semibold text-slate-900">Модель Yandex GPT</h2>
        </div>

        <div>
          <select
            value={modelDefault}
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={sortedModels.length === 0}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
          >
            <option value="">
              {sortedModels.length === 0
                ? "Сначала проверьте соединение — список моделей подтянется автоматически"
                : "Выберите модель"}
            </option>
            {sortedModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {modelDefault && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Стоимость для выбранной модели
              </p>
              <p className="mt-1 text-xs text-slate-500">{modelDefault}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Input за 1000 токенов (₽)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={inputPer1K}
                  onChange={(e) => setInputPer1K(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Output за 1000 токенов (₽)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={outputPer1K}
                  onChange={(e) => setOutputPer1K(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Цены сохраняются для каждой модели отдельно — при переключении подтянутся ранее указанные значения.
            </p>
          </div>
        )}
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
