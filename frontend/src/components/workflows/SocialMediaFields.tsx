"use client";

import { Folder, Variable } from "lucide-react";
import { WorkflowMediaPreview } from "./WorkflowMediaPreview";
import { varDropAttrs } from "./variableDrag";
import type { SocialFieldNeed } from "./nodeTypes";

function NeedBadge({ need }: { need: SocialFieldNeed }) {
  if (need === "required") {
    return (
      <span className="rounded bg-red-50 dark:bg-red-950/50 px-1.5 py-px text-[9px] font-semibold text-red-600 dark:text-red-400">
        обязательно
      </span>
    );
  }
  if (need === "one_of") {
    return (
      <span className="rounded bg-amber-50 dark:bg-amber-950/50 px-1.5 py-px text-[9px] font-medium text-amber-700 dark:text-amber-400">
        нужно одно из
      </span>
    );
  }
  return (
    <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-px text-[9px] font-normal text-zinc-500">
      необязательно
    </span>
  );
}

export function SocialRequirementsBanner({
  error,
  hint,
}: {
  error: string | null;
  hint: string;
}) {
  if (error) {
    return (
      <div className="rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/90 dark:bg-amber-950/40 px-3 py-2 text-[11px] font-medium text-amber-900 dark:text-amber-200">
        {error}
      </div>
    );
  }
  return (
    <p className="text-[10px] leading-relaxed text-zinc-500">{hint}</p>
  );
}

export function FieldNeedLabel({
  label,
  need,
}: {
  label: string;
  need: SocialFieldNeed;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span>{label}</span>
      <NeedBadge need={need} />
    </span>
  );
}

interface SocialMediaFieldsProps {
  data: Record<string, any>;
  nodeId: string;
  showImage?: boolean;
  showVideo?: boolean;
  imageNeed?: SocialFieldNeed;
  videoNeed?: SocialFieldNeed;
  imageLabel?: string;
  videoLabel?: string;
  accentClass?: string;
  showVariablePickerFor: string | null;
  setShowVariablePickerFor: (field: string | null) => void;
  onFieldChange: (key: string, value: string) => void;
  onOpenMediaPicker?: (nodeId: string, field: string) => void;
}

export function SocialMediaFields({
  data,
  nodeId,
  showImage = true,
  showVideo = true,
  imageNeed = "optional",
  videoNeed = "optional",
  imageLabel = "Фото",
  videoLabel = "Видео",
  accentClass = "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200",
  showVariablePickerFor,
  setShowVariablePickerFor,
  onFieldChange,
  onOpenMediaPicker,
}: SocialMediaFieldsProps) {
  const imageValue = data.imageUrl || "";
  const videoValue = data.videoUrl || "";

  return (
    <div className="space-y-3">
      {showImage && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="font-medium text-zinc-700 dark:text-zinc-300">
              <FieldNeedLabel label={imageLabel} need={imageNeed} />
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenMediaPicker?.(nodeId, "imageUrl")}
                className="flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
              >
                <Folder className="h-2.5 w-2.5" />
                Медиатека
              </button>
              <button
                type="button"
                onClick={() =>
                  setShowVariablePickerFor(
                    showVariablePickerFor === "imageUrl" ? null : "imageUrl"
                  )
                }
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${accentClass}`}
              >
                <Variable className="h-3 w-3" />
                Переменная
              </button>
            </div>
          </div>
          <input
            type="text"
            value={imageValue}
            onChange={(e) => onFieldChange("imageUrl", e.target.value)}
            {...varDropAttrs("imageUrl", "image")}
            placeholder="{{ files_media_1.image_url }} или https://..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs font-mono"
          />
          <WorkflowMediaPreview url={imageValue} fileName={data.fileName} />
        </div>
      )}

      {showVideo && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="font-medium text-zinc-700 dark:text-zinc-300">
              <FieldNeedLabel label={videoLabel} need={videoNeed} />
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenMediaPicker?.(nodeId, "videoUrl")}
                className="flex items-center gap-1 rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
              >
                <Folder className="h-2.5 w-2.5" />
                Медиатека
              </button>
              <button
                type="button"
                onClick={() =>
                  setShowVariablePickerFor(
                    showVariablePickerFor === "videoUrl" ? null : "videoUrl"
                  )
                }
                className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${accentClass}`}
              >
                <Variable className="h-3 w-3" />
                Переменная
              </button>
            </div>
          </div>
          <input
            type="text"
            value={videoValue}
            onChange={(e) => onFieldChange("videoUrl", e.target.value)}
            {...varDropAttrs("videoUrl", "video")}
            placeholder="{{ files_media_1.video_url }} или https://..."
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 px-3 py-1.5 text-xs font-mono"
          />
          <WorkflowMediaPreview url={videoValue} fileName={data.fileName} />
        </div>
      )}
    </div>
  );
}
