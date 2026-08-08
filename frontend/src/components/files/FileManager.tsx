"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  Folder,
  FolderInput,
  FolderPlus,
  ImageIcon,
  Pencil,
  RotateCcw,
  Trash2,
  Upload,
  Video,
  Clock,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { cn, formatBytes } from "@/lib/utils";
import {
  type FilesSection,
  type StorageStats,
  type WorkspaceFile,
  type WorkspaceFolder,
  bulkFiles,
  bulkFolders,
  copyFile,
  createFolder,
  deleteFile,
  deleteFolder,
  downloadFile,
  emptyTrash,
  getStorageStats,
  listFiles,
  listFolders,
  listTrash,
  moveFile,
  permanentDeleteTrash,
  renameFile,
  renameFolder,
  restoreTrash,
  uploadFile,
} from "@/lib/files-api";
import { useAuth } from "@/context/AuthContext";

type Selectable =
  | { kind: "file"; item: WorkspaceFile }
  | { kind: "folder"; item: WorkspaceFolder };

const SECTIONS: { id: FilesSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "my-files", label: "Мои файлы", icon: Folder },
  { id: "recent", label: "Недавние", icon: Clock },
  { id: "photos", label: "Фото", icon: ImageIcon },
  { id: "videos", label: "Видео", icon: Video },
  { id: "trash", label: "Корзина", icon: Trash2 },
];

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Video;
  return FileText;
}

function groupByDate(items: WorkspaceFile[]) {
  const map = new Map<string, WorkspaceFile[]>();
  for (const f of items) {
    const d = new Date(f.created_at);
    const key = d.toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(f);
  }
  return [...map.entries()];
}

