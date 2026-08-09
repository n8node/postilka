"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { ApiError } from "@/lib/api";
import { uploadGenerationMedia } from "@/lib/generation-api";
import {
  COMBINE_PHOTO_SLOTS,
  type GenerationHistoryItem,
  type GenerationModeId,
  type GenerationUpload,
} from "@/lib/generation-data";
import {
  GENERATION_HISTORY_DRAG_MIME,
  parseHistoryDragItem,
} from "@/lib/generation-history-drop";
import { cn } from "@/lib/utils";

type SourcePhotosPanelProps = {
  mode: GenerationModeId;
  sourcePhoto: GenerationUpload | null;
  combinePhotos: (GenerationUpload | null)[];
  historyDragActive: boolean;
  onSourcePhotoChange: (value: GenerationUpload | null) => void;
  onCombinePhotoChange: (index: number, value: GenerationUpload | null) => void;
  onHistoryDrop: (
    item: GenerationHistoryItem,
    slot: number | "single",
  ) => void | Promise<void>;
};

function SlotLoadingRing() {
  return (
    <span
      className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-accent"
      aria-hidden
    />
  );
}

function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-text text-[10px] font-semibold leading-none text-white">
        {step}
      </span>
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text">
        {title}
      </p>
    </div>
  );
}

function PhotoUploadSlot({
  label,
  photo,
  loading,
  shake,
  onPick,
  onClear,
  onHistoryDrop,
}: {
  label: string;
  photo: GenerationUpload | null;
  loading: boolean;
  shake: boolean;
  onPick: () => void;
  onClear: () => void;
  onHistoryDrop: (event: React.DragEvent) => void;
}) {
  const handleDragOver = (event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes(GENERATION_HISTORY_DRAG_MIME)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={onHistoryDrop}
      className={cn(shake && "generation-slot-shake", "rounded-lg")}
    >
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
          <ProtectedMediaImage
            url={photo.previewUrl}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              loading && "opacity-40",
            )}
            draggable={false}
          />
        ) : !loading ? (
          <>
            <Plus
              size={14}
              strokeWidth={1.75}
              className="text-zinc-400 transition-colors group-hover:text-accent"
            />
            <span className="text-[11px] text-zinc-400 transition-colors group-hover:text-blue-900">
              {label}
            </span>
          </>
        ) : null}
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <SlotLoadingRing />
            <span className="sr-only">Загрузка</span>
          </div>
        ) : null}
      </button>
    </div>
  );
}

export function SourcePhotosPanel({
  mode,
  sourcePhoto,
  combinePhotos,
  historyDragActive,
  onSourcePhotoChange,
  onCombinePhotoChange,
  onHistoryDrop,
}: SourcePhotosPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | "single" | null>(
    null,
  );
  const [historyLoadingSlot, setHistoryLoadingSlot] = useState<
    number | "single" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<number | "single" | null>(null);

  const isSlotLoading = (slot: number | "single") =>
    uploadingSlot === slot || historyLoadingSlot === slot;

  if (mode === "text-to-image") return null;

  const dropZoneClass = historyDragActive ? "generation-drop-target-active" : "";

  const handleSlotDrop =
    (slot: number | "single") => async (event: React.DragEvent) => {
      event.preventDefault();
      const item = parseHistoryDragItem(
        event.dataTransfer.getData(GENERATION_HISTORY_DRAG_MIME),
      );
      if (!item) return;
      setError(null);
      setHistoryLoadingSlot(slot);
      try {
        await onHistoryDrop(item, slot);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Не удалось добавить фото",
        );
      } finally {
        setHistoryLoadingSlot(null);
      }
    };

  const uploadFile = async (file: File, slot: number | "single") => {
    setUploadingSlot(slot);
    setError(null);
    try {
      const res = await uploadGenerationMedia(file);
      const item: GenerationUpload = {
        uploadId: res.id,
        previewUrl: URL.createObjectURL(file),
      };
      if (slot === "single") {
        onSourcePhotoChange(item);
      } else {
        onCombinePhotoChange(slot, item);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось загрузить фото",
      );
    } finally {
      setUploadingSlot(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const openPicker = (slot: number | "single") => {
    setPendingSlot(slot);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || pendingSlot === null) return;
    void uploadFile(file, pendingSlot);
    setPendingSlot(null);
  };

  if (mode === "image-to-image") {
    return (
      <Card hover className={dropZoneClass}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <StepHeader step={2} title="Исходное фото" />
        <PhotoUploadSlot
          label="Загрузить"
          photo={sourcePhoto}
          loading={isSlotLoading("single")}
          shake={historyDragActive}
          onPick={() => openPicker("single")}
          onClear={() => onSourcePhotoChange(null)}
          onHistoryDrop={(e) => void handleSlotDrop("single")(e)}
        />
        <p className="mt-3 text-[11px] text-zinc-400">
          JPEG, PNG или WebP · можно перетащить из истории
        </p>
        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
      </Card>
    );
  }

  return (
    <Card hover className={dropZoneClass}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <StepHeader step={2} title="Исходные фото (2–6)" />
      <div className="mx-auto grid w-fit grid-cols-3 gap-3">
        {combinePhotos.slice(0, COMBINE_PHOTO_SLOTS).map((photo, index) => (
          <PhotoUploadSlot
            key={index}
            label={`Фото ${index + 1}`}
            photo={photo}
            loading={isSlotLoading(index)}
            shake={historyDragActive && !photo && !isSlotLoading(index)}
            onPick={() => openPicker(index)}
            onClear={() => onCombinePhotoChange(index, null)}
            onHistoryDrop={(e) => void handleSlotDrop(index)(e)}
          />
        ))}
      </div>
      <p className="mt-3 text-[11px] text-zinc-400">
        Минимум 2 фото, максимум {COMBINE_PHOTO_SLOTS}. Перетащите из истории
        или загрузите с диска.
      </p>
      {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}
    </Card>
  );
}
