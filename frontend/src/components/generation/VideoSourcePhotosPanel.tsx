"use client";

import { useRef, useState } from "react";
import { FileAudio, FolderOpen, HardDriveUpload, Plus, Upload, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FileThumbnail } from "@/components/files/FileThumbnail";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { WorkspaceMediaPickerModal } from "@/components/generation/WorkspaceMediaPickerModal";
import { ApiError } from "@/lib/api";
import type { WorkspaceFile } from "@/lib/files-api";
import { isAudioMime, isVideoMime, probeMediaDuration } from "@/lib/file-media";
import {
  uploadVideoGenerationMedia,
  uploadVideoGenerationMediaFromWorkspace,
} from "@/lib/video-generation-api";
import {
  REFERENCE_AUDIO_MAX,
  REFERENCE_IMAGE_MAX,
  REFERENCE_VIDEO_MAX,
  REFERENCE_VIDEO_MAX_SECONDS,
  REFERENCE_VIDEO_MIN_SECONDS,
  type VideoGenerationModeId,
  type VideoGenerationUpload,
  type VideoMediaKind,
} from "@/lib/video-generation-data";
import { cn } from "@/lib/utils";

type VideoSourcePhotosPanelProps = {
  mode: VideoGenerationModeId;
  firstFrame: VideoGenerationUpload | null;
  lastFrame: VideoGenerationUpload | null;
  referenceImages: VideoGenerationUpload[];
  referenceVideos: VideoGenerationUpload[];
  referenceAudios: VideoGenerationUpload[];
  onFirstFrameChange: (value: VideoGenerationUpload | null) => void;
  onLastFrameChange: (value: VideoGenerationUpload | null) => void;
  onReferenceImagesChange: (items: VideoGenerationUpload[]) => void;
  onReferenceVideosChange: (items: VideoGenerationUpload[]) => void;
  onReferenceAudiosChange: (items: VideoGenerationUpload[]) => void;
};

type PendingUpload =
  | { kind: "first" }
  | { kind: "last" }
  | { kind: "ref-image" }
  | { kind: "ref-video" }
  | { kind: "ref-audio" };

function mediaKindFromFile(file: File): VideoMediaKind | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

function mediaKindFromWorkspace(file: WorkspaceFile): VideoMediaKind | null {
  if (file.mime_type.startsWith("image/")) return "image";
  if (isVideoMime(file.mime_type, file.name)) return "video";
  if (isAudioMime(file.mime_type, file.name)) return "audio";
  return null;
}

function referenceVideoDurationError(seconds: number | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return "Не удалось определить длительность видео. Выберите другой файл.";
  }
  if (seconds < REFERENCE_VIDEO_MIN_SECONDS || seconds > REFERENCE_VIDEO_MAX_SECONDS) {
    return `Референс-видео должно быть от ${REFERENCE_VIDEO_MIN_SECONDS} до ${REFERENCE_VIDEO_MAX_SECONDS} сек (сейчас ${seconds.toFixed(1)} сек).`;
  }
  return null;
}

function acceptForPending(pending: PendingUpload | null): string {
  switch (pending?.kind) {
    case "first":
    case "last":
    case "ref-image":
      return "image/jpeg,image/png,image/webp";
    case "ref-video":
      return "video/mp4,video/quicktime,.mp4,.mov";
    case "ref-audio":
      return "audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav";
    default:
      return "image/*,video/*,audio/*";
  }
}

function pendingMediaKind(pending: PendingUpload): VideoMediaKind {
  switch (pending.kind) {
    case "ref-video":
      return "video";
    case "ref-audio":
      return "audio";
    default:
      return "image";
  }
}

function SlotLoadingRing() {
  return (
    <span
      className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-accent"
      aria-hidden
    />
  );
}

