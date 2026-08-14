"use client";

import { Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ApiError,
  fetchAdminUploadFileSettings,
  updateAdminUploadFileSettings,
  type UploadFileSettings,
} from "@/lib/api";
import { AdminEmailSettingsPage } from "@/components/admin/AdminEmailSettingsPage";
import { AdminInvitesPage } from "@/components/admin/AdminInvitesPage";
import { AdminKiePage } from "@/components/admin/AdminKiePage";
import { AdminKieVideoPage } from "@/components/admin/AdminKieVideoPage";
import { AdminPaymentSettingsPage } from "@/components/admin/AdminPaymentSettingsPage";
import { AdminTelegramPage } from "@/components/admin/AdminTelegramPage";
import { AdminMetrikaPage } from "@/components/admin/AdminMetrikaPage";
import { AdminYandexGptPage } from "@/components/admin/AdminYandexGptPage";
import { cn } from "@/lib/utils";

type SettingsKey =
  | "upload-files"
  | "invites"
  | "telegram-notifications"
  | "payment"
  | "email-smtp"
  | "ai-yandex-gpt"
  | "ai-kie"
  | "ai-kie-video"
  | "analytics-metrika";

const SETTINGS_MENU: { key: SettingsKey; label: string; description: string }[] = [
  {
    key: "upload-files",
    label: "Загрузка файлов",
    description: "Форматы и лимиты размера",
  },
  {
    key: "invites",
    label: "Инвайты",
    description: "Ключи регистрации",
  },
  {
    key: "telegram-notifications",
    label: "Telegram — уведомления",
    description: "Бот и очередь событий",
  },
  {
    key: "payment",
    label: "Платёжный шлюз",
    description: "Robokassa и кошелёк",
  },
  {
    key: "email-smtp",
    label: "Email / SMTP",
    description: "Исходящая почта",
  },
  {
    key: "ai-yandex-gpt",
    label: "AI — Yandex GPT",
    description: "Текст, модели и цены",
  },
  {
    key: "ai-kie",
    label: "AI — KIE.ai",
    description: "Изображения и фильтры",
  },
  {
    key: "ai-kie-video",
    label: "AI — KIE.ai (видео)",
    description: "Видео, модели и примеры",
  },
  {
    key: "analytics-metrika",
    label: "Аналитика — Метрика",
    description: "OAuth для подключения счётчиков",
  },
];

const DEFAULT_SETTINGS: UploadFileSettings = {
  allowed_extensions: [
    "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif", "tiff", "tif", "ico",
    "mp4", "mov", "avi", "mkv", "webm", "m4v", "mpeg", "mpg", "wmv", "flv",
    "mp3", "wav", "ogg", "m4a", "aac", "flac", "wma",
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "md",
    "zip", "rar", "7z", "tar", "gz", "bz2",
  ],
  max_size_image_mb: 150,
  max_size_video_mb: 500,
  max_size_audio_mb: 100,
  max_size_archive_mb: 200,
  max_size_other_mb: 512,
};

function parseExtensionsInput(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);
}

function formatExtensionsInput(exts: string[]): string {
  return exts.join(", ");
}

