"use client";

import { useEffect, useState } from "react";
import {
  Copy,
  Download,
  FileAudio,
  FileText,
  FileVideo,
  ImageIcon,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import { type WorkspaceFile } from "@/lib/files-api";
import { getCachedFileMediaUrl } from "@/lib/file-media-cache";
import {
  formatMediaDuration,
  getFileDuration,
  isAudioMime,
  isVideoMime,
} from "@/lib/file-media";

type Props = {
  file: WorkspaceFile;
  canEdit: boolean;
  onClose: () => void;
  onDownload: () => void;
  onRename: () => void;
  onCopy: () => void;
  onDelete: () => void;
};

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FileDetailPanel({
  file,
  canEdit,
  onClose,
  onDownload,
  onRename,
  onCopy,
  onDelete,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isImage = file.mime_type.startsWith("image/");
  const isVideo = isVideoMime(file.mime_type, file.name);
  const isAudio = isAudioMime(file.mime_type, file.name);
  const duration = getFileDuration(file);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    void getCachedFileMediaUrl(file.id, "preview")
      .then((downloadUrl) => {
        if (cancelled) return;
        revoked = downloadUrl;
        setUrl(downloadUrl);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (revoked?.startsWith("blob:")) URL.revokeObjectURL(revoked);
      setUrl(null);
    };
  }, [file.id]);

  const FallbackIcon = isVideo ? FileVideo : isAudio ? FileAudio : isImage ? ImageIcon : FileText;

  return (
    <aside className="sticky top-4 hidden h-fit max-h-[calc(100vh-5rem)] w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm xl:flex xl:w-80">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Сведения о файле</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted hover:bg-zinc-100"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto px-4 py-4">
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-border bg-zinc-50",
            isAudio ? "p-6" : "aspect-[4/3]",
          )}
        >
          {isImage && url && !failed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-contain"
            />
          ) : isVideo && url && !failed ? (
            <video src={url} controls className="h-full w-full bg-black object-contain" />
          ) : isAudio && url && !failed ? (
            <div className="flex flex-col items-center gap-4">
              <FileAudio className="h-12 w-12 text-accent" />
              <audio src={url} controls className="w-full" />
            </div>
          ) : (
            <div className="flex h-full min-h-[10rem] flex-col items-center justify-center gap-2 text-muted">
              <FallbackIcon className="h-12 w-12" />
              {failed && <p className="text-xs">Превью недоступно</p>}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Имя</p>
            <p className="mt-1 break-all text-sm font-medium">{file.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted">Размер</p>
              <p className="font-medium">{formatBytes(file.size)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Тип</p>
              <p className="font-medium">{file.mime_type || "—"}</p>
            </div>
            {duration != null && (
              <div>
                <p className="text-xs text-muted">Длительность</p>
                <p className="font-medium">{formatMediaDuration(duration)}</p>
              </div>
            )}
            <div className={duration != null ? "" : "col-span-2"}>
              <p className="text-xs text-muted">Загружен</p>
              <p className="font-medium">{formatFullDate(file.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            <Download className="h-4 w-4" />
            Скачать
          </button>
          {canEdit && (
            <>
              <button
                type="button"
                onClick={onRename}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                <Pencil className="h-4 w-4" />
                Переименовать
              </button>
              <button
                type="button"
                onClick={onCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-zinc-50"
              >
                <Copy className="h-4 w-4" />
                Копировать
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
