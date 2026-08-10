"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { ApiError } from "@/lib/api";
import { uploadVideoGenerationMedia } from "@/lib/video-generation-api";
import {
  REFERENCE_PHOTO_SLOTS,
  type VideoGenerationHistoryItem,
  type VideoGenerationModeId,
  type VideoGenerationUpload,
} from "@/lib/video-generation-data";
import { cn } from "@/lib/utils";

type VideoSourcePhotosPanelProps = {
  mode: VideoGenerationModeId;
  sourcePhoto: VideoGenerationUpload | null;
  referencePhotos: (VideoGenerationUpload | null)[];
  onSourcePhotoChange: (value: VideoGenerationUpload | null) => void;
  onReferencePhotoChange: (index: number, value: VideoGenerationUpload | null) => void;
};

function PhotoUploadSlot({
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
    <button
      type="button"
      onClick={photo && !loading ? onClear : onPick}
      disabled={loading}
      aria-busy={loading}
      className={cn(
        "group relative flex h-[84px] w-[84px] flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border border-dashed transition-colors",
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
          <span className="px-1 text-center text-[10px] leading-tight text-zinc-400">
            {label}
          </span>
        </>
      )}
    </button>
  );
}

export function VideoSourcePhotosPanel({
  mode,
  sourcePhoto,
  referencePhotos,
  onSourcePhotoChange,
  onReferencePhotoChange,
}: VideoSourcePhotosPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loadingSlot, setLoadingSlot] = useState<number | "single" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const pendingSlot = useRef<number | "single" | null>(null);

  if (mode === "text-to-video") return null;

  const openPicker = (slot: number | "single") => {
    pendingSlot.current = slot;
    inputRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    const slot = pendingSlot.current;
    if (!file || slot === null) return;
    setLoadingSlot(slot);
    setError(null);
    try {
      const upload = await uploadVideoGenerationMedia(file);
      const item: VideoGenerationUpload = {
        uploadId: upload.id,
        previewUrl: upload.url || upload.thumb_url || "",
      };
      if (slot === "single") {
        onSourcePhotoChange(item);
      } else {
        onReferencePhotoChange(slot, item);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось загрузить фото",
      );
    } finally {
      setLoadingSlot(null);
      pendingSlot.current = null;
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card hover>
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
        2 · Исходники
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {mode === "image-to-video" ? (
        <PhotoUploadSlot
          label="Исходное фото"
          photo={sourcePhoto}
          loading={loadingSlot === "single"}
          onPick={() => openPicker("single")}
          onClear={() => onSourcePhotoChange(null)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          {referencePhotos.map((photo, index) => (
            <PhotoUploadSlot
              key={index}
              label={`Реф. ${index + 1}`}
              photo={photo}
              loading={loadingSlot === index}
              onPick={() => openPicker(index)}
              onClear={() => onReferencePhotoChange(index, null)}
            />
          ))}
        </div>
      )}

      {mode === "reference-to-video" ? (
        <p className="mt-2 text-[10px] leading-snug text-zinc-400">
          До {REFERENCE_PHOTO_SLOTS} референсов для стиля и объектов
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-[12px] text-red-600">{error}</p>
      ) : null}
    </Card>
  );
}

export type { VideoGenerationHistoryItem };
