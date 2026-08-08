"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ApiError,
  fetchAdminFileFolders,
  fetchAdminFiles,
  fetchAdminWorkspaces,
  type AdminFile,
  type AdminFileStats,
  type AdminFilesQuery,
  type AdminFolderListItem,
  type AdminWorkspaceListItem,
} from "@/lib/api";
import { formatBytes } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  image: "Изображения",
  video: "Видео",
  audio: "Аудио",
  document: "Документы",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mimeBadge(mime: string) {
  if (mime.startsWith("image/")) return "Изображение";
  if (mime.startsWith("video/")) return "Видео";
  if (mime.startsWith("audio/")) return "Аудио";
  return "Файл";
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function AdminFilesPage() {
  const searchParams = useSearchParams();
  const initialUploadedBy = searchParams.get("uploaded_by") ?? "";

  const [files, setFiles] = useState<AdminFile[]>([]);
  const [stats, setStats] = useState<AdminFileStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [folderId, setFolderId] = useState("");
  const [uploadedBy, setUploadedBy] = useState(initialUploadedBy);
  const [typeFilter, setTypeFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [sizeMinMb, setSizeMinMb] = useState("");
  const [sizeMaxMb, setSizeMaxMb] = useState("");
  const [deletedFilter, setDeletedFilter] = useState<"active" | "trash" | "all">("active");

  const [workspaces, setWorkspaces] = useState<AdminWorkspaceListItem[]>([]);
  const [folders, setFolders] = useState<AdminFolderListItem[]>([]);
  const [uploaderLabel, setUploaderLabel] = useState<string | null>(null);

  useEffect(() => {
    void fetchAdminWorkspaces({ limit: 200 })
      .then((r) => setWorkspaces(r.workspaces))
      .catch(() => setWorkspaces([]));
  }, []);

  useEffect(() => {
    setUploadedBy(initialUploadedBy);
  }, [initialUploadedBy]);

  useEffect(() => {
    if (!workspaceId) {
      setFolders([]);
      setFolderId("");
      return;
    }
    if (deletedFilter === "trash") {
      setFolderId("");
    }
    void fetchAdminFileFolders(workspaceId, deletedFilter === "trash")
      .then((r) => setFolders(r.folders))
      .catch(() => setFolders([]));
  }, [workspaceId, deletedFilter]);

  const query = useMemo((): AdminFilesQuery => {
    const out: AdminFilesQuery = { limit: 100 };
    if (q.trim()) out.q = q.trim();
    if (workspaceId) out.workspace_id = workspaceId;
    if (workspaceId && deletedFilter !== "trash") {
      if (folderId === "root") out.folder_id = "root";
      else if (folderId) out.folder_id = folderId;
    }
    if (uploadedBy) out.uploaded_by = uploadedBy;
    if (typeFilter) out.type = typeFilter;
    if (createdFrom) out.created_from = createdFrom;
    if (createdTo) out.created_to = createdTo;
    const minMb = Number(sizeMinMb);
    if (sizeMinMb && Number.isFinite(minMb) && minMb > 0) {
      out.size_min = Math.round(minMb * 1024 * 1024);
    }
    const maxMb = Number(sizeMaxMb);
    if (sizeMaxMb && Number.isFinite(maxMb) && maxMb > 0) {
      out.size_max = Math.round(maxMb * 1024 * 1024);
    }
    if (deletedFilter === "trash") out.deleted_only = true;
    if (deletedFilter === "active") out.deleted_only = false;
    return out;
  }, [
    q,
    workspaceId,
    folderId,
    uploadedBy,
    typeFilter,
    createdFrom,
    createdTo,
    sizeMinMb,
    sizeMaxMb,
    deletedFilter,
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminFiles(query);
      setFiles(data.files);
      setStats(data.stats);
      setTotal(data.total);
      if (query.uploaded_by) {
        const f = data.files.find((item) => item.uploaded_by_user_id === query.uploaded_by);
        setUploaderLabel(
          f ? f.uploader_name || f.uploader_email || query.uploaded_by : query.uploaded_by,
        );
      } else {
        setUploaderLabel(null);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить файлы");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(t);
  }, [load]);

  function clearUploaderFilter() {
    setUploadedBy("");
    setUploaderLabel(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("uploaded_by");
    window.history.replaceState({}, "", url.pathname + url.search);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Файлы</h1>
          <p className="mt-1 text-sm text-slate-500">
            Все загруженные файлы платформы · найдено: {total}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Обновить
        </button>
      </div>

      {uploadedBy && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <span>
            Фильтр по пользователю:{" "}
            <strong>{uploaderLabel ?? uploadedBy}</strong>
          </span>
          <button
            type="button"
            onClick={clearUploaderFilter}
            className="rounded-md border border-blue-300 px-2 py-0.5 text-xs hover:bg-blue-100"
          >
            Сбросить
          </button>
        </div>
      )}

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Активных файлов" value={String(stats.total_files)} />
          <StatCard label="Объём активных" value={formatBytes(stats.total_bytes)} />
          <StatCard label="В корзине" value={String(stats.trash_files)} />
          <StatCard label="Объём корзины" value={formatBytes(stats.trash_bytes)} />
        </div>
      )}

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-medium text-slate-500 md:col-span-2 xl:col-span-2">
          Поиск по имени файла
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Имя файла…"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Пространство
          <select
            value={workspaceId}
            onChange={(e) => {
              setWorkspaceId(e.target.value);
              setFolderId("");
            }}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
          >
            <option value="">Все</option>
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">
          Папка
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            disabled={!workspaceId || deletedFilter === "trash"}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:opacity-50"
          >
            <option value="">
              {deletedFilter === "trash" ? "Недоступно для корзины" : "Все папки"}
            </option>
            {deletedFilter !== "trash" && <option value="root">Корень</option>}
            {folders.map((fo) => (
              <option key={fo.id} value={fo.id}>
                {fo.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">
          Формат
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
          >
            <option value="">Все</option>
            {Object.entries(typeLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">
          Статус
          <select
            value={deletedFilter}
            onChange={(e) => setDeletedFilter(e.target.value as typeof deletedFilter)}
            className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
          >
            <option value="active">Активные</option>
            <option value="trash">В корзине</option>
            <option value="all">Все</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">
          Дата от
          <input
            type="date"
            value={createdFrom}
            onChange={(e) => setCreatedFrom(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Дата до
          <input
            type="date"
            value={createdTo}
            onChange={(e) => setCreatedTo(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Размер от, МБ
          <input
            type="number"
            min={0}
            step={0.1}
            value={sizeMinMb}
            onChange={(e) => setSizeMinMb(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Размер до, МБ
          <input
            type="number"
            min={0}
            step={0.1}
            value={sizeMaxMb}
            onChange={(e) => setSizeMaxMb(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
        </label>
        <label className="text-xs font-medium text-slate-500 md:col-span-2">
          ID пользователя (загрузил)
          <input
            value={uploadedBy}
            onChange={(e) => setUploadedBy(e.target.value.trim())}
            placeholder="UUID пользователя"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-xs outline-none focus:border-blue-400"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Файл</th>
                <th className="px-4 py-3">Формат</th>
                <th className="px-4 py-3">Размер</th>
                <th className="px-4 py-3">Пространство</th>
                <th className="px-4 py-3">Папка</th>
                <th className="px-4 py-3">Загрузил</th>
                <th className="px-4 py-3">Создан</th>
                {(deletedFilter === "trash" || deletedFilter === "all") && (
                  <th className="px-4 py-3">Удалён</th>
                )}
                <th className="px-4 py-3">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td
                    colSpan={deletedFilter === "trash" || deletedFilter === "all" ? 9 : 8}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Загрузка…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td
                    colSpan={deletedFilter === "trash" || deletedFilter === "all" ? 9 : 8}
                    className="px-4 py-10 text-center text-rose-600"
                  >
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && files.length === 0 && (
                <tr>
                  <td
                    colSpan={deletedFilter === "trash" || deletedFilter === "all" ? 9 : 8}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Файлы не найдены
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                files.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="max-w-[220px] truncate font-medium text-slate-900">{f.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">{f.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="block">{mimeBadge(f.mime_type)}</span>
                      <span className="text-xs text-slate-400">{f.mime_type}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatBytes(f.size)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{f.workspace_name}</p>
                      <p className="font-mono text-[10px] text-slate-400">{f.workspace_id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {f.folder_name ?? (f.folder_id ? "—" : "Корень")}
                    </td>
                    <td className="px-4 py-3">
                      {f.uploaded_by_user_id ? (
                        <>
                          <Link
                            href={`/admin/files?uploaded_by=${f.uploaded_by_user_id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {f.uploader_name || f.uploader_email || "—"}
                          </Link>
                          <p className="text-xs text-slate-400">{f.uploader_email}</p>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatDateTime(f.created_at)}
                    </td>
                    {(deletedFilter === "trash" || deletedFilter === "all") && (
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {f.deleted_at ? formatDateTime(f.deleted_at) : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {f.deleted_at ? (
                        <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-600/15 ring-inset">
                          Корзина
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/15 ring-inset">
                          Активен
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
