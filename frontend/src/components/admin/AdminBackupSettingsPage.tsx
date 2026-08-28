"use client";

import { Download, HardDrive, Play, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchAdminBackupDownload,
  fetchAdminBackups,
  runAdminBackup,
  updateAdminBackups,
  type BackupAdminView,
  type BackupFrequency,
  type BackupSettings,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { id: 1, label: "Понедельник" },
  { id: 2, label: "Вторник" },
  { id: 3, label: "Среда" },
  { id: 4, label: "Четверг" },
  { id: 5, label: "Пятница" },
  { id: 6, label: "Суббота" },
  { id: 0, label: "Воскресенье" },
];

function formatBytes(n: number) {
  if (!n) return "—";
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
}

function statusLabel(status: string) {
  switch (status) {
    case "queued":
      return "В очереди";
    case "running":
      return "Идёт";
    case "succeeded":
      return "Готов";
    case "failed":
      return "Ошибка";
    default:
      return status;
  }
}

const DEFAULT_SETTINGS: BackupSettings = {
  enabled: false,
  frequency: "daily",
  hour: 3,
  minute: 0,
  weekday: 1,
  retain_count: 7,
};

export function AdminBackupSettingsPage({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [view, setView] = useState<BackupAdminView | null>(null);
  const [settings, setSettings] = useState<BackupSettings>(DEFAULT_SETTINGS);

  const applyView = useCallback((data: BackupAdminView) => {
    setView(data);
    setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchAdminBackups();
      applyView(data);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить бекапы");
    }
  }, [applyView]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const busy = view?.runs.some((r) => r.status === "queued" || r.status === "running");
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => {
      void load();
    }, 3000);
    return () => clearInterval(t);
  }, [busy, load]);

  function patch(partial: Partial<BackupSettings>) {
    setSettings((prev) => ({ ...prev, ...partial }));
    setSuccess(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await updateAdminBackups({
        enabled: settings.enabled,
        frequency: settings.frequency as BackupFrequency,
        hour: settings.hour,
        minute: settings.minute,
        weekday: settings.weekday,
        retain_count: settings.retain_count,
      });
      applyView(data);
      setSuccess("Расписание сохранено");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    setSuccess(null);
    try {
      await runAdminBackup();
      setSuccess("Бекап поставлен в очередь. Worker заберёт его в течение минуты.");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось запустить бекап");
    } finally {
      setRunning(false);
    }
  }

  async function handleDownload(id: string) {
    try {
      const res = await fetchAdminBackupDownload(id);
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось получить ссылку");
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Загрузка…</p>;
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Бекапы</h2>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {!view?.storage_ready && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Сначала настройте S3 в разделе «S3 — хранилище». Архив пишется и локально в{" "}
          <code className="rounded bg-white px-1">backups/</code>, и в бакет с префиксом{" "}
          <code className="rounded bg-white px-1">platform-backups/</code>.
        </div>
      )}

      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-900">Что входит</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Postgres целиком: пользователи, каналы, зашифрованные токены, посты, настройки.</li>
          <li>MySQL WordPress и файлы сайта (темы, плагины, uploads).</li>
          <li>.env и SSL — без них каналы после восстановления не расшифруются.</li>
          <li>Манифест ключей S3. Сами фото/видео пользователей в архив не копируются.</li>
        </ul>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => patch({ enabled: e.target.checked })}
          />
          Включить расписание
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Частота</span>
          <select
            value={settings.frequency}
            onChange={(e) => patch({ frequency: e.target.value as BackupFrequency })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="daily">Каждый день</option>
            <option value="weekly">Раз в неделю</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Время (Москва)</span>
          <input
            type="time"
            value={`${String(settings.hour).padStart(2, "0")}:${String(settings.minute).padStart(2, "0")}`}
            onChange={(e) => {
              const [h, m] = e.target.value.split(":").map(Number);
              patch({ hour: h || 0, minute: m || 0 });
            }}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        {settings.frequency === "weekly" ? (
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">День недели</span>
            <select
              value={settings.weekday}
              onChange={(e) => patch({ weekday: Number(e.target.value) })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {WEEKDAYS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Хранить копий</span>
            <input
              type="number"
              min={1}
              max={90}
              value={settings.retain_count}
              onChange={(e) => patch({ retain_count: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        )}
        {settings.frequency === "weekly" ? (
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Хранить копий</span>
            <input
              type="number"
              min={1}
              max={90}
              value={settings.retain_count}
              onChange={(e) => patch({ retain_count: Math.max(1, Number(e.target.value) || 1) })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        ) : null}
      </div>

      {view?.settings.next_run_at && settings.enabled ? (
        <p className="text-xs text-slate-500">Следующий запуск: {formatWhen(view.settings.next_run_at)}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Сохранение…" : "Сохранить расписание"}
        </button>
        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={running || busy || !view?.storage_ready}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {busy ? "Бекап выполняется…" : running ? "Старт…" : "Сделать бекап сейчас"}
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-900">Восстановление одной командой</p>
        <pre className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800">
          {view?.restore_hint || "cd /opt/postilka && bash scripts/restore-full.sh --latest"}
        </pre>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-900">
          <HardDrive className="h-4 w-4" />
          Последние запуски
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Когда</th>
                <th className="px-3 py-2 font-medium">Тип</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Размер</th>
                <th className="px-3 py-2 font-medium">Медиа-ссылок</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(view?.runs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    Пока нет запусков
                  </td>
                </tr>
              ) : (
                view!.runs.map((run) => (
                  <tr key={run.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 whitespace-nowrap">{formatWhen(run.created_at)}</td>
                    <td className="px-3 py-2">{run.trigger === "manual" ? "Вручную" : "Расписание"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs",
                          run.status === "succeeded" && "bg-emerald-50 text-emerald-800",
                          run.status === "failed" && "bg-red-50 text-red-800",
                          (run.status === "queued" || run.status === "running") && "bg-amber-50 text-amber-900",
                        )}
                      >
                        {statusLabel(run.status)}
                      </span>
                      {run.error ? <p className="mt-1 max-w-xs text-xs text-red-700">{run.error}</p> : null}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatBytes(run.size_bytes)}</td>
                    <td className="px-3 py-2">{run.media_files || "—"}</td>
                    <td className="px-3 py-2">
                      {run.status === "succeeded" && run.s3_key ? (
                        <button
                          type="button"
                          onClick={() => void handleDownload(run.id)}
                          className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Скачать
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