function UploadFilesSettingsForm({
  form,
  onChange,
}: {
  form: UploadFileSettings;
  onChange: (next: UploadFileSettings) => void;
}) {
  const [extensionsText, setExtensionsText] = useState(formatExtensionsInput(form.allowed_extensions));

  useEffect(() => {
    setExtensionsText(formatExtensionsInput(form.allowed_extensions));
  }, [form.allowed_extensions]);

  function patch(partial: Partial<UploadFileSettings>) {
    onChange({ ...form, ...partial });
  }

  function handleExtensionsBlur() {
    patch({ allowed_extensions: parseExtensionsInput(extensionsText) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Загрузка файлов</h2>
        <p className="mt-1 text-sm text-slate-500">
          Глобальные ограничения платформы: разрешённые расширения и максимальный размер по категориям.
          Лимиты хранилища и максимальный размер одного файла для конкретного тарифа настраиваются в{" "}
          <Link href="/admin/plans" className="text-blue-600 hover:underline">
            Тарифах
          </Link>
          .
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Разрешённые расширения</span>
        <span className="mt-1 block text-xs text-slate-500">
          Через запятую или с новой строки, без точки (например: jpg, png, mp4, pdf)
        </span>
        <textarea
          value={extensionsText}
          onChange={(e) => setExtensionsText(e.target.value)}
          onBlur={handleExtensionsBlur}
          rows={6}
          className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
        />
        <span className="mt-1 block text-xs text-slate-400">
          Сейчас разрешено: {form.allowed_extensions.length} форматов
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(
          [
            ["max_size_image_mb", "Изображения", "jpg, png, webp…"],
            ["max_size_video_mb", "Видео", "mp4, mov, webm…"],
            ["max_size_audio_mb", "Аудио", "mp3, wav, ogg…"],
            ["max_size_archive_mb", "Архивы", "zip, rar, 7z…"],
            ["max_size_other_mb", "Прочие", "pdf, doc, txt…"],
          ] as const
        ).map(([key, label, hint]) => (
          <label key={key} className="text-xs font-medium text-slate-500">
            {label}
            <span className="mt-0.5 block font-normal text-slate-400">{hint}</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={10240}
                value={form[key]}
                onChange={(e) => patch({ [key]: Math.max(1, Number(e.target.value) || 1) })}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <span className="shrink-0 text-sm text-slate-500">МБ</span>
            </div>
          </label>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        При загрузке применяется меньший из двух лимитов: глобальный по категории файла и максимальный
        размер файла из тарифа workspace (если задан).
      </div>
    </div>
  );
}

function SettingsSectionContent({
  selected,
  uploadLoading,
  uploadForm,
  onUploadFormChange,
}: {
  selected: SettingsKey;
  uploadLoading: boolean;
  uploadForm: UploadFileSettings;
  onUploadFormChange: (next: UploadFileSettings) => void;
}) {
  if (selected === "upload-files") {
    if (uploadLoading) {
      return <p className="text-sm text-slate-500">Загрузка…</p>;
    }
    return <UploadFilesSettingsForm form={uploadForm} onChange={onUploadFormChange} />;
  }
  if (selected === "invites") {
    return <AdminInvitesPage embedded />;
  }
  if (selected === "telegram-notifications") {
    return <AdminTelegramPage embedded />;
  }
  if (selected === "payment") {
    return <AdminPaymentSettingsPage embedded />;
  }
  if (selected === "email-smtp") {
    return <AdminEmailSettingsPage embedded />;
  }
  if (selected === "ai-yandex-gpt") {
    return <AdminYandexGptPage embedded />;
  }
  if (selected === "ai-kie") {
    return <AdminKiePage embedded />;
  }
  if (selected === "ai-kie-video") {
    return <AdminKieVideoPage embedded />;
  }
  if (selected === "analytics-metrika") {
    return <AdminMetrikaPage embedded />;
  }
  return null;
}

export function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const initialSection = (searchParams.get("section") as SettingsKey) || "upload-files";

  const [selected, setSelected] = useState<SettingsKey>(
    SETTINGS_MENU.some((m) => m.key === initialSection) ? initialSection : "upload-files",
  );
  const [uploadLoading, setUploadLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadForm, setUploadForm] = useState<UploadFileSettings>(DEFAULT_SETTINGS);

  const loadUploadSettings = useCallback(async () => {
    setUploadLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUploadFileSettings();
      setUploadForm({ ...DEFAULT_SETTINGS, ...data.config });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить настройки");
    } finally {
      setUploadLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected === "upload-files") {
      void loadUploadSettings();
    }
  }, [selected, loadUploadSettings]);

  useEffect(() => {
    const section = searchParams.get("section") as SettingsKey | null;
    if (section && SETTINGS_MENU.some((m) => m.key === section)) {
      setSelected(section);
    }
  }, [searchParams]);

  async function handleSaveUploadSettings() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await updateAdminUploadFileSettings(uploadForm);
      setUploadForm({ ...DEFAULT_SETTINGS, ...data.config });
      setSuccess("Настройки загрузки файлов сохранены");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  const showUploadFooter = selected === "upload-files";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Настройки платформы</h1>
        <p className="mt-1 text-sm text-slate-500">
          Глобальные параметры Postilka. Подразделы сгруппированы по темам — как в разделе «Соцсети».
        </p>
      </div>

      {showUploadFooter && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {showUploadFooter && success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <div className="flex min-h-[620px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Разделы</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-0.5">
              {SETTINGS_MENU.map((item) => {
                const active = selected === item.key;
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
                      <span>{item.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">{item.description}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            <SettingsSectionContent
              selected={selected}
              uploadLoading={uploadLoading}
              uploadForm={uploadForm}
              onUploadFormChange={(next) => {
                setUploadForm(next);
                setSuccess(null);
              }}
            />
          </div>

          {showUploadFooter && (
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => void handleSaveUploadSettings()}
                disabled={saving || uploadLoading}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
