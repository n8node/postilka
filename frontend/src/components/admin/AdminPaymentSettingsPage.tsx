"use client";

import { Copy, Eye, EyeOff, Save, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchAdminPaymentSettings,
  testAdminPaymentConnection,
  updateAdminPaymentSettings,
  type PaymentAdminView,
  type RobokassaAdminSettings,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function SecretInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
        aria-label={visible ? "Скрыть" : "Показать"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        readOnly
        value={value}
        className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs outline-none"
      />
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
      >
        <Copy className="h-4 w-4" />
        {copied ? "Скопировано" : "Копировать"}
      </button>
    </div>
  );
}

function passwordPlaceholder(set: boolean, hint: string, empty: string) {
  if (set && hint) return `Новый ключ (текущий: ${hint})`;
  if (set) return "Новый ключ (текущий: ••••)";
  return empty;
}

export function AdminPaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const [robokassa, setRobokassa] = useState<RobokassaAdminSettings>({
    merchant_login: "",
    test_mode: false,
    enabled: false,
  });
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [password1Set, setPassword1Set] = useState(false);
  const [password1Hint, setPassword1Hint] = useState("");
  const [password2Set, setPassword2Set] = useState(false);
  const [password2Hint, setPassword2Hint] = useState("");
  const [resultURL, setResultURL] = useState("");
  const [minTopup, setMinTopup] = useState(10000);
  const [maxTopup, setMaxTopup] = useState(10000000);

  const applyView = useCallback((data: PaymentAdminView) => {
    setRobokassa(data.robokassa);
    setPassword1Set(data.robokassa_password1_set);
    setPassword1Hint(data.robokassa_password1_hint || "");
    setPassword2Set(data.robokassa_password2_set);
    setPassword2Hint(data.robokassa_password2_hint || "");
    setResultURL(data.robokassa_result_url);
    setMinTopup(data.wallet_topup_min_cents);
    setMaxTopup(data.wallet_topup_max_cents);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminPaymentSettings();
      applyView(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить настройки платежей");
    } finally {
      setLoading(false);
    }
  }, [applyView]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await updateAdminPaymentSettings({
        active_provider: "robokassa",
        robokassa,
        wallet_topup_min_cents: minTopup,
        wallet_topup_max_cents: maxTopup,
        ...(password1.trim() ? { robokassa_password1: password1.trim() } : {}),
        ...(password2.trim() ? { robokassa_password2: password2.trim() } : {}),
      });
      applyView(data);
      setPassword1("");
      setPassword2("");
      setSuccess("Настройки Robokassa сохранены");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestMessage(null);
    setError(null);
    try {
      if (password1.trim() || password2.trim()) {
        const saved = await updateAdminPaymentSettings({
          active_provider: "robokassa",
          robokassa,
          wallet_topup_min_cents: minTopup,
          wallet_topup_max_cents: maxTopup,
          ...(password1.trim() ? { robokassa_password1: password1.trim() } : {}),
          ...(password2.trim() ? { robokassa_password2: password2.trim() } : {}),
        });
        applyView(saved);
        setPassword1("");
        setPassword2("");
      }
      const result = await testAdminPaymentConnection();
      setTestMessage(result.message);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось проверить подключение");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Загрузка…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Платёжный шлюз</h1>
        <p className="mt-1 text-sm text-slate-500">
          Robokassa — основной провайдер оплаты тарифов и пополнения кошелька.
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
        <div>
          <h2 className="text-lg font-semibold">Robokassa</h2>
          <p className="mt-1 text-sm text-slate-500">
            Данные из технических настроек магазина в личном кабинете Robokassa.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Логин магазина</label>
          <input
            type="text"
            value={robokassa.merchant_login}
            onChange={(e) => setRobokassa((p) => ({ ...p, merchant_login: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">MerchantLogin в кабинете Robokassa.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Пароль #1</label>
          <SecretInput
            value={password1}
            onChange={setPassword1}
            placeholder={passwordPlaceholder(password1Set, password1Hint, "Пароль для формирования ссылки на оплату")}
          />
          <p className="mt-1 text-xs text-slate-500">
            Для генерации ссылки на оплату. Хранится в зашифрованном виде в БД.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Пароль #2</label>
          <SecretInput
            value={password2}
            onChange={setPassword2}
            placeholder={passwordPlaceholder(password2Set, password2Hint, "Пароль для проверки Result URL")}
          />
          <p className="mt-1 text-xs text-slate-500">
            Для проверки уведомлений через Result URL (не путать с паролем #1).
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={robokassa.test_mode}
            onChange={(e) => setRobokassa((p) => ({ ...p, test_mode: e.target.checked }))}
            className="rounded border-slate-300"
          />
          Тестовый режим (IsTest=1)
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={robokassa.enabled}
            onChange={(e) => setRobokassa((p) => ({ ...p, enabled: e.target.checked }))}
            className="rounded border-slate-300"
          />
          Включить оплату тарифов и пополнение кошелька через Robokassa
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Мин. пополнение (коп.)</label>
            <input
              type="number"
              min={100}
              value={minTopup}
              onChange={(e) => setMinTopup(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Макс. пополнение (коп.)</label>
            <input
              type="number"
              min={100}
              value={maxTopup}
              onChange={(e) => setMaxTopup(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Сохранение…" : "Сохранить Robokassa"}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="font-semibold">Result URL для кабинета Robokassa</h3>
        <CopyField value={resultURL} />
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
          <li>В кабинете Robokassa выберите алгоритм подписи MD5.</li>
          <li>
            Если используются пользовательские Shp_* параметры, их нужно включать в подпись — текущая
            реализация их не передаёт.
          </li>
        </ul>
        <a
          href="https://docs.robokassa.ru/ru/notifications-and-redirects"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-blue-600 hover:underline"
        >
          Документация Robokassa
        </a>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <p className="text-sm text-slate-600">
          Проверяет, что логин и оба пароля заполнены.
        </p>
        <button
          type="button"
          disabled={testing}
          onClick={handleTest}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <Zap className="h-4 w-4" />
          {testing ? "Проверка…" : "Проверить подключение"}
        </button>
        {testMessage && (
          <p
            className={cn(
              "text-sm",
              testMessage.includes("заполн") || testMessage.includes("Учётные")
                ? "text-green-800"
                : "text-slate-600",
            )}
          >
            {testMessage}
          </p>
        )}
      </section>
    </div>
  );
}
