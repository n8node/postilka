"use client";

import { Copy, Eye, EyeOff, Save, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchAdminStorageSettings,
  testAdminStorageConnection,
  updateAdminStorageSettings,
  type StorageAdminView,
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

function CopyBlock({ value }: { value: string }) {
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
    <div className="relative">
      <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800">
        {value}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs hover:bg-slate-50"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? "Скопировано" : "Копировать"}
      </button>
    </div>
  );
}

function secretPlaceholder(set: boolean, hint: string, empty: string) {
  if (set && hint) return `Новый ключ (текущий: ${hint})`;
  if (set) return "Новый ключ (текущий: ••••)";
  return empty;
}

export function AdminStorageSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testOk, setTestOk] = useState<boolean | null>(null);

  const [endpoint, setEndpoint] = useState("");
  const [bucket, setBucket] = useState("");
  const [region, setRegion] = useState("ru-central1");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [secretKeySet, setSecretKeySet] = useState(false);
  const [secretKeyHint, setSecretKeyHint] = useState("");
  const [useSSL, setUseSSL] = useState(true);
  const [pathStyle, setPathStyle] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [corsXML, setCorsXML] = useState("");
  const [corsOrigins, setCorsOrigins] = useState<string[]>([]);

  const applyView = useCallback((data: StorageAdminView) => {
    setEndpoint(data.endpoint);
    setBucket(data.bucket);
    setRegion(data.region || "ru-central1");
    setAccessKey(data.access_key);
    setSecretKeySet(data.secret_key_set);
    setSecretKeyHint(data.secret_key_hint || "");
    setUseSSL(data.use_ssl);
    setPathStyle(data.path_style);
    setEnabled(data.enabled);
    setCorsXML(data.cors_xml);
    setCorsOrigins(data.cors_origins);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminStorageSettings();
      applyView(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить настройки S3");
    } finally {
      setLoading(false);
    }
  }, [applyView]);

  useEffect(() => {
    void load();
  }, [load]);

  function buildPayload() {
    return {
      endpoint: endpoint.trim(),
      bucket: bucket.trim(),
      region: region.trim(),
      access_key: accessKey.trim(),
      use_ssl: useSSL,
      path_style: pathStyle,
      enabled,
      ...(secretKey.trim() ? { secret_key: secretKey.trim() } : {}),
    };
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await updateAdminStorageSettings(buildPayload());
      applyView(data);
      setSecretKey("");
      setSuccess("Настройки S3 сохранены");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить настройки");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestMessage(null);
    setTestOk(null);
    setError(null);
    try {
      if (secretKey.trim()) {
        const saved = await updateAdminStorageSettings(buildPayload());
        applyView(saved);
        setSecretKey("");
      }
      const result = await testAdminStorageConnection();
      setTestOk(result.ok);
      setTestMessage(result.message);
      if (result.ok) {
        setEnabled(true);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось проверить подключение");
    } finally {
      setTesting(false);
    }
  }

  const domainHint =
    corsOrigins.find((o) => o.startsWith("https://") && !o.includes("www."))?.replace("https://", "") ||
    "ваш-домен.ru";

  if (loading) {
    return <p className="text-sm text-slate-500">Загрузка…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">S3-совместимое хранилище</h1>
        <p className="mt-1 text-sm text-slate-500">
          Beget, Yandex Cloud, SberCloud, Selectel и другие S3-совместимые провайдеры.
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
          <label className="mb-1.5 block text-sm font-medium">Endpoint (URL)</label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://s3.ru1.storage.beget.cloud"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Bucket (имя бакета)</label>
          <input
            type="text"
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            placeholder="my-bucket"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Region</label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="ru-central1"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Access Key ID</label>
          <input
            type="text"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            autoComplete="off"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Secret Access Key</label>
          <SecretInput
            value={secretKey}
            onChange={setSecretKey}
            placeholder={secretPlaceholder(secretKeySet, secretKeyHint, "Secret Access Key")}
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={useSSL}
              onChange={(e) => setUseSSL(e.target.checked)}
              className="rounded border-slate-300"
            />
            HTTPS (Use SSL)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pathStyle}
              onChange={(e) => setPathStyle(e.target.checked)}
              className="rounded border-slate-300"
            />
            Path-style адресация
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="rounded border-slate-300"
            />
            Включить хранилище
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
          <button
            type="button"
            disabled={testing}
            onClick={handleTest}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <Zap className="h-4 w-4" />
            {testing ? "Проверка…" : "Проверка соединения"}
          </button>
        </div>

        {testMessage && (
          <p
            className={cn(
              "text-sm",
              testOk ? "text-green-800" : "text-red-800",
            )}
          >
            {testMessage}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Настройки CORS для бакета S3</h2>
          <p className="mt-1 text-sm text-slate-500">
            Чтобы загрузка и использование файлов работали с домена{" "}
            <span className="font-medium text-slate-700">{domainHint}</span>, добавьте в настройки CORS
            бакета следующую конфигурацию:
          </p>
        </div>

        {corsXML && <CopyBlock value={corsXML} />}

        <p className="text-xs text-slate-500">
          Beget: Cloud → Object Storage → выбрать бакет → CORS. Yandex Cloud: Object Storage → бакет →
          CORS. Selectel: панель → Object Storage → CORS.
        </p>
      </section>
    </div>
  );
}
