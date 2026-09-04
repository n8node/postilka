"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Folder, Loader2, X } from "lucide-react";
import { FileThumbnail } from "@/components/files/FileThumbnail";
import {
  fetchFolderBreadcrumbs,
  listFiles,
  listFolders,
  type FilesSection,
  type FolderBreadcrumb,
  type WorkspaceFile,
} from "@/lib/files-api";
import { isAudioMime, isVideoMime } from "@/lib/file-media";
import {
  isKieNativeReferenceVideo,
  isReferenceVideoDurationValid,
  REFERENCE_VIDEO_MAX_BYTES,
  type VideoMediaKind,
} from "@/lib/video-generation-data";
import { cn } from "@/lib/utils";

type PickerTab = "recent" | "photos" | "videos" | "browse";

type WorkspaceMediaPickerModalProps = {
  open: boolean;
  mediaKind: VideoMediaKind;
  onClose: () => void;
  onSelect: (file: WorkspaceFile) => void;
  embedded?: boolean;
  onBack?: () => void;
  referenceVideoFilter?: boolean;
};

function matchesKind(file: WorkspaceFile, kind: VideoMediaKind): boolean {
  if (kind === "image") return file.mime_type.startsWith("image/");
  if (kind === "video") return isVideoMime(file.mime_type, file.name);
  return isAudioMime(file.mime_type, file.name);
}

function passesReferenceVideoFilter(file: WorkspaceFile): boolean {
  if (!isKieNativeReferenceVideo(file.mime_type, file.name)) return false;
  if (file.size > REFERENCE_VIDEO_MAX_BYTES) return false;
  const duration = file.media_metadata?.duration_seconds;
  if (duration == null || !Number.isFinite(duration)) {
    // Duration is validated on select (backend probes via ffprobe if metadata missing).
    return true;
  }
  return isReferenceVideoDurationValid(duration);
}

function tabsForKind(kind: VideoMediaKind): { id: PickerTab; label: string }[] {
  if (kind === "image") {
    return [
      { id: "recent", label: "Недавние" },
      { id: "photos", label: "Фото" },
      { id: "browse", label: "Мои файлы" },
    ];
  }
  if (kind === "video") {
    return [
      { id: "recent", label: "Недавние" },
      { id: "videos", label: "Видео" },
      { id: "browse", label: "Мои файлы" },
    ];
  }
  return [
    { id: "recent", label: "Недавние" },
    { id: "browse", label: "Мои файлы" },
  ];
}

function sectionForTab(tab: PickerTab): FilesSection {
  if (tab === "photos") return "photos";
  if (tab === "videos") return "videos";
  if (tab === "recent") return "recent";
  return "my-files";
}

