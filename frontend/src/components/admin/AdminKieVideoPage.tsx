"use client";

import { PlugZap, Save, Trash2, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createAdminKieVideoExample,
  deleteAdminKieVideoExample,
  fetchAdminKieVideoExamples,
  fetchAdminKieVideoSettings,
  KIE_VIDEO_ASPECT_RATIOS,
  testAdminKieVideoConnection,
  updateAdminKieVideoSettings,
  type KieVideoAdminSettings,
  type KieVideoExample,
  type KieVideoModel,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const DEFAULT_SETTINGS: KieVideoAdminSettings = {
  api_base_url: "https://api.kie.ai",
  api_key_set: false,
  model_text_to_video: "",
  model_image_to_video: "",
  model_reference_to_video: "",
  default_duration_text_to_video: 5,
  default_duration_image_to_video: 5,
  default_duration_reference_to_video: 5,
  credits_per_second_text_to_video: 5,
  credits_per_second_image_to_video: 5,
  credits_per_second_reference_to_video: 8,
  media_credit_price_rub: 50,
};

const VIDEO_MODES = [
  { id: "text-to-video", label: "Текст → видео" },
  { id: "image-to-video", label: "Фото → видео" },
  { id: "reference-to-video", label: "Референс → видео" },
] as const;

type VideoMode = (typeof VIDEO_MODES)[number]["id"];

function sortModels(models: KieVideoModel[]) {
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
  models: KieVideoModel[];
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
          {model.category ? `[${model.category}] ` : ""}
          {model.name} ({model.id})
        </option>
      ))}
    </select>
  );
}

function aspectBoxSize(ratio: string): { w: number; h: number } {
  const [a, b] = ratio.split(":").map(Number);
  if (!a || !b) return { w: 48, h: 48 };
  const max = 56;
  if (a >= b) {
    return { w: max, h: Math.max(24, Math.round((max * b) / a)) };
  }
  return { w: Math.max(24, Math.round((max * a) / b)), h: max };
}

function AspectRatioPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {KIE_VIDEO_ASPECT_RATIOS.map((ratio) => {
        const { w, h } = aspectBoxSize(ratio);
        const active = value === ratio;
        return (
          <button
            key={ratio}
            type="button"
            onClick={() => onChange(ratio)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2 transition-colors",
              active
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded border text-[10px] font-medium",
                active ? "border-blue-400 bg-white" : "border-slate-300 bg-slate-50",
              )}
              style={{ width: w, height: h }}
            >
              {ratio}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DurationSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-sm text-slate-600">{value} сек</span>
      </div>
      <input
        type="range"
        min={4}
        max={15}
        step={1}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-slate-900"
      />
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>4 сек</span>
        <span>15 сек</span>
      </div>
    </div>
  );
}

function modeLabel(mode: string) {
  return VIDEO_MODES.find((m) => m.id === mode)?.label ?? mode;
}

function statusLabel(status: KieVideoExample["status"]) {
  switch (status) {
    case "pending":
      return "В очереди";
    case "generating":
      return "Генерация…";
    case "ready":
      return "Готово";
    case "failed":
      return "Ошибка";
    default:
      return status;
  }
}

export function AdminKieVideoPage({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [availableModels, setAvailableModels] = useState<KieVideoModel[]>([]);
  const [form, setForm] = useState<KieVideoAdminSettings>(DEFAULT_SETTINGS);
  const [mediaCreditPriceRub, setMediaCreditPriceRub] = useState(50);
  const [newApiKey, setNewApiKey] = useState("");
  const [examples, setExamples] = useState<KieVideoExample[]>([]);
  const [exampleMode, setExampleMode] = useState<VideoMode>("text-to-video");
  const [examplePrompt, setExamplePrompt] = useState("");
  const [exampleAspect, setExampleAspect] = useState("16:9");
  const [exampleDuration, setExampleDuration] = useState(5);
  const [exampleImages, setExampleImages] = useState<File[]>([]);

  const allVideoModels = useMemo(
    () => sortModels(availableModels),
    [availableModels],
  );

  const modelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of availableModels) {
      counts[m.category] = (counts[m.category] ?? 0) + 1;
    }
    return counts;
  }, [availableModels]);

  const readyCount = useMemo(
    () => examples.filter((e) => e.status === "ready").length,
    [examples],
  );

  const loadExamples = useCallback(async () => {
    try {
      const { examples: items } = await fetchAdminKieVideoExamples();
      setExamples(items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить примеры");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ settings }, _] = await Promise.all([
        fetchAdminKieVideoSettings(),
        loadExamples(),
      ]);
      setForm(settings);
      setMediaCreditPriceRub(Math.max(1, settings.media_credit_price_rub ?? 50));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось загрузить настройки");
    } finally {
      setLoading(false);
    }
  }, [loadExamples]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const hasActive = examples.some(
      (e) => e.status === "pending" || e.status === "generating",
    );
    if (!hasActive) return;
    const timer = setInterval(() => {
      void loadExamples();
    }, 4000);
    return () => clearInterval(timer);
  }, [examples, loadExamples]);

  useEffect(() => {
    switch (exampleMode) {
      case "image-to-video":
        setExampleDuration(form.default_duration_image_to_video);
        break;
      case "reference-to-video":
        setExampleDuration(form.default_duration_reference_to_video);
        break;
      default:
        setExampleDuration(form.default_duration_text_to_video);
    }
  }, [
    exampleMode,
    form.default_duration_text_to_video,
    form.default_duration_image_to_video,
    form.default_duration_reference_to_video,
  ]);

  function patch<K extends keyof KieVideoAdminSettings>(
    key: K,
    value: KieVideoAdminSettings[K],
  ) {
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
        model_text_to_video: form.model_text_to_video,
        model_image_to_video: form.model_image_to_video,
        model_reference_to_video: form.model_reference_to_video,
        default_duration_text_to_video: form.default_duration_text_to_video,
        default_duration_image_to_video: form.default_duration_image_to_video,
        default_duration_reference_to_video: form.default_duration_reference_to_video,
        credits_per_second_text_to_video: form.credits_per_second_text_to_video,
        credits_per_second_image_to_video: form.credits_per_second_image_to_video,
        credits_per_second_reference_to_video: form.credits_per_second_reference_to_video,
        media_credit_price_rub: Math.max(1, mediaCreditPriceRub),
      };
      if (newApiKey.trim()) {
        body.api_key = newApiKey.trim();
      }
      const { settings } = await updateAdminKieVideoSettings(body);
      setForm(settings);
      setMediaCreditPriceRub(Math.max(1, settings.media_credit_price_rub ?? 50));
      setNewApiKey("");
      setSuccess("Настройки KIE Video сохранены");
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
      const result = await testAdminKieVideoConnection({
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

  async function handleGenerateExample() {
    setGenerating(true);
    setError(null);
    try {
      await createAdminKieVideoExample({
        mode: exampleMode,
        prompt: examplePrompt,
        aspect_ratio: exampleAspect,
        duration: exampleDuration,
        images: exampleImages.length > 0 ? exampleImages : undefined,
      });
      setExamplePrompt("");
      setExampleImages([]);
      await loadExamples();
      setSuccess("Генерация примера запущена");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось создать пример");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteExample(id: string) {
    setError(null);
    try {
      await deleteAdminKieVideoExample(id);
      await loadExamples();
      setSuccess("Пример удалён");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить пример");
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Загрузка…</p>;
  }

  return (
    <div className={embedded ? "space-y-6" : "mx-auto max-w-3xl space-y-6"}>
      <div>
        {embedded ? (
          <h2 className="text-lg font-semibold text-slate-900">KIE.ai — видео</h2>
        ) : (
          <h1 className="text-2xl font-semibold text-slate-900">KIE.ai — видео</h1>
        )}
        <p className="mt-1 text-sm text-slate-500">
          Отдельный ключ и модели для генерации видео. Примеры показываются пользователям в интерфейсе (до 4 шт.).
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
        <h2 className="text-base font-semibold text-slate-900">KIE.ai Video</h2>
        <p className="text-sm text-slate-500">Отдельный API-ключ для видеогенерации</p>

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
          <label className="mb-1.5 block text-sm font-medium">API Key (видео)</label>
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
              ? "Ключ сохранён. Введите новый, чтобы заменить."
              : "Ключ не задан — используется KIE_VIDEO_API_KEY из env"}
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
              {availableModels.length > 0 ? (
                <>
                  {" "}
                  · моделей: {availableModels.length}
                  {Object.keys(modelCounts).length > 0
                    ? ` (${Object.entries(modelCounts)
                        .map(([cat, n]) => `${n} ${cat}`)
                        .join(", ")})`
                    : ""}
                </>
              ) : (
                ""
              )}
            </span>
          )}
        </div>
        {testError && <p className="text-sm text-red-700">{testError}</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Модели KIE Market</h2>
          <p className="mt-1 text-sm text-slate-500">
            После успешного теста выберите модели для каждого режима. В списке — все модели KIE Market Video ({allVideoModels.length || "—"}).
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Текст → видео</label>
          <ModelSelect
            value={form.model_text_to_video}
            onChange={(v) => patch("model_text_to_video", v)}
            models={allVideoModels}
            emptyLabel="Выберите модель"
          />
          <DurationSlider
            label="Длительность по умолчанию"
            value={form.default_duration_text_to_video}
            onChange={(v) => patch("default_duration_text_to_video", v)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Фото → видео</label>
          <ModelSelect
            value={form.model_image_to_video}
            onChange={(v) => patch("model_image_to_video", v)}
            models={allVideoModels}
            emptyLabel="Выберите модель"
          />
          <DurationSlider
            label="Длительность по умолчанию"
            value={form.default_duration_image_to_video}
            onChange={(v) => patch("default_duration_image_to_video", v)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Референс → видео</label>
          <ModelSelect
            value={form.model_reference_to_video}
            onChange={(v) => patch("model_reference_to_video", v)}
            models={allVideoModels}
            emptyLabel="Выберите модель"
          />
          <DurationSlider
            label="Длительность по умолчанию"
            value={form.default_duration_reference_to_video}
            onChange={(v) => patch("default_duration_reference_to_video", v)}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Кредиты за секунду</h2>
          <p className="mt-1 text-sm text-slate-500">
            Списание = длительность (сек) × кредиты за секунду. Сначала расходуется included-квота
            тарифа, остаток — с кошелька пользователя.
          </p>
        </div>

        {(
          [
            [
              "credits_per_second_text_to_video",
              "default_duration_text_to_video",
              "Текст → видео",
            ],
            [
              "credits_per_second_image_to_video",
              "default_duration_image_to_video",
              "Фото → видео",
            ],
            [
              "credits_per_second_reference_to_video",
              "default_duration_reference_to_video",
              "Референс → видео",
            ],
          ] as const
        ).map(([rateKey, durationKey, label]) => {
          const rate = form[rateKey];
          const duration = form[durationKey];
          const totalCredits = duration * rate;
          return (
            <div key={rateKey}>
              <label className="mb-1.5 block text-sm font-medium">{label}</label>
              <input
                type="number"
                min={0}
                value={rate}
                onChange={(e) =>
                  patch(rateKey, Math.max(0, parseInt(e.target.value, 10) || 0))
                }
                className="max-w-[140px] rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">Кредитов за 1 секунду видео</p>
              {mediaCreditPriceRub > 0 && rate > 0 && duration > 0 ? (
                <p className="mt-0.5 text-xs text-slate-600">
                  Пример ({duration} сек): {totalCredits} кред. · с кошелька при overage:{" "}
                  {(totalCredits * mediaCreditPriceRub).toLocaleString("ru-RU")} ₽ (= {duration} ×{" "}
                  {rate} × {mediaCreditPriceRub} ₽)
                </p>
              ) : null}
            </div>
          );
        })}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Стоимость кредита для кошелька</h2>
          <p className="mt-1 text-sm text-slate-500">
            Цена одного кредита в рублях. Списание с кошелька ={" "}
            <span className="font-medium text-slate-700">секунды × кред/сек × эта стоимость</span>.
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
              setMediaCreditPriceRub(Math.max(1, parseInt(e.target.value, 10) || 0));
              setSuccess(null);
            }}
            className="max-w-[140px] rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">
            Пример: text→video {form.default_duration_text_to_video} сек ×{" "}
            {form.credits_per_second_text_to_video} кред/сек × {mediaCreditPriceRub} ₽ ={" "}
            {(
              form.default_duration_text_to_video *
              form.credits_per_second_text_to_video *
              mediaCreditPriceRub
            ).toLocaleString("ru-RU")}{" "}
            ₽ с кошелька
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Примеры для пользователей</h2>
          <p className="mt-1 text-sm text-slate-500">
            Сгенерируйте до 4 примеров — промпт и результат будут показаны в пользовательском интерфейсе.
            Сейчас готово: {readyCount} / 4
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Режим</label>
          <div className="flex flex-wrap gap-2">
            {VIDEO_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setExampleMode(m.id);
                  setExampleImages([]);
                }}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm transition-colors",
                  exampleMode === m.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Промпт</label>
          <textarea
            value={examplePrompt}
            onChange={(e) => setExamplePrompt(e.target.value)}
            rows={3}
            placeholder="Опишите сцену для видео…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {(exampleMode === "image-to-video" || exampleMode === "reference-to-video") && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {exampleMode === "reference-to-video"
                ? "Референс-изображения"
                : "Исходное фото"}
            </label>
            <input
              type="file"
              accept="image/*"
              multiple={exampleMode === "reference-to-video"}
              onChange={(e) => setExampleImages(Array.from(e.target.files ?? []))}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium">Ориентация</label>
          <AspectRatioPicker value={exampleAspect} onChange={setExampleAspect} />
        </div>

        <DurationSlider
          label="Длительность"
          value={exampleDuration}
          onChange={setExampleDuration}
        />

        <button
          type="button"
          onClick={() => void handleGenerateExample()}
          disabled={generating || readyCount >= 4 || !examplePrompt.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Video className="h-4 w-4" />
          {generating ? "Запуск…" : "Сгенерировать пример"}
        </button>

        {examples.length > 0 && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            {examples.map((ex) => (
              <div
                key={ex.id}
                className="rounded-lg border border-slate-200 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      {modeLabel(ex.mode)} · {ex.aspect_ratio} · {ex.duration} сек ·{" "}
                      {statusLabel(ex.status)}
                    </p>
                    <p className="mt-1 text-sm text-slate-800 line-clamp-3">{ex.prompt}</p>
                    {ex.fail_message && (
                      <p className="mt-1 text-xs text-red-700">{ex.fail_message}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteExample(ex.id)}
                    className="shrink-0 rounded-md border border-slate-200 p-2 text-slate-500 hover:bg-red-50 hover:text-red-700"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {ex.video_url && ex.status === "ready" && (
                  <video
                    src={ex.video_url}
                    controls
                    className="max-h-48 w-full rounded-md bg-black"
                  />
                )}
              </div>
            ))}
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