function UploadPreview({
  upload,
}: {
  upload: VideoGenerationUpload;
}) {
  if (upload.workspaceFileId) {
    return (
      <FileThumbnail
        fileId={upload.workspaceFileId}
        name={upload.fileName ?? ""}
        mimeType={upload.mimeType ?? "application/octet-stream"}
        size="sm"
        className="absolute inset-0 h-full w-full rounded-lg border-0"
      />
    );
  }

  if (upload.mediaKind === "image") {
    return (
      <ProtectedMediaImage
        url={upload.previewUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
    );
  }

  if (upload.mediaKind === "video") {
    return (
      <>
        <video
          src={upload.previewUrl}
          muted
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/10" />
      </>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-zinc-50 px-1">
      <FileAudio size={20} className="text-zinc-400" />
      <span className="line-clamp-2 text-center text-[9px] leading-tight text-zinc-500">
        {upload.fileName || "Аудио"}
      </span>
    </div>
  );
}

function MediaUploadSquare({
  label,
  upload,
  loading,
  onClear,
  onPickComputer,
  onPickDisk,
}: {
  label: string;
  upload: VideoGenerationUpload | null;
  loading: boolean;
  onClear: () => void;
  onPickComputer: () => void;
  onPickDisk: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <button
          type="button"
          onClick={upload && !loading ? onClear : onPickComputer}
          disabled={loading}
          aria-busy={loading}
          className={cn(
            "group relative flex h-[84px] w-[84px] flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-dashed transition-colors",
            upload
              ? "border-border border-solid bg-bg hover:border-accent"
              : "border-zinc-300 bg-bg hover:border-accent hover:bg-blue-50",
            loading && "cursor-wait",
          )}
        >
          {upload ? (
            <UploadPreview upload={upload} />
          ) : !loading ? (
            <>
              <Plus
                size={14}
                strokeWidth={1.75}
                className="text-zinc-400 transition-colors group-hover:text-accent"
              />
              <span className="px-1 text-center text-[10px] leading-tight text-zinc-400 transition-colors group-hover:text-blue-900">
                {label}
              </span>
            </>
          ) : null}
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/70">
              <SlotLoadingRing />
            </div>
          ) : null}
        </button>
        {upload && !loading ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-zinc-400 shadow-sm hover:text-red-500"
            aria-label="Убрать"
          >
            <X size={12} />
          </button>
        ) : null}
      </div>
      {!upload ? (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            disabled={loading}
            onClick={onPickComputer}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted hover:bg-zinc-100 hover:text-text disabled:opacity-50"
          >
            <Upload size={10} />
            ПК
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onPickDisk}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted hover:bg-zinc-100 hover:text-text disabled:opacity-50"
          >
            <FolderOpen size={10} />
            Диск
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ReferenceMediaGrid({
  title,
  hint,
  items,
  max,
  loading,
  onAddComputer,
  onAddDisk,
  onRemove,
  onRemoveAll,
}: {
  title: string;
  hint: string;
  items: VideoGenerationUpload[];
  max: number;
  loading: boolean;
  onAddComputer: () => void;
  onAddDisk: () => void;
  onRemove: (index: number) => void;
  onRemoveAll: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium text-text">{title}</p>
          <p className="text-[10px] text-zinc-400">{hint}</p>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={onRemoveAll}
            className="text-[10px] font-medium text-red-500 hover:text-red-600"
          >
            Убрать все
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        {items.map((item, index) => (
          <div key={`${item.uploadId}-${index}`} className="relative">
            <div className="relative h-[84px] w-[84px] overflow-hidden rounded-lg border border-border bg-bg">
              <UploadPreview upload={item} />
            </div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-zinc-400 shadow-sm hover:text-red-500"
              aria-label="Удалить"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {items.length < max ? (
          <div className="flex h-[84px] w-[84px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-zinc-300 bg-bg">
            {loading ? (
              <SlotLoadingRing />
            ) : (
              <>
                <HardDriveUpload size={16} className="text-zinc-400" />
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={onAddComputer}
                    className="text-[10px] font-medium text-accent hover:underline"
                  >
                    С ПК
                  </button>
                  <button
                    type="button"
                    onClick={onAddDisk}
                    className="text-[10px] font-medium text-accent hover:underline"
                  >
                    С диска
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      {items.length > 0 ? (
        <p className="text-[10px] text-zinc-400">
          {items.length}/{max}
        </p>
      ) : null}
    </div>
  );
}

export function VideoSourcePhotosPanel({
  mode,
  firstFrame,
  lastFrame,
  referenceImages,
  referenceVideos,
  referenceAudios,
  onFirstFrameChange,
  onLastFrameChange,
  onReferenceImagesChange,
  onReferenceVideosChange,
  onReferenceAudiosChange,
}: VideoSourcePhotosPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [loadingKind, setLoadingKind] = useState<PendingUpload["kind"] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [diskPickerOpen, setDiskPickerOpen] = useState(false);
  const [diskPickerKind, setDiskPickerKind] = useState<VideoMediaKind>("image");

  if (mode === "text-to-video") return null;

  const isLoading = (kind: PendingUpload["kind"]) => loadingKind === kind;

  const applyUpload = (
    target: PendingUpload,
    item: VideoGenerationUpload,
  ) => {
    switch (target.kind) {
      case "first":
        onFirstFrameChange(item);
        break;
      case "last":
        onLastFrameChange(item);
        break;
      case "ref-image":
        onReferenceImagesChange([...referenceImages, item]);
        break;
      case "ref-video":
        onReferenceVideosChange([...referenceVideos, item]);
        break;
      case "ref-audio":
        onReferenceAudiosChange([...referenceAudios, item]);
        break;
    }
  };

  const validateFileKind = (file: File, target: PendingUpload): VideoMediaKind | null => {
    const mediaKind = mediaKindFromFile(file);
    if (!mediaKind) return null;
    if (
      (target.kind === "first" ||
        target.kind === "last" ||
        target.kind === "ref-image") &&
      mediaKind !== "image"
    ) {
      return null;
    }
    if (target.kind === "ref-video" && mediaKind !== "video") return null;
    if (target.kind === "ref-audio" && mediaKind !== "audio") return null;
    return mediaKind;
  };

  const handleComputerFile = async (file: File | undefined) => {
    if (!file || !pending) return;
    const mediaKind = validateFileKind(file, pending);
    if (!mediaKind) {
      setError("Выбран неподходящий тип файла");
      return;
    }

    if (pending.kind === "ref-video") {
      const duration = await probeMediaDuration(file, file.type || "video/mp4");
      const durationError = referenceVideoDurationError(duration);
      if (durationError) {
        setError(durationError);
        setPending(null);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    setLoadingKind(pending.kind);
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    try {
      const upload = await uploadVideoGenerationMedia(file);
      applyUpload(pending, {
        uploadId: upload.id,
        previewUrl,
        mediaKind,
        fileName: file.name,
        mimeType: upload.content_type || file.type,
      });
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      setError(
        err instanceof ApiError ? err.message : "Не удалось загрузить файл",
      );
    } finally {
      setLoadingKind(null);
      setPending(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleWorkspaceFile = async (file: WorkspaceFile) => {
    if (!pending) return;
    const mediaKind = mediaKindFromWorkspace(file);
    if (!mediaKind) {
      setError("Выбран неподходящий тип файла");
      return;
    }
    if (
      (pending.kind === "first" ||
        pending.kind === "last" ||
        pending.kind === "ref-image") &&
      mediaKind !== "image"
    ) {
      setError("Для кадров и референс-фото нужен файл изображения");
      return;
    }
    if (pending.kind === "ref-video" && mediaKind !== "video") {
      setError("Нужен видеофайл MP4 или MOV до 50 МБ");
      return;
    }
    if (pending.kind === "ref-video") {
      const duration = file.media_metadata?.duration_seconds;
      const durationError = referenceVideoDurationError(duration);
      if (durationError) {
        setError(durationError);
        return;
      }
    }
    if (pending.kind === "ref-audio" && mediaKind !== "audio") {
      setError("Нужен аудиофайл MP3 или WAV до 15 МБ");
      return;
    }

    setLoadingKind(pending.kind);
    setError(null);
    try {
      const upload = await uploadVideoGenerationMediaFromWorkspace(file.id);
      applyUpload(pending, {
        uploadId: upload.id,
        previewUrl: "",
        mediaKind,
        fileName: file.name,
        workspaceFileId: file.id,
        mimeType: file.mime_type,
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось взять файл с диска",
      );
    } finally {
      setLoadingKind(null);
      setPending(null);
    }
  };

  const openComputer = (next: PendingUpload) => {
    setPending(next);
    inputRef.current?.click();
  };

  const openDisk = (next: PendingUpload) => {
    setPending(next);
    setDiskPickerKind(pendingMediaKind(next));
    setDiskPickerOpen(true);
  };

  const removeReference = (
    items: VideoGenerationUpload[],
    setter: (next: VideoGenerationUpload[]) => void,
    index: number,
  ) => {
    if (index < 0) {
      setter([]);
      return;
    }
    setter(items.filter((_, i) => i !== index));
  };

  return (
    <Card hover>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
        2 · Исходники
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={acceptForPending(pending)}
        className="hidden"
        onChange={(e) => void handleComputerFile(e.target.files?.[0])}
      />

      {mode === "image-to-video" ? (
        <div className="mx-auto flex w-fit flex-wrap justify-center gap-4">
          <MediaUploadSquare
            label="Первый кадр"
            upload={firstFrame}
            loading={isLoading("first")}
            onClear={() => onFirstFrameChange(null)}
            onPickComputer={() => openComputer({ kind: "first" })}
            onPickDisk={() => openDisk({ kind: "first" })}
          />
          <MediaUploadSquare
            label="Последний кадр"
            upload={lastFrame}
            loading={isLoading("last")}
            onClear={() => onLastFrameChange(null)}
            onPickComputer={() => openComputer({ kind: "last" })}
            onPickDisk={() => openDisk({ kind: "last" })}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <ReferenceMediaGrid
            title="Референс-фото"
            hint="JPG, PNG, WEBP · до 30 МБ · до 9 шт."
            items={referenceImages}
            max={REFERENCE_IMAGE_MAX}
            loading={isLoading("ref-image")}
            onAddComputer={() => openComputer({ kind: "ref-image" })}
            onAddDisk={() => openDisk({ kind: "ref-image" })}
            onRemove={(index) =>
              removeReference(referenceImages, onReferenceImagesChange, index)
            }
            onRemoveAll={() => onReferenceImagesChange([])}
          />
          <ReferenceMediaGrid
            title="Референс-видео"
            hint="MP4, MOV · 2–15 сек · до 50 МБ · до 3 шт."
            items={referenceVideos}
            max={REFERENCE_VIDEO_MAX}
            loading={isLoading("ref-video")}
            onAddComputer={() => openComputer({ kind: "ref-video" })}
            onAddDisk={() => openDisk({ kind: "ref-video" })}
            onRemove={(index) =>
              removeReference(referenceVideos, onReferenceVideosChange, index)
            }
            onRemoveAll={() => onReferenceVideosChange([])}
          />
          <ReferenceMediaGrid
            title="Референс-аудио"
            hint="MP3, WAV · до 15 МБ · до 3 шт."
            items={referenceAudios}
            max={REFERENCE_AUDIO_MAX}
            loading={isLoading("ref-audio")}
            onAddComputer={() => openComputer({ kind: "ref-audio" })}
            onAddDisk={() => openDisk({ kind: "ref-audio" })}
            onRemove={(index) =>
              removeReference(referenceAudios, onReferenceAudiosChange, index)
            }
            onRemoveAll={() => onReferenceAudiosChange([])}
          />
        </div>
      )}

      {mode === "image-to-video" ? (
        <p className="mt-3 text-[10px] leading-snug text-zinc-400">
          Нужен хотя бы один кадр — первый, последний или оба. Загрузите с компьютера
          или выберите файл с диска проекта.
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-[12px] text-red-600">{error}</p>
      ) : null}

      <WorkspaceMediaPickerModal
        open={diskPickerOpen}
        mediaKind={diskPickerKind}
        onClose={() => {
          setDiskPickerOpen(false);
          setPending(null);
        }}
        onSelect={(file) => void handleWorkspaceFile(file)}
      />
    </Card>
  );
}