export function WorkspaceMediaPickerModal({
  open,
  mediaKind,
  onClose,
  onSelect,
  embedded = false,
  onBack,
  referenceVideoFilter = false,
}: WorkspaceMediaPickerModalProps) {
  const tabs = useMemo(() => tabsForKind(mediaKind), [mediaKind]);
  const [tab, setTab] = useState<PickerTab>(tabs[0]?.id ?? "recent");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderBreadcrumb[]>([
    { id: null, name: "Мои файлы" },
  ]);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterFile = useCallback(
    (file: WorkspaceFile) => {
      if (!matchesKind(file, mediaKind)) return false;
      if (referenceVideoFilter && mediaKind === "video") {
        return passesReferenceVideoFilter(file);
      }
      return true;
    },
    [mediaKind, referenceVideoFilter],
  );

  const loadBrowse = useCallback(
    async (targetFolderId: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const [fileRes, folderRes] = await Promise.all([
          listFiles("my-files", targetFolderId),
          listFolders(targetFolderId),
        ]);
        setFiles(fileRes.files.filter(filterFile));
        setFolders(folderRes.folders.map((f) => ({ id: f.id, name: f.name })));
        if (targetFolderId) {
          const crumbs = await fetchFolderBreadcrumbs(targetFolderId);
          setBreadcrumbs([
            { id: null, name: "Мои файлы" },
            ...crumbs.breadcrumbs,
          ]);
        } else {
          setBreadcrumbs([{ id: null, name: "Мои файлы" }]);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Не удалось загрузить файлы",
        );
        setFiles([]);
        setFolders([]);
      } finally {
        setLoading(false);
      }
    },
    [filterFile],
  );

  const loadSection = useCallback(
    async (nextTab: PickerTab) => {
      if (nextTab === "browse") {
        await loadBrowse(folderId);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await listFiles(sectionForTab(nextTab));
        setFiles(res.files.filter(filterFile));
        setFolders([]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Не удалось загрузить файлы",
        );
        setFiles([]);
      } finally {
        setLoading(false);
      }
    },
    [folderId, loadBrowse, filterFile],
  );

  useEffect(() => {
    if (!open) return;
    setTab(tabs[0]?.id ?? "recent");
    setFolderId(null);
  }, [open, tabs]);

  useEffect(() => {
    if (!open) return;
    void loadSection(tab);
  }, [open, tab, loadSection]);

  useEffect(() => {
    if (!open || tab !== "browse") return;
    void loadBrowse(folderId);
  }, [open, tab, folderId, loadBrowse]);

  if (!open) return null;

  const title =
    mediaKind === "image"
      ? "Выберите фото с диска"
      : mediaKind === "video"
        ? "Выберите видео с диска"
        : "Выберите аудио с диска";

  const subtitle = referenceVideoFilter
    ? "MP4 или MOV с телефона · до 50 МБ · длительность проверится при выборе"
    : "Файлы workspace с превью";

  const panel = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border bg-surface px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="mt-0.5 rounded-lg p-1.5 text-muted hover:bg-zinc-100 hover:text-text"
                aria-label="Назад"
              >
                <ArrowLeft size={18} />
              </button>
            ) : null}
            <div className="min-w-0">
              <h2
                id="workspace-media-picker-title"
                className="text-[15px] font-semibold text-text"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>
            </div>
          </div>
          {!embedded ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted hover:bg-zinc-100 hover:text-text"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-b border-border bg-surface px-4 py-2">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                if (item.id !== "browse") setFolderId(null);
              }}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
                tab === item.id
                  ? "bg-blue-50 text-accent"
                  : "text-muted hover:bg-zinc-50 hover:text-text",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "browse" ? (
        <div className="shrink-0 border-b border-border bg-surface px-4 py-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1">
            {breadcrumbs.map((crumb, index) => (
              <span
                key={`${crumb.id ?? "root"}-${index}`}
                className="flex items-center gap-1"
              >
                {index > 0 ? (
                  <ChevronRight size={12} className="text-zinc-300" />
                ) : null}
                <button
                  type="button"
                  onClick={() => setFolderId(crumb.id)}
                  className={cn(
                    "rounded px-1 py-0.5 hover:bg-zinc-100",
                    index === breadcrumbs.length - 1
                      ? "font-medium text-text"
                      : "text-muted",
                  )}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : error ? (
          <p className="py-8 text-center text-[13px] text-red-600">{error}</p>
        ) : tab === "browse" && folders.length > 0 ? (
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => setFolderId(folder.id)}
                className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-left hover:border-accent"
              >
                <Folder size={16} className="shrink-0 text-accent" />
                <span className="truncate text-[12px] font-medium">
                  {folder.name}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {!loading && !error && files.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-muted">
            {referenceVideoFilter
              ? "Нет видео MP4 или MOV до 50 МБ"
              : "Подходящих файлов пока нет"}
          </p>
        ) : null}

        {!loading && files.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => {
                  onSelect(file);
                  if (!embedded) {
                    onClose();
                  }
                }}
                className="min-w-0 text-left"
              >
                <FileThumbnail
                  fileId={file.id}
                  name={file.name}
                  mimeType={file.mime_type}
                  durationSeconds={file.media_metadata?.duration_seconds}
                  size="sm"
                />
                <span className="mt-1 block truncate text-[10px] text-muted">
                  {file.name}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {panel}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-media-picker-title"
      onClick={onClose}
    >
      <div
        className="flex h-[min(88vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {panel}
      </div>
    </div>
  );
}
