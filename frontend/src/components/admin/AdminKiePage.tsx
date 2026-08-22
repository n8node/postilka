"use client";

import { PlugZap, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  fetchAdminKieSettings,
  testAdminKieConnection,
  updateAdminKieSettings,
  type KieAdminSettings,
  type KieModel,
} from "@/lib/api";

const DEFAULT_SETTINGS: KieAdminSettings = {
  api_base_url: "https://api.kie.ai",
  api_key_set: false,
  model_text_to_image: "",
  model_image_to_image: "",
  model_combine: "",
  model_filter: "",
  token_cost_text_to_image: 15,
  token_cost_image_to_image: 15,
  token_cost_combine: 18,
  token_cost_filter: 8,
  kopecks_per_media_credit: 5000,
};

function sortModels(models: KieModel[]) {
  return [...models].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

function ModelSelect({
  value,
  onChange,
  models,
  emptyLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  models: KieModel[];
  emptyLabel: string;
}) {
  const options = useMemo(() => {
    const sorted = sortModels(models);
    if (value && !sorted.some((m) => m.id === value)) {
      return [{ id: value, name: value, category: "" }, ...sorted];
    }
    return sorted;
  }, [models, value]);

  const disabled = models.length === 0;

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50"
    >
      <option value="">
        {disabled ? "Сначала проверьте соединение" : emptyLabel}
      </option>
      {options.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name} ({model.id})
        </option>
      ))}
    </select>
  );
}

