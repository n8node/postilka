"use client";

import React from "react";
import { Image as ImageIcon, Film } from "lucide-react";

function isLikelyImage(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(lower) ||
    lower.includes("/image") ||
    lower.includes("unsplash") ||
    lower.includes("photo")
  );
}

function isLikelyVideo(url: string): boolean {
  const lower = url.toLowerCase();
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(lower) || lower.includes("/video");
}

type WorkflowMediaPreviewProps = {
  url?: string;
  fileName?: string;
  className?: string;
};

export function WorkflowMediaPreview({
  url,
  fileName,
  className = "",
}: WorkflowMediaPreviewProps) {
  const trimmed = (url || "").trim();
  if (!trimmed || trimmed.includes("{{")) {
    return null;
  }

  const image = isLikelyImage(trimmed);
  const video = isLikelyVideo(trimmed);

  return (
    <div
      className={`mt-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 ${className}`}
    >
      <div className="flex items-center gap-1.5 border-b border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 text-[10px] font-medium text-zinc-500">
        {video ? <Film className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
        <span className="truncate">{fileName || "Предпросмотр медиа"}</span>
      </div>
      <div className="flex max-h-40 items-center justify-center bg-black/5 dark:bg-black/20 p-2">
        {video ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={trimmed}
            controls
            className="max-h-36 max-w-full rounded-lg object-contain"
          />
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmed}
            alt={fileName || "Предпросмотр"}
            className="max-h-36 max-w-full rounded-lg object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmed}
            alt={fileName || "Предпросмотр"}
            className="max-h-36 max-w-full rounded-lg object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </div>
    </div>
  );
}

const BUTTON_STYLES = [
  { value: "default", className: "bg-zinc-400 ring-zinc-500" },
  { value: "primary", className: "bg-blue-500 ring-blue-600" },
  { value: "success", className: "bg-emerald-500 ring-emerald-600" },
  { value: "danger", className: "bg-red-500 ring-red-600" },
] as const;

type ButtonStylePickerProps = {
  value: string;
  onChange: (style: string) => void;
};

export function ButtonStylePicker({ value, onChange }: ButtonStylePickerProps) {
  return (
    <div className="flex shrink-0 items-center gap-1" title="Цвет кнопки">
      {BUTTON_STYLES.map((style) => (
        <button
          key={style.value}
          type="button"
          onClick={() => onChange(style.value)}
          className={`h-5 w-5 rounded-full ${style.className} transition ${
            (value || "default") === style.value
              ? "ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900"
              : "opacity-70 hover:opacity-100"
          }`}
          aria-label={style.value}
        />
      ))}
    </div>
  );
}