export function FileManager() {
  const { active_workspace } = useAuth();
  const canEdit = useMemo(() => {
    const role = active_workspace?.role ?? "owner";
    return role === "owner" || role === "admin" || role === "editor";
  }, [active_workspace?.role]);

  const [section, setSection] = useState<FilesSection>("my-files");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedKinds, setSelectedKinds] = useState<Map<string, "file" | "folder">>(new Map());
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st] = await Promise.all([getStorageStats()]);
      setStats(st);
      if (section === "trash") {
        const tr = await listTrash();
        setFiles(tr.files);
        setFolders(tr.folders);
      } else {
        const [fRes, foRes] = await Promise.all([
          listFiles(section, section === "my-files" ? folderId : null),
          section === "my-files" ? listFolders(folderId) : Promise.resolve({ folders: [] as WorkspaceFolder[] }),
        ]);
        setFiles(fRes.files);
        setFolders(foRes.folders);
      }
      setSelected(new Set());
      setSelectedKinds(new Map());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [section, folderId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggleSelect = (id: string, kind: "file" | "folder") => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectedKinds((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, kind);
      return next;
    });
  };

  const selectedSize = useMemo(() => {
    let sum = 0;
    for (const f of files) {
      if (selected.has(f.id)) sum += f.size;
    }
    return sum;
  }, [files, selected]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length || !canEdit) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of [...fileList]) {
        await uploadFile(file, section === "my-files" ? folderId : null);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!canEdit) return;
    const name = window.prompt("Имя папки");
    if (!name?.trim()) return;
    try {
      await createFolder(name.trim(), folderId);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const handleRename = async (kind: "file" | "folder", id: string, current: string) => {
    const name = window.prompt("Новое имя", current);
    if (!name?.trim() || name.trim() === current) return;
    try {
      if (kind === "file") await renameFile(id, name.trim());
      else await renameFolder(id, name.trim());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const handleDeleteSelected = async () => {
    if (!canEdit || selected.size === 0) return;
    if (!window.confirm(`Удалить выбранное (${selected.size})?`)) return;
    const fileIds = [...selected].filter((id) => selectedKinds.get(id) === "file");
    const folderIds = [...selected].filter((id) => selectedKinds.get(id) === "folder");
    try {
      if (fileIds.length) await bulkFiles(fileIds, "delete");
      if (folderIds.length) await bulkFolders(folderIds, "delete");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка удаления");
    }
  };

  const handleDownloadSelected = async () => {
    const fileIds = [...selected].filter((id) => selectedKinds.get(id) === "file");
    for (const id of fileIds) {
      const { url } = await downloadFile(id);
      window.open(url, "_blank");
    }
  };

  const handleMoveSelected = async () => {
    const target = window.prompt("ID целевой папки (пусто = корень)");
    const folderTarget = target?.trim() ? target.trim() : null;
    const fileIds = [...selected].filter((id) => selectedKinds.get(id) === "file");
    const folderIds = [...selected].filter((id) => selectedKinds.get(id) === "folder");
    try {
      if (fileIds.length) await bulkFiles(fileIds, "move", folderTarget);
      if (folderIds.length) await bulkFolders(folderIds, "move", folderTarget);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка перемещения");
    }
  };

  const handleCopySelected = async () => {
    const target = window.prompt("ID целевой папки (пусто = корень)");
    const folderTarget = target?.trim() ? target.trim() : null;
    const fileIds = [...selected].filter((id) => selectedKinds.get(id) === "file");
    const folderIds = [...selected].filter((id) => selectedKinds.get(id) === "folder");
    try {
      if (fileIds.length) await bulkFiles(fileIds, "copy", folderTarget);
      if (folderIds.length) await bulkFolders(folderIds, "copy", folderTarget);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка копирования");
    }
  };

  const handleRestore = async (fileIds: string[], folderIds: string[]) => {
    try {
      await restoreTrash(fileIds, folderIds);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка восстановления");
    }
  };

  const grouped = section !== "trash" && section !== "my-files" ? groupByDate(files) : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 space-y-4 lg:w-56">
        {canEdit && (
          <button
            type="button"
            disabled={uploading || section === "trash"}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Загрузка…" : "Загрузить"}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleUpload(e.target.files);
            e.target.value = "";
          }}
        />

        <nav className="space-y-1 rounded-xl border border-border bg-surface p-2">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">Файлы</p>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSection(id);
                if (id !== "my-files") setFolderId(null);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm",
                section === id ? "bg-zinc-100 font-medium text-text" : "text-muted hover:bg-zinc-50",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {stats && (
          <div className="rounded-xl border border-border bg-surface p-3 text-sm">
            <p className="text-xs text-muted">Хранилище</p>
            <p className="mt-1 font-medium">
              {formatBytes(stats.used_bytes)}
              {stats.quota_bytes != null ? ` / ${formatBytes(stats.quota_bytes)}` : ""}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-accent"
                style={{
                  width: `${
                    stats.quota_bytes
                      ? Math.min(100, (stats.used_bytes / stats.quota_bytes) * 100)
                      : 5
                  }%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-muted">
              {stats.file_count} файлов · корзина {formatBytes(stats.trash_bytes)}
            </p>
          </div>
        )}
      </aside>

      <div className="min-w-0 flex-1">
        <PageHeader
          title={
            section === "my-files"
              ? folderId
                ? "Папка"
                : "Мои файлы"
              : SECTIONS.find((s) => s.id === section)?.label ?? "Файлы"
          }
          description={
            section === "trash"
              ? `Хранение в корзине: ${stats?.trash_retention_days ?? 0} дн.`
              : "Файлы текущего пространства"
          }
          actions={
            canEdit && section === "my-files" ? (
              <button
                type="button"
                onClick={() => void handleCreateFolder()}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-zinc-50"
              >
                <FolderPlus className="h-4 w-4" />
                Новая папка
              </button>
            ) : section === "trash" && canEdit ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Очистить корзину полностью?")) {
                    void emptyTrash().then(refresh);
                  }
                }}
                className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Очистить корзину
              </button>
            ) : undefined
          }
        />

        {section === "my-files" && folderId && (
          <button
            type="button"
            onClick={() => setFolderId(null)}
            className="mb-3 text-sm text-accent hover:underline"
          >
            ← Назад к корню
          </button>
        )}

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted">Загрузка…</p>
        ) : files.length === 0 && folders.length === 0 ? (
          <EmptyState
            title={section === "trash" ? "Корзина пуста" : "Нет файлов"}
            description={
              section === "trash"
                ? "Удалённые файлы и папки появятся здесь."
                : "Загрузите файлы или создайте папку."
            }
          />
        ) : (
          <div className="space-y-4">
            {section === "my-files" && folders.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {folders.map((fo) => (
                  <div
                    key={fo.id}
                    className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(fo.id)}
                      onChange={() => toggleSelect(fo.id, "folder")}
                      className="shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() => setFolderId(fo.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <Folder className="h-5 w-5 shrink-0 text-amber-500" />
                      <span className="truncate font-medium">{fo.name}</span>
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        title="Переименовать"
                        onClick={() => void handleRename("folder", fo.id, fo.name)}
                        className="rounded p-1 text-muted hover:bg-zinc-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {section === "trash" && folders.length > 0 && (
              <div className="space-y-2">
                {folders.map((fo) => (
                  <TrashRow
                    key={fo.id}
                    name={fo.name}
                    kind="folder"
                    selected={selected.has(fo.id)}
                    onToggle={() => toggleSelect(fo.id, "folder")}
                    canEdit={canEdit}
                    onRestore={() => void handleRestore([], [fo.id])}
                    onDelete={() => void permanentDeleteTrash(fo.id, "folder").then(refresh)}
                  />
                ))}
              </div>
            )}

            {(grouped ?? [["", files] as [string, WorkspaceFile[]]]).map(([label, groupFiles]) => (
              <div key={label || "all"}>
                {label && <h3 className="mb-2 text-sm font-medium capitalize text-muted">{label}</h3>}
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                  {groupFiles.map((f) => {
                    const Icon = fileIcon(f.mime_type);
                    return (
                      <div
                        key={f.id}
                        className="group flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(f.id)}
                          onChange={() => toggleSelect(f.id, "file")}
                        />
                        <Icon className="h-5 w-5 shrink-0 text-muted" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{f.name}</p>
                          <p className="text-xs text-muted">
                            {formatBytes(f.size)} ·{" "}
                            {new Date(f.created_at).toLocaleString("ru-RU")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {section !== "trash" && (
                            <button
                              type="button"
                              title="Скачать"
                              onClick={() => void downloadFile(f.id).then(({ url }) => window.open(url, "_blank"))}
                              className="rounded p-1.5 text-muted hover:bg-zinc-100"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          {canEdit && section !== "trash" && (
                            <>
                              <button
                                type="button"
                                title="Переименовать"
                                onClick={() => void handleRename("file", f.id, f.name)}
                                className="rounded p-1.5 text-muted hover:bg-zinc-100"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Копировать"
                                onClick={() => void copyFile(f.id, folderId).then(refresh)}
                                className="rounded p-1.5 text-muted hover:bg-zinc-100"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Удалить"
                                onClick={() => void deleteFile(f.id).then(refresh)}
                                className="rounded p-1.5 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {section === "trash" && canEdit && (
                            <>
                              <button
                                type="button"
                                title="Восстановить"
                                onClick={() => void handleRestore([f.id], [])}
                                className="rounded p-1.5 text-muted hover:bg-zinc-100"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Удалить навсегда"
                                onClick={() => void permanentDeleteTrash(f.id, "file").then(refresh)}
                                className="rounded p-1.5 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-2xl backdrop-blur">
            <span className="text-sm font-medium">
              {selected.size} выбрано · {formatBytes(selectedSize)}
            </span>
            <button
              type="button"
              onClick={() => void handleDownloadSelected()}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-100"
            >
              <Download className="h-4 w-4" /> Скачать
            </button>
            {canEdit && section !== "trash" && (
              <>
                <button
                  type="button"
                  onClick={() => void handleMoveSelected()}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-100"
                >
                  <FolderInput className="h-4 w-4" /> Переместить
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopySelected()}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-100"
                >
                  <Copy className="h-4 w-4" /> Копировать
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteSelected()}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1.5 text-sm text-white hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" /> Удалить
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setSelected(new Set());
                setSelectedKinds(new Map());
              }}
              className="text-sm text-muted hover:text-text"
            >
              Снять
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TrashRow({
  name,
  kind,
  selected,
  onToggle,
  canEdit,
  onRestore,
  onDelete,
}: {
  name: string;
  kind: string;
  selected: boolean;
  onToggle: () => void;
  canEdit: boolean;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <Folder className="h-5 w-5 text-amber-500" />
      <span className="flex-1 truncate text-sm font-medium">{name}</span>
      {canEdit && (
        <>
          <button type="button" onClick={onRestore} className="rounded p-1 hover:bg-zinc-100">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} className="rounded p-1 text-red-500 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
