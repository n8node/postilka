"use client";

import { useRef, useState } from "react";
import { Folder, Upload, Variable, X } from "lucide-react";
import { AspectRatioPicker } from "@/components/generation/AspectRatioPicker";
import { uploadFile } from "@/lib/files-api";
import { getCachedFileMediaUrl } from "@/lib/file-media-cache";
import {
  COMBINE_PHOTO_SLOTS,
  aspectRatios,
  generationModes,
  promptPlaceholders,
  type AspectRatioId,
  type GenerationModeId,
} from "@/lib/generation-data";
import {
  REFERENCE_AUDIO_MAX,
  REFERENCE_IMAGE_MAX,
  REFERENCE_VIDEO_MAX,
  VIDEO_DURATION_MAX,
  VIDEO_DURATION_MIN,
  videoAspectRatios,
  videoGenerationModes,
  videoPromptPlaceholders,
  type VideoAspectRatioId,
  type VideoGenerationModeId,
} from "@/lib/video-generation-data";
import { FieldNeedLabel, SocialRequirementsBanner } from "./SocialMediaFields";
import { WorkflowMediaPreview } from "./WorkflowMediaPreview";
import { varDropAttrs } from "./variableDrag";
import type { SocialFieldNeed } from "./nodeTypes";

const SLOT_ARRAYS: Record<string, { ids: string; durations?: string; len: number }> = {
  combineImages: { ids: "combineImageFileIds", len: COMBINE_PHOTO_SLOTS },
  referenceImages: { ids: "referenceImageFileIds", len: REFERENCE_IMAGE_MAX },
  referenceVideos: {
    ids: "referenceVideoFileIds",
    durations: "referenceVideoDurations",
    len: REFERENCE_VIDEO_MAX,
  },
  referenceAudios: { ids: "referenceAudioFileIds", len: REFERENCE_AUDIO_MAX },
};

const SCALAR_FILE: Record<string, string> = {
  sourceImage: "sourceImageFileId",
  firstFrame: "firstFrameFileId",
  lastFrame: "lastFrameFileId",
  referenceImage: "referenceImageFileId",
};

export function readSlotArray(
  data: Record<string, any>,
  key: string,
  len: number
): string[] {
  const raw = data[key];
  const arr = Array.isArray(raw) ? raw.map((item) => String(item ?? "")) : [];
  while (arr.length < len) arr.push("");
  return arr.slice(0, len);
}

export function readSlotNumberArray(
  data: Record<string, any>,
  key: string,
  len: number
): number[] {
  const raw = data[key];
  const arr = Array.isArray(raw)
    ? raw.map((item) => {
        const n = Number(item);
        return Number.isFinite(n) && n > 0 ? n : 0;
      })
    : [];
  while (arr.length < len) arr.push(0);
  return arr.slice(0, len);
}

export function applyGenerationSlotValue(
  data: Record<string, any>,
  field: string,
  value: string,
  fileId?: string,
  durationSeconds?: number
): Record<string, any> {
  const dot = field.indexOf(".");
  if (dot > 0) {
    const base = field.slice(0, dot);
    const idx = Number(field.slice(dot + 1));
    const meta = SLOT_ARRAYS[base];
    if (meta && Number.isInteger(idx) && idx >= 0 && idx < meta.len) {
      const urls = readSlotArray(data, base, meta.len);
      const ids = readSlotArray(data, meta.ids, meta.len);
      urls[idx] = value;
      ids[idx] = fileId ?? "";
      const next: Record<string, any> = { ...data, [base]: urls, [meta.ids]: ids };
      if (meta.durations) {
        const durs = readSlotNumberArray(data, meta.durations, meta.len);
        const trimmed = value.trim();
        durs[idx] =
          trimmed && durationSeconds != null && durationSeconds > 0
            ? durationSeconds
            : 0;
        next[meta.durations] = durs;
      }
      return next;
    }
  }
  const idKey = SCALAR_FILE[field];
  if (idKey) {
    return { ...data, [field]: value, [idKey]: fileId ?? "" };
  }
  return { ...data, [field]: value };
}

export function isGenerationSlotField(field: string): boolean {
  if (SCALAR_FILE[field]) return true;
  return Boolean(SLOT_ARRAYS[field.split(".")[0]]);
}

