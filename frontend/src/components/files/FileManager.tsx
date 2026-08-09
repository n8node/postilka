"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Download,
  Folder,
  FolderInput,
  FolderPlus,
  Grid3x3,
  ImageIcon,
  LayoutGrid,
  Pencil,
  RotateCcw,
  Trash2,
  Upload,
  Video,
  Clock,
} from "lucide-react";
import { PageHeader, type Crumb } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { FileCirclePreview } from "@/components/files/FileCirclePreview";
import { FileDetailPanel } from "@/components/files/FileDetailPanel";
import { MoveTargetDialog, type MoveTarget } from "@/components/files/MoveTargetDialog";
import { MediaGalleryGrid, type MediaGridMode } from "@/components/files/MediaGalleryGrid";
import { UploadProgressPanel } from "@/components/files/UploadProgressPanel";
import { cn, formatBytes } from "@/lib/utils";
import { formatMediaDuration, getFileDuration } from "@/lib/file-media";
import { setActiveWorkspace } from "@/lib/api";
import {
  type FilesSection,
  type FolderBreadcrumb,
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
  fetchFolderBreadcrumbs,
  getStorageStats,
  listFiles,
  listFolders,
  listTrash,
  permanentDeleteTrash,
  renameFile,
  renameFolder,
  restoreTrash,
  transferFile,
} from "@/lib/files-api";
import { uploadQueue, type UploadJob } from "@/lib/upload-queue";
import { useAuth } from "@/context/AuthContext";

const SECTIONS: { id: FilesSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "my-files", label: "Мои файлы", icon: Folder },
  { id: "recent", label: "Недавние", icon: Clock },
  { id: "photos", label: "Фото", icon: ImageIcon },
  { id: "videos", label: "Видео", icon: Video },
  { id: "trash", label: "Корзина", icon: Trash2 },
];

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

function formatFileTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Сегодня ${time}`;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatFileMeta(file: WorkspaceFile) {
  const parts = [formatBytes(file.size)];
  const duration = getFileDuration(file);
  if (duration != null) parts.push(formatMediaDuration(duration));
  parts.push(formatFileTime(file.created_at));
  return parts.join(" · ");
}

export function FileManager() {
  const { active_workspace } = useAuth();
  const canEdit = useMemo(() => {
    const role = active_workspace?.role ?? "owner";
    return role === "owner" || role === "admin" || role === "editor";
  }, [active_workspace?.role]);

  const [section, setSection] = useState<FilesSection>("my-files");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folderTrail, setFolderTrail] = useState<FolderBreadcrumb[]>([]);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedKinds, setSelectedKinds] = useState<Map<string, "file" | "folder">>(new Map());
  const [uploadJobs, setUploadJobs] = useState<UploadJob[]>([]);
  const [appearIds, setAppearIds] = useState<Set<string>>(new Set());
  const [moveDialog, setMoveDialog] = useState<{ mode: "move" | "copy" } | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [mediaGridMode, setMediaGridMode] = useState<MediaGridMode>("compact");
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
      setPreviewFileId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [section, folderId, active_workspace?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setFolderId(null);
    setFolderTrail([]);
    setSelected(new Set());
    setSelectedKinds(new Map());
    setPreviewFileId(null);
  }, [active_workspace?.id]);

  useEffect(() => {
    if (section !== "my-files" || !folderId) {
      setFolderTrail([]);
      return;
    }
    let cancelled = false;
    void fetchFolderBreadcrumbs(folderId)
      .then((data) => {
        if (!cancelled) setFolderTrail(data.breadcrumbs);
      })
      .catch(() => {
        if (!cancelled) setFolderTrail([]);
      });
    return () => {
      cancelled = true;
    };
  }, [section, folderId]);

  useEffect(() => {
    if (!uploadQueue) return;
    void uploadQueue.hydrate();
    return uploadQueue.subscribe(setUploadJobs);
  }, []);

  useEffect(() => {
    if (!uploadQueue) return;
    return uploadQueue.onComplete((file) => {
      void getStorageStats().then(setStats);
      const inCurrentFolder =
        section === "my-files" &&
        (file.folder_id ?? null) === folderId &&
        file.workspace_id === active_workspace?.id;
      if (!inCurrentFolder) return;
      setFiles((prev) => {
        if (prev.some((f) => f.id === file.id)) return prev;
        return [file, ...prev];
      });
      setAppearIds((prev) => new Set(prev).add(file.id));
      window.setTimeout(() => {
        setAppearIds((prev) => {
          const next = new Set(prev);
          next.delete(file.id);
          return next;
        });
      }, 1100);
    });
  }, [section, folderId, active_workspace?.id]);

  useEffect(() => {
    if (!uploadQueue) return;
    const queue = uploadQueue;
    return queue.onIdle(() => {
      window.setTimeout(() => queue.dismissFinished(), 1800);
    });
  }, []);

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

  const handleUpload = (fileList: FileList | null) => {
    if (!fileList?.length || !canEdit || !uploadQueue || !active_workspace?.id) return;
    void uploadQueue.enqueue(
      [...fileList],
      section === "my-files" ? folderId : null,
      active_workspace.id,
    );
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

  const restoreWorkspace = async () => {
    if (active_workspace?.id) await setActiveWorkspace(active_workspace.id);
  };

  const handleMoveDialogClose = () => {
    setMoveDialog(null);
    void restoreWorkspace();
  };

  const handleMoveConfirm = async (target: MoveTarget) => {
    const sourceWorkspaceId = active_workspace?.id;
    if (!sourceWorkspaceId) return;

    const fileIds = [...selected].filter((id) => selectedKinds.get(id) === "file");
    const folderIds = [...selected].filter((id) => selectedKinds.get(id) === "folder");
    try {
      await setActiveWorkspace(sourceWorkspaceId);
      if (target.workspaceId === sourceWorkspaceId) {
        const action = moveDialog?.mode ?? "move";
        if (fileIds.length) await bulkFiles(fileIds, action, target.folderId);
        if (folderIds.length) await bulkFolders(folderIds, action, target.folderId);
      } else {
        if (folderIds.length) {
          throw new Error("Копирование папок между пространствами пока недоступно");
        }
        for (const id of fileIds) {
          await transferFile(id, target.workspaceId, target.folderId, "copy");
        }
      }
      setSelected(new Set());
      setSelectedKinds(new Map());
      await refresh();
    } finally {
      await restoreWorkspace();
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
  const workspaceUploadJobs = useMemo(
    () =>
      active_workspace?.id
        ? uploadJobs.filter((j) => j.workspaceId === active_workspace.id)
        : uploadJobs,
    [uploadJobs, active_workspace?.id],
  );
  const isUploading = workspaceUploadJobs.some(
    (j) => j.status === "pending" || j.status === "uploading",
  );
  const previewFile = previewFileId ? files.find((f) => f.id === previewFileId) ?? null : null;
  const isGallerySection = section === "photos" || section === "videos";

  const myFilesTitle = useMemo(() => {
    if (!folderId) return "Мои файлы";
    return folderTrail[folderTrail.length - 1]?.name ?? "…";
  }, [folderId, folderTrail]);

  const pageCrumbs = useMemo((): Crumb[] | undefined => {
    if (section !== "my-files") return undefined;
    const trail: Crumb[] = [{ label: "Главная", href: "/dashboard" }];
    if (!folderId) {
      trail.push({ label: "Мои файлы" });
      return trail;
    }
    for (const crumb of folderTrail) {
      trail.push({
        label: crumb.name,
        onClick: crumb.id ? () => setFolderId(crumb.id) : () => setFolderId(null),
      });
    }
    return trail;
  }, [section, folderId, folderTrail]);

  const headerActions = (
    <>
      {isGallerySection && (
        <div className="flex rounded-lg border border-border p-0.5">
          <button
            type="button"
            title="Компактная сетка"
            onClick={() => setMediaGridMode("compact")}
            className={cn(
              "rounded-md p-2 transition-colors",
              mediaGridMode === "compact"
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-zinc-50",
            )}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Крупная сетка"
            onClick={() => setMediaGridMode("large")}
            className={cn(
              "rounded-md p-2 transition-colors",
              mediaGridMode === "large"
                ? "bg-accent/10 text-accent"
                : "text-muted hover:bg-zinc-50",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      )}
      {canEdit && section === "my-files" ? (
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
      ) : null}
    </>
  );

  return (
    <div className="flex min-h-0 gap-3 xl:gap-4">
      <aside className="w-44 shrink-0 space-y-4 xl:w-48">
        {canEdit && (
          <button
            type="button"
            disabled={section === "trash"}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Загрузка…" : "Загрузить"}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            handleUpload(e.target.files);
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
                setPreviewFileId(null);
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

      <div className="flex min-w-0 flex-1 gap-3 xl:gap-4">
        <div className="min-w-0 flex-1">
        <PageHeader
          title={
            section === "my-files"
              ? myFilesTitle
              : SECTIONS.find((s) => s.id === section)?.label ?? "Файлы"
          }
          crumbs={pageCrumbs}
          description={
            section === "trash"
              ? `Хранение в корзине: ${stats?.trash_retention_days ?? 0} дн.`
              : "Файлы текущего пространства"
          }
          actions={headerActions}
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

        {workspaceUploadJobs.length > 0 && (
          <UploadProgressPanel
            jobs={workspaceUploadJobs}
            onCancel={() => uploadQueue?.cancelAll()}
            onDismiss={() => uploadQueue?.dismissFinished()}
          />
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
          <div className="space-y-6">
            {section === "my-files" && folders.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Папки ({folders.length})
                </h3>
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                  {folders.map((fo) => (
                    <div
                      key={fo.id}
                      className="group flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelect(fo.id, "folder")}
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          selected.has(fo.id)
                            ? "border-accent bg-accent"
                            : "border-zinc-300 hover:border-accent/50",
                        )}
                        aria-label="Выбрать папку"
                      >
                        {selected.has(fo.id) && (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFolderId(fo.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-amber-50">
                          <Folder className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{fo.name}</p>
                          <p className="text-xs text-muted">
                            Папка · Файлов: {fo.files_count ?? 0} · {formatFileTime(fo.created_at)}
                          </p>
                        </div>
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          title="Переименовать"
                          onClick={() => void handleRename("folder", fo.id, fo.name)}
                          className="rounded p-1 text-muted opacity-0 transition-opacity hover:bg-zinc-100 group-hover:opacity-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
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
              <section key={label || "all"}>
                {section === "my-files" && groupFiles.length > 0 && (
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    Файлы ({groupFiles.length})
                  </h3>
                )}
                {label && (
                  <h3 className="mb-2 text-sm font-medium capitalize text-muted">{label}</h3>
                )}

                {isGallerySection ? (
                  <MediaGalleryGrid
                    files={groupFiles}
                    mode={mediaGridMode}
                    selected={selected}
                    onOpen={(f) => setPreviewFileId(f.id)}
                    onToggleSelect={(id) => toggleSelect(id, "file")}
                    appearIds={appearIds}
                  />
                ) : (
                <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                  {groupFiles.map((f) => (
                    <div
                      key={f.id}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-50",
                        appearIds.has(f.id) && "file-burst-appear",
                        previewFileId === f.id && section === "my-files" && "bg-accent/5",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSelect(f.id, "file")}
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          selected.has(f.id)
                            ? "border-accent bg-accent"
                            : "border-zinc-300 hover:border-accent/50",
                        )}
                        aria-label="Выбрать файл"
                      >
                        {selected.has(f.id) && (
                          <span className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => section === "my-files" && setPreviewFileId(f.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <FileCirclePreview
                          fileId={f.id}
                          name={f.name}
                          mimeType={f.mime_type}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{f.name}</p>
                          <p className="text-xs text-muted">{formatFileMeta(f)}</p>
                        </div>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {section !== "trash" && (
                          <button
                            type="button"
                            title="Скачать"
                            onClick={() =>
                              void downloadFile(f.id).then(({ url }) => window.open(url, "_blank"))
                            }
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
                              onClick={() =>
                                void permanentDeleteTrash(f.id, "file").then(refresh)
                              }
                              className="rounded p-1.5 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </section>
            ))}
          </div>
        )}
        </div>

        {previewFile && (section === "my-files" || isGallerySection) && (
          <FileDetailPanel
            file={previewFile}
            canEdit={canEdit}
            onClose={() => setPreviewFileId(null)}
            onDownload={() =>
              void downloadFile(previewFile.id).then(({ url }) => window.open(url, "_blank"))
            }
            onRename={() => void handleRename("file", previewFile.id, previewFile.name)}
            onCopy={() => void copyFile(previewFile.id, folderId).then(refresh)}
            onDelete={() =>
              void deleteFile(previewFile.id).then(() => {
                setPreviewFileId(null);
                void refresh();
              })
            }
          />
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
                  onClick={() => setMoveDialog({ mode: "move" })}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm hover:bg-zinc-100"
                >
                  <FolderInput className="h-4 w-4" /> Переместить
                </button>
                <button
                  type="button"
                  onClick={() => setMoveDialog({ mode: "copy" })}
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

      {moveDialog && active_workspace?.id && (
        <MoveTargetDialog
          open
          mode={moveDialog.mode}
          currentWorkspaceId={active_workspace.id}
          onClose={handleMoveDialogClose}
          onConfirm={handleMoveConfirm}
        />
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
