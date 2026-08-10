"use client";

import { useRef, useState } from "react";
import { FileAudio, HardDriveUpload, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { FileThumbnail } from "@/components/files/FileThumbnail";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { MediaSourcePickerModal } from "@/components/generation/MediaSourcePickerModal";
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
  filledReferenceCount,
  type VideoGenerationModeId,
  type VideoGenerationUpload,
  type VideoGenerationHistoryItem,
  type VideoMediaKind,
} from "@/lib/video-generation-data";
import {
  VIDEO_HISTORY_DRAG_MIME,
  getCachedVideoHistorySize,
  getActiveVideoHistoryDragItem,
  parseVideoHistoryDragItem,
  prefetchVideoHistorySize,
  referenceVideoDurationError,
  referenceVideoSizeError,
  validateReferenceVideoHistoryDrop,
  videoHistoryDropErrorMessage,
} from "@/lib/video-history-drop";
import type { GenerationHistoryItem } from "@/lib/generation-data";
import {
  GENERATION_HISTORY_DRAG_MIME,
  parseHistoryDragItem,
} from "@/lib/generation-history-drop";
import { cn } from "@/lib/utils";

type VideoSourcePhotosPanelProps = {
  mode: VideoGenerationModeId;
  firstFrame: VideoGenerationUpload | null;
  lastFrame: VideoGenerationUpload | null;
  referenceImages: (VideoGenerationUpload | null)[];
  referenceVideos: (VideoGenerationUpload | null)[];
  referenceAudios: VideoGenerationUpload[];
  historyDragActive: boolean;
  onFirstFrameChange: (value: VideoGenerationUpload | null) => void;
  onLastFrameChange: (value: VideoGenerationUpload | null) => void;
  onReferenceImagesChange: (items: (VideoGenerationUpload | null)[]) => void;
  onReferenceVideosChange: (items: (VideoGenerationUpload | null)[]) => void;
  onReferenceAudiosChange: (items: VideoGenerationUpload[]) => void;
  onHistoryVideoDrop: (
    item: VideoGenerationHistoryItem,
    slot: number,
  ) => void | Promise<void>;
  onHistoryPhotoDrop: (
    item: GenerationHistoryItem,
    target:
      | { kind: "first" }
      | { kind: "last" }
      | { kind: "ref-image"; slot: number },
  ) => void | Promise<void>;
};

type PendingUpload =
  | { kind: "first" }
  | { kind: "last" }
  | { kind: "ref-image"; slot: number }
  | { kind: "ref-video"; slot: number }
  | { kind: "ref-audio" };

type SourceModalTarget =
  | { kind: "first" | "last" }
  | { kind: "ref-image"; slot: number }
  | { kind: "ref-video"; slot: number };

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

function SlotLoadingRing() {
  return (
    <span
      className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-accent"
      aria-hidden
    />
  );
}