export function mediaKindForField(
  field: string
): "image" | "video" | "audio" {
  const lower = field.toLowerCase();
  if (lower.includes("audio")) return "audio";
  if (lower.includes("video")) return "video";
  return "image";
}

type SharedProps = {
  data: Record<string, any>;
  nodeId: string;
  error: string | null;
  showVariablePickerFor: string | null;
  setShowVariablePickerFor: (field: string | null) => void;
  onPatch: (updates: Record<string, any>) => void;
  onOpenMediaPicker?: (nodeId: string, field: string) => void;
};

function MediaSlotField({
  field,
  label,
  need = "optional",
  value,
  accept,
  nodeId,
  accentClass,
  placeholder,
  showVariablePickerFor,
  setShowVariablePickerFor,
  onPatch,
  data,
  onOpenMediaPicker,
}: {
  field: string;
  label: string;
  need?: SocialFieldNeed;
  value: string;
  accept: "image" | "video" | "audio";
  nodeId: string;
  accentClass: string;
  placeholder: string;
  showVariablePickerFor: string | null;
  setShowVariablePickerFor: (field: string | null) => void;
  onPatch: (updates: Record<string, any>) => void;
  data: Record<string, any>;
  onOpenMediaPicker?: (nodeId: string, field: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const fileAccept =
    accept === "video"
      ? "video/*"
      : accept === "audio"
        ? "audio/*"
        : "image/*";

  const setValue = (next: string, fileId?: string, durationSeconds?: number) => {
    onPatch(applyGenerationSlotValue(data, field, next, fileId, durationSeconds));
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-1">
        <label className="font-medium text-zinc-700 dark:text-zinc-300">
          <FieldNeedLabel label={label} need={need} />
        </label>
        <div className="flex items-center gap-1">
          <input
            ref={inputRef}
            type="file"
            accept={fileAccept}
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setUploading(true);
              try {
                const uploaded = await uploadFile(file);
                const url = await getCachedFileMediaUrl(uploaded.id, "preview");
                setValue(
                  url,
                  uploaded.id,
                  uploaded.media_metadata?.duration_seconds
                );
              } catch {
                setValue("");
              } finally {
                setUploading(false);
              }
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 disabled:opacity-50"
          >
            <Upload className="h-2.5 w-2.5" />
            {uploading ? "…" : "Файл"}
          </button>
          <button
            type="button"
            onClick={() => onOpenMediaPicker?.(nodeId, field)}
            className="flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
          >
            <Folder className="h-2.5 w-2.5" />
            Медиатека
          </button>
          <button
            type="button"
            onClick={() =>
              setShowVariablePickerFor(
                showVariablePickerFor === field ? null : field
              )
            }
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${accentClass}`}
          >
            <Variable className="h-3 w-3" />
            Переменная
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => setValue("")}
              className="rounded p-0.5 text-zinc-400 hover:text-zinc-700"
              title="Очистить"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        {...varDropAttrs(field, accept === "audio" ? "any" : accept)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs font-mono"
      />
      <WorkflowMediaPreview url={value} />
    </div>
  );
}

export function WorkflowAIImageFields({
  data,
  nodeId,
  error,
  showVariablePickerFor,
  setShowVariablePickerFor,
  onPatch,
  onOpenMediaPicker,
}: SharedProps) {
  const mode = (data.mode || "text-to-image") as GenerationModeId;
  const aspect = (data.aspectRatio || "1:1") as AspectRatioId;
  const combineImages = readSlotArray(data, "combineImages", COMBINE_PHOTO_SLOTS);
  const accent =
    "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100";

  return (
    <div className="space-y-3">
      <SocialRequirementsBanner
        error={error}
        hint="Те же режимы и форматы, что в разделе генерации картинок."
      />

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-zinc-400">
          Режим
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {generationModes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPatch({ mode: item.id })}
              className={`rounded-xl border px-2.5 py-1.5 text-left transition ${
                mode === item.id
                  ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50"
                  : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              }`}
            >
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100">
                {item.label}
              </p>
              <p className="text-[10px] text-zinc-500">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="font-medium text-zinc-700 dark:text-zinc-300">
            <FieldNeedLabel label="Промпт" need="required" />
          </label>
          <button
            type="button"
            onClick={() =>
              setShowVariablePickerFor(
                showVariablePickerFor === "prompt" ? null : "prompt"
              )
            }
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${accent}`}
          >
            <Variable className="h-3 w-3" />
            Переменная
          </button>
        </div>
        <textarea
          rows={3}
          value={data.prompt || ""}
          onChange={(e) => onPatch({ prompt: e.target.value })}
          {...varDropAttrs("prompt")}
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
          placeholder={promptPlaceholders[mode]}
        />
      </div>

      {mode === "image-to-image" && (
        <MediaSlotField
          field="sourceImage"
          label="Исходное фото"
          need="required"
          value={data.sourceImage || data.referenceImage || ""}
          accept="image"
          nodeId={nodeId}
          accentClass={accent}
          placeholder="{{ files_media_1.image_url }} или файл"
          showVariablePickerFor={showVariablePickerFor}
          setShowVariablePickerFor={setShowVariablePickerFor}
          onPatch={onPatch}
          data={data}
          onOpenMediaPicker={onOpenMediaPicker}
        />
      )}

      {mode === "combine" && (
        <div className="space-y-2">
          <p className="text-[10px] text-zinc-500">
            Нужны минимум 2 фото. Можно перетащить выход предыдущей ноды или выбрать файл.
          </p>
          {combineImages.map((value, idx) => (
            <MediaSlotField
              key={idx}
              field={`combineImages.${idx}`}
              label={`Фото ${idx + 1}`}
              need={idx < 2 ? "required" : "optional"}
              value={value}
              accept="image"
              nodeId={nodeId}
              accentClass={accent}
              placeholder={`{{ ai_image_${idx + 1}.image_url }}`}
              showVariablePickerFor={showVariablePickerFor}
              setShowVariablePickerFor={setShowVariablePickerFor}
              onPatch={onPatch}
              data={data}
              onOpenMediaPicker={onOpenMediaPicker}
            />
          ))}
        </div>
      )}

      <AspectRatioPicker
        value={aspect}
        onChange={(value) => onPatch({ aspectRatio: value })}
        ratios={aspectRatios}
        columnsClassName="grid-cols-4"
      />
    </div>
  );
}

export function WorkflowAIVideoFields({
  data,
  nodeId,
  error,
  showVariablePickerFor,
  setShowVariablePickerFor,
  onPatch,
  onOpenMediaPicker,
}: SharedProps) {
  const mode = (data.mode || "text-to-video") as VideoGenerationModeId;
  const aspect = (data.aspectRatio || "16:9") as VideoAspectRatioId;
  const duration = Number(data.durationSeconds || 5);
  const referenceImages = readSlotArray(data, "referenceImages", REFERENCE_IMAGE_MAX);
  const referenceVideos = readSlotArray(data, "referenceVideos", REFERENCE_VIDEO_MAX);
  const referenceAudios = readSlotArray(data, "referenceAudios", REFERENCE_AUDIO_MAX);
  const accent =
    "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100";

  return (
    <div className="space-y-3">
      <SocialRequirementsBanner
        error={error}
        hint="Те же режимы, кадры и длительность, что в разделе генерации видео."
      />

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-zinc-400">
          Режим
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {videoGenerationModes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPatch({ mode: item.id })}
              className={`rounded-xl border px-2.5 py-1.5 text-left transition ${
                mode === item.id
                  ? "border-pink-600 bg-pink-50 dark:bg-pink-950/40"
                  : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              }`}
            >
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-100">
                {item.label}
              </p>
              <p className="text-[10px] text-zinc-500">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="font-medium text-zinc-700 dark:text-zinc-300">
            <FieldNeedLabel label="Промпт / сценарий" need="required" />
          </label>
          <button
            type="button"
            onClick={() =>
              setShowVariablePickerFor(
                showVariablePickerFor === "prompt" ? null : "prompt"
              )
            }
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${accent}`}
          >
            <Variable className="h-3 w-3" />
            Переменная
          </button>
        </div>
        <textarea
          rows={3}
          value={data.prompt || ""}
          onChange={(e) => onPatch({ prompt: e.target.value })}
          {...varDropAttrs("prompt")}
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-2.5 text-xs focus:border-indigo-500 focus:outline-none"
          placeholder={videoPromptPlaceholders[mode]}
        />
      </div>

      {mode === "image-to-video" && (
        <div className="space-y-2">
          <MediaSlotField
            field="firstFrame"
            label="Первый кадр"
            need="one_of"
            value={data.firstFrame || ""}
            accept="image"
            nodeId={nodeId}
            accentClass={accent}
            placeholder="{{ ai_image_1.image_url }}"
            showVariablePickerFor={showVariablePickerFor}
            setShowVariablePickerFor={setShowVariablePickerFor}
            onPatch={onPatch}
            data={data}
            onOpenMediaPicker={onOpenMediaPicker}
          />
          <MediaSlotField
            field="lastFrame"
            label="Последний кадр"
            need="one_of"
            value={data.lastFrame || ""}
            accept="image"
            nodeId={nodeId}
            accentClass={accent}
            placeholder="{{ ai_image_2.image_url }}"
            showVariablePickerFor={showVariablePickerFor}
            setShowVariablePickerFor={setShowVariablePickerFor}
            onPatch={onPatch}
            data={data}
            onOpenMediaPicker={onOpenMediaPicker}
          />
        </div>
      )}

      {mode === "reference-to-video" && (
        <div className="space-y-2">
          <p className="text-[10px] text-zinc-500">
            Нужен хотя бы один референс: фото или видео. Аудио необязательно.
          </p>
          {referenceImages.map((value, idx) => (
            <MediaSlotField
              key={`img-${idx}`}
              field={`referenceImages.${idx}`}
              label={`Референс фото ${idx + 1}`}
              need={idx === 0 ? "one_of" : "optional"}
              value={value}
              accept="image"
              nodeId={nodeId}
              accentClass={accent}
              placeholder="{{ files_media_1.image_url }}"
              showVariablePickerFor={showVariablePickerFor}
              setShowVariablePickerFor={setShowVariablePickerFor}
              onPatch={onPatch}
              data={data}
              onOpenMediaPicker={onOpenMediaPicker}
            />
          ))}
          {referenceVideos.map((value, idx) => (
            <MediaSlotField
              key={`vid-${idx}`}
              field={`referenceVideos.${idx}`}
              label={`Референс видео ${idx + 1}`}
              need="one_of"
              value={value}
              accept="video"
              nodeId={nodeId}
              accentClass={accent}
              placeholder="{{ ai_video_1.video_url }}"
              showVariablePickerFor={showVariablePickerFor}
              setShowVariablePickerFor={setShowVariablePickerFor}
              onPatch={onPatch}
              data={data}
              onOpenMediaPicker={onOpenMediaPicker}
            />
          ))}
          {referenceAudios.map((value, idx) => (
            <MediaSlotField
              key={`aud-${idx}`}
              field={`referenceAudios.${idx}`}
              label={`Референс аудио ${idx + 1}`}
              need="optional"
              value={value}
              accept="audio"
              nodeId={nodeId}
              accentClass={accent}
              placeholder="Файл или переменная"
              showVariablePickerFor={showVariablePickerFor}
              setShowVariablePickerFor={setShowVariablePickerFor}
              onPatch={onPatch}
              data={data}
              onOpenMediaPicker={onOpenMediaPicker}
            />
          ))}
        </div>
      )}

      <AspectRatioPicker
        value={aspect}
        onChange={(value) => onPatch({ aspectRatio: value })}
        ratios={videoAspectRatios}
        columnsClassName="grid-cols-3"
      />

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            Длительность
          </p>
          <span className="text-[12px] font-medium tabular-nums">
            {duration} сек
          </span>
        </div>
        <input
          type="range"
          min={VIDEO_DURATION_MIN}
          max={VIDEO_DURATION_MAX}
          step={1}
          value={duration}
          onChange={(e) =>
            onPatch({ durationSeconds: Number(e.target.value) })
          }
          className="mt-2 w-full accent-indigo-600"
        />
        <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
          <span>{VIDEO_DURATION_MIN} сек</span>
          <span>{VIDEO_DURATION_MAX} сек</span>
        </div>
      </div>
    </div>
  );
}