export function AdminKiePage({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [availableModels, setAvailableModels] = useState<KieModel[]>([]);
  const [form, setForm] = useState<KieAdminSettings>(DEFAULT_SETTINGS);
  const [mediaCreditPriceRub, setMediaCreditPriceRub] = useState(50);
  const [newApiKey, setNewApiKey] = useState("");

  const generationModels = useMemo(
    () =>
      availableModels.filter(
        (m) => m.category === "generation" || m.category === "",
      ),
    [availableModels],
  );

  const filterModels = useMemo(
    () =>
      availableModels.filter(
        (m) => m.category === "filter" || m.category === "",
      ),
    [availableModels],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { settings } = await fetchAdminKieSettings();
      setForm(settings);
      setMediaCreditPriceRub(
        Math.max(0, (settings.kopecks_per_media_credit ?? 5000) / 100),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить настройки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patch<K extends keyof KieAdminSettings>(key: K, value: KieAdminSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, unknown> = {
        api_base_url: form.api_base_url,
        model_text_to_image: form.model_text_to_image,
        model_image_to_image: form.model_image_to_image,
        model_combine: form.model_combine,
        model_filter: form.model_filter,
        token_cost_text_to_image: form.token_cost_text_to_image,
        token_cost_image_to_image: form.token_cost_image_to_image,
        token_cost_combine: form.token_cost_combine,
        token_cost_filter: form.token_cost_filter,
        kopecks_per_media_credit: Math.max(
          1,
          Math.round(Math.max(0, mediaCreditPriceRub) * 100),
        ),
      };
      if (newApiKey.trim()) {
        body.api_key = newApiKey.trim();
      }
      const { settings } = await updateAdminKieSettings(body);
      setForm(settings);
      setMediaCreditPriceRub(
        Math.max(0, (settings.kopecks_per_media_credit ?? 5000) / 100),
      );
      setNewApiKey("");
      setSuccess("Настройки KIE.ai сохранены");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestError(null);
    setTestSuccess(false);
    setCreditsRemaining(null);
    try {
      const result = await testAdminKieConnection({
        api_base_url: form.api_base_url,
        api_key: newApiKey.trim() || undefined,
      });
      if (!result.ok) {
        setTestError(result.message || "Не удалось проверить соединение");
        return;
      }
      setAvailableModels(sortModels(result.models ?? []));
      setCreditsRemaining(result.credits_remaining ?? null);
      setTestSuccess(true);
    } catch (err) {
      setTestError(err instanceof ApiError ? err.message : "Не удалось проверить соединение");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Загрузка…</p>;
  }

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-3xl space-y-6"}>
      <div>
        {embedded ? (
          <h2 className="text-lg font-semibold text-slate-900">KIE.ai — генерация и фильтры</h2>
        ) : (
          <h1 className="text-2xl font-semibold text-slate-900">KIE.ai — генерация и фильтры</h1>
        )}
        <p className="mt-1 text-sm text-slate-500">
          Провайдер для AI-генерации изображений: ключ, модели и списание медиа-кредитов по операциям.
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
        <h2 className="text-base font-semibold text-slate-900">KIE.ai</h2>
        <p className="text-sm text-slate-500">Изображения через Market API (api.kie.ai)</p>

        <div>
          <label className="mb-1.5 block text-sm font-medium">API Base URL</label>
          <input
            type="text"
            value={form.api_base_url}
            onChange={(e) => patch("api_base_url", e.target.value)}
            placeholder="https://api.kie.ai"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">API Key</label>
          <input
            type="password"
            autoComplete="new-password"
            value={newApiKey}
            onChange={(e) => setNewApiKey(e.target.value)}
            placeholder={form.api_key_set ? "••••••••" : "kie_..."}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            {form.api_key_set
              ? "Ключ сохранён. Введите новый, чтобы заменить. Тест использует значение из поля, если оно заполнено."
              : "Ключ не задан — используется KIE_API_KEY из env или значение из поля при тесте"}
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
            {testing ? "Проверка…" : "Тестировать соединение"}
          </button>
          {testSuccess && (
            <span className="text-sm text-green-700">
              Соединение успешно
              {creditsRemaining !== null
                ? ` · кредитов KIE: ${Number.isInteger(creditsRemaining) ? creditsRemaining : creditsRemaining.toFixed(1)}`
                : ""}
              {availableModels.length > 0 ? ` · моделей: ${availableModels.length}` : ""}
            </span>
          )}
        </div>
        {testError && <p className="text-sm text-red-700">{testError}</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Модели KIE Market</h2>
          <p className="mt-1 text-sm text-slate-500">
            После успешного теста выберите модели для генерации и фильтров
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Текст → фото</label>
          <ModelSelect
            value={form.model_text_to_image}
            onChange={(value) => patch("model_text_to_image", value)}
            models={generationModels}
            emptyLabel="Выберите модель"
          />
          <p className="mt-1 text-xs text-slate-500">Режим создания изображения по описанию</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Фото → фото</label>
          <ModelSelect
            value={form.model_image_to_image}
            onChange={(value) => patch("model_image_to_image", value)}
            models={generationModels}
            emptyLabel="Выберите модель"
          />
          <p className="mt-1 text-xs text-slate-500">Режим редактирования и доработки загруженного фото</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Комбинация фото</label>
          <ModelSelect
            value={form.model_combine}
            onChange={(value) => patch("model_combine", value)}
            models={generationModels}
            emptyLabel="Выберите модель"
          />
          <p className="mt-1 text-xs text-slate-500">Объединение 2–5 исходных изображений в одну сцену</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">AI фильтры</label>
          <ModelSelect
            value={form.model_filter}
            onChange={(value) => patch("model_filter", value)}
            models={filterModels}
            emptyLabel="Выберите модель"
          />
          <p className="mt-1 text-xs text-slate-500">Редактирование, стилизация и апскейл в разделе фильтров</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Кредиты за операцию</h2>
          <p className="mt-1 text-sm text-slate-500">
            Сколько кредитов списывается за одну генерацию в каждом режиме. Сначала
            расходуется included-квота тарифа, остаток — с кошелька пользователя.
          </p>
        </div>

        {(
          [
            ["token_cost_text_to_image", "Текст → фото", "Кредитов за генерацию"],
            ["token_cost_image_to_image", "Фото → фото", "Кредитов за генерацию"],
            ["token_cost_combine", "Комбинация фото", "Кредитов за генерацию"],
            ["token_cost_filter", "Раздел «Фильтры»", "Кредитов за операцию"],
          ] as const
        ).map(([key, label, hint]) => (
          <div key={key}>
            <label className="mb-1.5 block text-sm font-medium">{label}</label>
            <input
              type="number"
              min={0}
              value={form[key]}
              onChange={(e) =>
                patch(key, Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              className="max-w-[140px] rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500">{hint}</p>
            {mediaCreditPriceRub > 0 && form[key] > 0 ? (
              <p className="mt-0.5 text-xs text-slate-600">
                С кошелька при overage: {(form[key] * mediaCreditPriceRub).toLocaleString("ru-RU")} ₽
                {" "}(= {form[key]} × {mediaCreditPriceRub} ₽)
              </p>
            ) : null}
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Стоимость кредита для кошелька</h2>
          <p className="mt-1 text-sm text-slate-500">
            Цена одного кредита в рублях. Списание с кошелька ={" "}
            <span className="font-medium text-slate-700">кредиты режима × эта стоимость</span>.
            Included-квота тарифа по-прежнему расходуется первой.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">1 кредит, ₽</label>
          <input
            type="number"
            min={1}
            step={1}
            value={mediaCreditPriceRub}
            onChange={(e) => {
              setMediaCreditPriceRub(Math.max(0, parseInt(e.target.value, 10) || 0));
              setSuccess(null);
            }}
            className="max-w-[140px] rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Пример: text→photo {form.token_cost_text_to_image} кред. × {mediaCreditPriceRub} ₽ ={" "}
            {(form.token_cost_text_to_image * mediaCreditPriceRub).toLocaleString("ru-RU")} ₽ с кошелька
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
