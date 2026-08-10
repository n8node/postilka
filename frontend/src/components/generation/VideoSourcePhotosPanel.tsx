"use client";

import { useRef, useState } from "react";
import { FileAudio, FileVideo, ImageIcon, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { ApiError } from "@/lib/api";
import { uploadVideoGenerationMedia } from "@/lib/video-generation-api";
import {
  REFERENCE_AUDIO_MAX,
  REFERENCE_IMAGE_MAX,
  REFERENCE_VIDEO_MAX,
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

function acceptForPending(pending: PendingUpload | null): string {
  switch (pending?.kind) {
    case "first":
    case "last":
    case "ref-image":
      return "image/*";
    case "ref-video":
      return "video/mp4,video/quicktime,.mp4,.mov";
    case "ref-audio":
      return "audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav";
    default:
      return "image/*,video/*,audio/*";
  }
}

function FrameSlot({
  label,
  photo,
  loading,
  onPick,
  onClear,
}: {
  label: string;
  photo: VideoGenerationUpload | null;
  loading: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-medium text-zinc-500">{label}</p>
      <button
        type="button"
        onClick={photo && !loading ? onClear : onPick}
        disabled={loading}
        aria-busy={loading}
        className={cn(
          "group relative flex h-[96px] w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-dashed transition-colors",
          photo
            ? "border-border border-solid bg-bg hover:border-accent"
            : "border-zinc-300 bg-bg hover:border-accent hover:bg-blue-50",
          loading && "cursor-wait",
        )}
      >
        {photo ? (
          <>
            <ProtectedMediaImage
              url={photo.previewUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <span className="absolute inset-x-0 bottom-0 bg-black/45 px-1 py-0.5 text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              Убрать
            </span>
          </>
        ) : loading ? (
          <span
            className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-accent"
            aria-hidden
          />
        ) : (
          <>
            <Plus size={18} className="text-zinc-400" />
            <span className="px-2 text-center text-[10px] leading-tight text-zinc-400">
              Загрузить
            </span>
          </>
        )}
      </button>
    </div>
  );
}

function ReferenceListSection({
  title,
  hint,
  icon: Icon,
  items,
  max,
  loading,
  onAdd,
  onRemove,
}: {
  title: string;
  hint: string;
  icon: typeof ImageIcon;
  items: VideoGenerationUpload[];
  max: number;
  loading: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-text">{title}</p>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={() => onRemove(-1)}
            className="text-[10px] font-medium text-red-500 hover:text-red-600"
          >
            Убрать все
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${item.uploadId}-${index}`}
            className="flex items-center gap-2 rounded-lg border border-border bg-bg p-2"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100">
              {item.mediaKind === "image" ? (
                <ProtectedMediaImage
                  url={item.previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Icon size={16} className="text-zinc-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium text-text">
                {item.fileName || `Файл ${index + 1}`}
              </p>
              <p className="text-[10px] text-zinc-400">{hint}</p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-500"
              aria-label="Удалить"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {items.length < max ? (
        <button
          type="button"
          disabled={loading}
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2.5 text-[11px] font-medium text-zinc-500 transition-colors hover:border-accent hover:bg-blue-50 hover:text-accent disabled:opacity-60"
        >
          <Plus size={14} />
          Добавить ({items.length}/{max})
        </button>
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (mode === "text-to-video") return null;

  const openPicker = (next: PendingUpload) => {
    setPending(next);
    inputRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || !pending) return;
    const mediaKind = mediaKindFromFile(file);
    if (!mediaKind) {
      setError("Поддерживаются изображения, видео MP4/MOV и аудио MP3/WAV");
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
    if (pending.kind === "ref-audio" && mediaKind !== "audio") {
      setError("Нужен аудиофайл MP3 или WAV до 15 МБ");
      return;
    }

    setLoading(true);
    setError(null);
    const previewUrl = URL.createObjectURL(file);
    try {
      const upload = await uploadVideoGenerationMedia(file);
      const item: VideoGenerationUpload = {
        uploadId: upload.id,
        previewUrl,
        mediaKind,
        fileName: file.name,
      };
      switch (pending.kind) {
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
    } catch (err) {
      URL.revokeObjectURL(previewUrl);
      setError(
        err instanceof ApiError ? err.message : "Не удалось загрузить файл",
      );
    } finally {
      setLoading(false);
      setPending(null);
      if (inputRef.current) inputRef.current.value = "";
    }
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
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {mode === "image-to-video" ? (
        <div className="grid grid-cols-2 gap-3">
          <FrameSlot
            label="Первый кадр"
            photo={firstFrame}
            loading={loading && pending?.kind === "first"}
            onPick={() => openPicker({ kind: "first" })}
            onClear={() => onFirstFrameChange(null)}
          />
          <FrameSlot
            label="Последний кадр"
            photo={lastFrame}
            loading={loading && pending?.kind === "last"}
            onPick={() => openPicker({ kind: "last" })}
            onClear={() => onLastFrameChange(null)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <ReferenceListSection
            title="Референс-фото"
            hint="JPG, PNG, WEBP · до 30 МБ"
            icon={ImageIcon}
            items={referenceImages}
            max={REFERENCE_IMAGE_MAX}
            loading={loading && pending?.kind === "ref-image"}
            onAdd={() => openPicker({ kind: "ref-image" })}
            onRemove={(index) =>
              removeReference(referenceImages, onReferenceImagesChange, index)
            }
          />
          <ReferenceListSection
            title="Референс-видео"
            hint="MP4, MOV · до 50 МБ"
            icon={FileVideo}
            items={referenceVideos}
            max={REFERENCE_VIDEO_MAX}
            loading={loading && pending?.kind === "ref-video"}
            onAdd={() => openPicker({ kind: "ref-video" })}
            onRemove={(index) =>
              removeReference(referenceVideos, onReferenceVideosChange, index)
            }
          />
          <ReferenceListSection
            title="Референс-аудио"
            hint="MP3, WAV · до 15 МБ · только с фото или видео"
            icon={FileAudio}
            items={referenceAudios}
            max={REFERENCE_AUDIO_MAX}
            loading={loading && pending?.kind === "ref-audio"}
            onAdd={() => openPicker({ kind: "ref-audio" })}
            onRemove={(index) =>
              removeReference(referenceAudios, onReferenceAudiosChange, index)
            }
          />
        </div>
      )}

      {mode === "image-to-video" ? (
        <p className="mt-2 text-[10px] leading-snug text-zinc-400">
          Нужен хотя бы один кадр — первый, последний или оба
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-[12px] text-red-600">{error}</p>
      ) : null}
    </Card>
  );
}