function UploadPreview({ upload }: { upload: VideoGenerationUpload }) {
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

function ReferenceFixedSlot({
  label,
  upload,
  loading,
  invalidDrop,
  invalidMessage,
  shake,
  acceptVideoHistoryDrag,
  acceptPhotoHistoryDrag,
  onPick,
  onClear,
  onVideoHistoryDrop,
  onPhotoHistoryDrop,
  onVideoDragOver,
  onVideoDragLeave,
}: {
  label: string;
  upload: VideoGenerationUpload | null;
  loading: boolean;
  invalidDrop?: boolean;
  invalidMessage?: string | null;
  shake?: boolean;
  acceptVideoHistoryDrag?: boolean;
  acceptPhotoHistoryDrag?: boolean;
  onPick: () => void;
  onClear: () => void;
  onVideoHistoryDrop?: (event: React.DragEvent) => void;
  onPhotoHistoryDrop?: (event: React.DragEvent) => void;
  onVideoDragOver?: (event: React.DragEvent) => void;
  onVideoDragLeave?: (event: React.DragEvent) => void;
}) {
  const handleDragOver = (event: React.DragEvent) => {
    const types = event.dataTransfer.types;
    if (acceptVideoHistoryDrag && types.includes(VIDEO_HISTORY_DRAG_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = invalidDrop ? "none" : "copy";
      onVideoDragOver?.(event);
      return;
    }
    if (acceptPhotoHistoryDrag && types.includes(GENERATION_HISTORY_DRAG_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    if (acceptVideoHistoryDrag && event.dataTransfer.types.includes(VIDEO_HISTORY_DRAG_MIME)) {
      onVideoHistoryDrop?.(event);
      return;
    }
    if (acceptPhotoHistoryDrag && event.dataTransfer.types.includes(GENERATION_HISTORY_DRAG_MIME)) {
      onPhotoHistoryDrop?.(event);
    }
  };

  return (
    <div
      className={cn(shake && "generation-slot-shake", "rounded-lg")}
      onDragOver={handleDragOver}
      onDragLeave={onVideoDragLeave}
      onDrop={handleDrop}
    >
      <div className="relative">
        <button
          type="button"
          onClick={upload && !loading ? onClear : onPick}
          disabled={loading}
          aria-busy={loading}
          className={cn(
            "group relative flex h-[84px] w-[84px] flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-dashed transition-colors",
            invalidDrop
              ? "border-red-400 bg-red-50"
              : upload
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
                className={cn(
                  "transition-colors",
                  invalidDrop
                    ? "text-red-400"
                    : "text-zinc-400 group-hover:text-accent",
                )}
              />
              <span
                className={cn(
                  "px-1 text-center text-[10px] leading-tight transition-colors",
                  invalidDrop
                    ? "text-red-600"
                    : "text-zinc-400 group-hover:text-blue-900",
                )}
              >
                {invalidDrop && invalidMessage ? invalidMessage : label}
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
    </div>
  );
}

function ReferenceAudioGrid({
  items,
  loading,
  onAddComputer,
  onAddDisk,
  onRemove,
  onRemoveAll,
}: {
  items: VideoGenerationUpload[];
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
          <p className="text-[11px] font-medium text-text">Референс-аудио</p>
          <p className="text-[10px] text-zinc-400">
            MP3, WAV · до 15 МБ · до 3 шт.
          </p>
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

        {items.length < REFERENCE_AUDIO_MAX ? (
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
          {items.length}/{REFERENCE_AUDIO_MAX}
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
  historyDragActive,
  onFirstFrameChange,
  onLastFrameChange,
  onReferenceImagesChange,
  onReferenceVideosChange,
  onReferenceAudiosChange,
  onHistoryVideoDrop,
  onHistoryPhotoDrop,
}: VideoSourcePhotosPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceModal, setSourceModal] = useState<SourceModalTarget | null>(
    null,
  );
  const [audioDiskOpen, setAudioDiskOpen] = useState(false);
  const [videoDragSlot, setVideoDragSlot] = useState<number | null>(null);
  const [videoDragInvalid, setVideoDragInvalid] = useState<{
    slot: number;
    message: string;
  } | null>(null);

  if (mode === "text-to-video") return null;

  const dropZoneClass = historyDragActive ? "generation-drop-target-active" : "";

  const loadingKeyFor = (target: PendingUpload): string => {
    if ("slot" in target && target.slot !== undefined) {
      return `${target.kind}:${target.slot}`;
    }
    return target.kind;
  };

  const isLoading = (key: string) => loadingKey === key;

  const setSlotUpload = (
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
        onReferenceImagesChange(
          referenceImages.map((value, index) =>
            index === target.slot ? item : value,
          ),
        );
        break;
      case "ref-video":
        onReferenceVideosChange(
          referenceVideos.map((value, index) =>
            index === target.slot ? item : value,
          ),
        );
        break;
      case "ref-audio":
        onReferenceAudiosChange([...referenceAudios, item]);
        break;
    }
  };

  const validateFileKind = (
    file: File,
    target: PendingUpload,
  ): VideoMediaKind | null => {
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
      const sizeError = referenceVideoSizeError(file.size);
      if (sizeError) {
        setError(sizeError);
        setPending(null);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      const duration = await probeMediaDuration(file, file.type || "video/mp4");
      const durationError = referenceVideoDurationError(duration);
      if (durationError) {
        setError(durationError);
        setPending(null);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }

    const key = loadingKeyFor(pending);
    setLoadingKey(key);
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    try {
      const upload = await uploadVideoGenerationMedia(file);
      setSlotUpload(pending, {
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
      setLoadingKey(null);
      setPending(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleWorkspaceFile = async (
    file: WorkspaceFile,
    targetOverride?: PendingUpload,
  ) => {
    const target = targetOverride ?? pending;
    if (!target) return;
    const mediaKind = mediaKindFromWorkspace(file);
    if (!mediaKind) {
      setError("Выбран неподходящий тип файла");
      return;
    }
    if (
      (target.kind === "first" ||
        target.kind === "last" ||
        target.kind === "ref-image") &&
      mediaKind !== "image"
    ) {
      setError("Для кадров и референс-фото нужен файл изображения");
      return;
    }
    if (target.kind === "ref-video" && mediaKind !== "video") {
      setError("Нужен видеофайл MP4 или MOV до 50 МБ");
      return;
    }
    if (target.kind === "ref-video") {
      const durationError = referenceVideoDurationError(
        file.media_metadata?.duration_seconds,
      );
      if (durationError) {
        setError(durationError);
        return;
      }
      const sizeError = referenceVideoSizeError(file.size);
      if (sizeError) {
        setError(sizeError);
        return;
      }
    }
    if (target.kind === "ref-audio" && mediaKind !== "audio") {
      setError("Нужен аудиофайл MP3 или WAV до 15 МБ");
      return;
    }

    const key = loadingKeyFor(target);
    setLoadingKey(key);
    setError(null);
    try {
      const upload = await uploadVideoGenerationMediaFromWorkspace(file.id);
      setSlotUpload(target, {
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
      setLoadingKey(null);
      setPending(null);
    }
  };

  const openComputer = (next: PendingUpload) => {
    setPending(next);
    inputRef.current?.click();
  };

  const openSourceModal = (target: SourceModalTarget) => {
    setSourceModal(target);
  };

  const sourceModalTitle = (target: SourceModalTarget): string => {
    if (target.kind === "first") return "Первый кадр";
    if (target.kind === "last") return "Последний кадр";
    if (target.kind === "ref-image") return `Фото ${target.slot + 1}`;
    if (target.kind === "ref-video") return `Видео ${target.slot + 1}`;
    return "Выберите источник";
  };

  const sourceModalSubtitle = (target: SourceModalTarget): string | undefined => {
    if (target.kind === "ref-video") {
      return "MP4, MOV · до 50 МБ · длительность проверится при выборе";
    }
    if (target.kind === "ref-image" || target.kind === "first" || target.kind === "last") {
      return "JPG, PNG, WEBP";
    }
    return undefined;
  };

  const handleSourceModalComputer = () => {
    if (!sourceModal) return;
    if (sourceModal.kind === "first") {
      openComputer({ kind: "first" });
    } else if (sourceModal.kind === "last") {
      openComputer({ kind: "last" });
    } else if (sourceModal.kind === "ref-image") {
      openComputer({ kind: "ref-image", slot: sourceModal.slot });
    } else if (sourceModal.kind === "ref-video") {
      openComputer({ kind: "ref-video", slot: sourceModal.slot });
    }
    setSourceModal(null);
  };

  const handleSourceModalDisk = (file: WorkspaceFile) => {
    if (!sourceModal) return;
    let target: PendingUpload;
    if (sourceModal.kind === "first") {
      target = { kind: "first" };
    } else if (sourceModal.kind === "last") {
      target = { kind: "last" };
    } else if (sourceModal.kind === "ref-image") {
      target = { kind: "ref-image", slot: sourceModal.slot };
    } else if (sourceModal.kind === "ref-video") {
      target = { kind: "ref-video", slot: sourceModal.slot };
    } else {
      return;
    }
    void handleWorkspaceFile(file, target);
    setSourceModal(null);
  };

  const handleVideoDragOver = (slot: number) => {
    const parsed = getActiveVideoHistoryDragItem();
    if (!parsed) return;

    void prefetchVideoHistorySize(parsed);
    const size = getCachedVideoHistorySize(parsed.id);
    const validation = validateReferenceVideoHistoryDrop(parsed, size);
    setVideoDragSlot(slot);
    if (!validation.valid && validation.message) {
      setVideoDragInvalid({ slot, message: validation.message });
    } else {
      setVideoDragInvalid(null);
    }
  };

  const handleVideoDragLeave = (slot: number) => {
    if (videoDragSlot === slot) {
      setVideoDragSlot(null);
      setVideoDragInvalid(null);
    }
  };

  const canDragPhotos =
    mode === "reference-to-video" || mode === "image-to-video";

  const handlePhotoHistoryDrop =
    (
      target:
        | { kind: "first" }
        | { kind: "last" }
        | { kind: "ref-image"; slot: number },
    ) =>
    async (event: React.DragEvent) => {
      event.preventDefault();
      const item = parseHistoryDragItem(
        event.dataTransfer.getData(GENERATION_HISTORY_DRAG_MIME),
      );
      if (!item) return;

      const key =
        target.kind === "ref-image"
          ? `ref-image:${target.slot}`
          : target.kind;
      setLoadingKey(key);
      setError(null);
      try {
        await onHistoryPhotoDrop(item, target);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Не удалось использовать фото из истории",
        );
      } finally {
        setLoadingKey(null);
      }
    };

  const handleVideoHistoryDrop =
    (slot: number) => async (event: React.DragEvent) => {
      event.preventDefault();
      const item = parseVideoHistoryDragItem(
        event.dataTransfer.getData(VIDEO_HISTORY_DRAG_MIME),
      );
      if (!item) return;

      const size = getCachedVideoHistorySize(item.id);
      const validation = validateReferenceVideoHistoryDrop(item, size);
      setVideoDragSlot(null);
      setVideoDragInvalid(null);

      if (!validation.valid) {
        setError(validation.message ?? "Видео не подходит как референс");
        return;
      }

      setLoadingKey(`ref-video:${slot}`);
      setError(null);
      try {
        await onHistoryVideoDrop(item, slot);
      } catch (err) {
        setError(videoHistoryDropErrorMessage(err));
      } finally {
        setLoadingKey(null);
      }
    };

  const imageCount = filledReferenceCount(referenceImages);
  const videoCount = filledReferenceCount(referenceVideos);

  return (
    <Card hover className={dropZoneClass}>
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
          <ReferenceFixedSlot
            label="Первый кадр"
            upload={firstFrame}
            loading={isLoading("first")}
            shake={historyDragActive && !firstFrame && !isLoading("first")}
            acceptPhotoHistoryDrag={canDragPhotos}
            onPick={() => openSourceModal({ kind: "first" })}
            onClear={() => onFirstFrameChange(null)}
            onPhotoHistoryDrop={(e) =>
              void handlePhotoHistoryDrop({ kind: "first" })(e)
            }
          />
          <ReferenceFixedSlot
            label="Последний кадр"
            upload={lastFrame}
            loading={isLoading("last")}
            shake={historyDragActive && !lastFrame && !isLoading("last")}
            acceptPhotoHistoryDrag={canDragPhotos}
            onPick={() => openSourceModal({ kind: "last" })}
            onClear={() => onLastFrameChange(null)}
            onPhotoHistoryDrop={(e) =>
              void handlePhotoHistoryDrop({ kind: "last" })(e)
            }
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium text-text">
                  Референс-фото
                </p>
                <p className="text-[10px] text-zinc-400">
                  JPG, PNG, WEBP · до 30 МБ · до {REFERENCE_IMAGE_MAX} шт.
                </p>
              </div>
              {imageCount > 0 ? (
                <button
                  type="button"
                  onClick={() => onReferenceImagesChange(referenceImages.map(() => null))}
                  className="text-[10px] font-medium text-red-500 hover:text-red-600"
                >
                  Убрать все
                </button>
              ) : null}
            </div>
            <div className="mx-auto grid w-fit grid-cols-3 gap-3">
              {referenceImages.map((upload, index) => (
                <ReferenceFixedSlot
                  key={index}
                  label={`Фото ${index + 1}`}
                  upload={upload}
                  loading={isLoading(`ref-image:${index}`)}
                  shake={
                    historyDragActive &&
                    !upload &&
                    !isLoading(`ref-image:${index}`)
                  }
                  acceptPhotoHistoryDrag={mode === "reference-to-video"}
                  onPick={() =>
                    openSourceModal({ kind: "ref-image", slot: index })
                  }
                  onClear={() =>
                    onReferenceImagesChange(
                      referenceImages.map((value, i) =>
                        i === index ? null : value,
                      ),
                    )
                  }
                  onPhotoHistoryDrop={(e) =>
                    void handlePhotoHistoryDrop({ kind: "ref-image", slot: index })(e)
                  }
                />
              ))}
            </div>
            {imageCount > 0 ? (
              <p className="text-[10px] text-zinc-400">
                {imageCount}/{REFERENCE_IMAGE_MAX}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium text-text">
                  Референс-видео
                </p>
                <p className="text-[10px] text-zinc-400">
                  MP4, MOV · 2–15 сек · до 50 МБ · до {REFERENCE_VIDEO_MAX} шт.
                  · можно перетащить из истории
                </p>
              </div>
              {videoCount > 0 ? (
                <button
                  type="button"
                  onClick={() => onReferenceVideosChange(referenceVideos.map(() => null))}
                  className="text-[10px] font-medium text-red-500 hover:text-red-600"
                >
                  Убрать все
                </button>
              ) : null}
            </div>
            <div className="mx-auto flex w-fit flex-wrap justify-center gap-3">
              {referenceVideos.map((upload, index) => (
                <ReferenceFixedSlot
                  key={index}
                  label={`Видео ${index + 1}`}
                  upload={upload}
                  loading={isLoading(`ref-video:${index}`)}
                  invalidDrop={
                    videoDragSlot === index &&
                    videoDragInvalid?.slot === index
                  }
                  invalidMessage={videoDragInvalid?.message}
                  shake={
                    historyDragActive &&
                    !upload &&
                    !isLoading(`ref-video:${index}`)
                  }
                  acceptVideoHistoryDrag
                  onPick={() =>
                    openSourceModal({ kind: "ref-video", slot: index })
                  }
                  onClear={() =>
                    onReferenceVideosChange(
                      referenceVideos.map((value, i) =>
                        i === index ? null : value,
                      ),
                    )
                  }
                  onVideoDragOver={() => handleVideoDragOver(index)}
                  onVideoDragLeave={() => handleVideoDragLeave(index)}
                  onVideoHistoryDrop={(e) => void handleVideoHistoryDrop(index)(e)}
                />
              ))}
            </div>
            {videoCount > 0 ? (
              <p className="text-[10px] text-zinc-400">
                {videoCount}/{REFERENCE_VIDEO_MAX}
              </p>
            ) : null}
          </div>

          <ReferenceAudioGrid
            items={referenceAudios}
            loading={isLoading("ref-audio")}
            onAddComputer={() => openComputer({ kind: "ref-audio" })}
            onAddDisk={() => {
              setPending({ kind: "ref-audio" });
              setAudioDiskOpen(true);
            }}
            onRemove={(index) =>
              onReferenceAudiosChange(
                referenceAudios.filter((_, i) => i !== index),
              )
            }
            onRemoveAll={() => onReferenceAudiosChange([])}
          />
        </div>
      )}

      {mode === "image-to-video" ? (
        <p className="mt-3 text-[10px] leading-snug text-zinc-400">
          Нужен хотя бы один кадр — первый, последний или оба.
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-[12px] text-red-600">{error}</p>
      ) : null}

      <MediaSourcePickerModal
        open={sourceModal !== null}
        title={
          sourceModal ? sourceModalTitle(sourceModal) : "Выберите источник"
        }
        subtitle={sourceModal ? sourceModalSubtitle(sourceModal) : undefined}
        mediaKind={sourceModal?.kind === "ref-video" ? "video" : "image"}
        referenceVideoFilter={sourceModal?.kind === "ref-video"}
        onClose={() => setSourceModal(null)}
        onPickComputer={handleSourceModalComputer}
        onPickDiskFile={handleSourceModalDisk}
      />

      <WorkspaceMediaPickerModal
        open={audioDiskOpen}
        mediaKind="audio"
        onClose={() => {
          setAudioDiskOpen(false);
          setPending(null);
        }}
        onSelect={(file) => void handleWorkspaceFile(file)}
      />
    </Card>
  );
}
