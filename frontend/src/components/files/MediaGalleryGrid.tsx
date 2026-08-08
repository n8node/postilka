"use client";

import { cn } from "@/lib/utils";
import type { WorkspaceFile } from "@/lib/files-api";
import { getFileDuration } from "@/lib/file-media";
import { FileThumbnail } from "@/components/files/FileThumbnail";

export type MediaGridMode = "compact" | "large";

type Props = {
  files: WorkspaceFile[];
  mode: MediaGridMode;
  selected: Set<string>;
  previewFileId?: string | null;
  onOpen: (file: WorkspaceFile) => void;
  onToggleSelect: (id: string) => void;
  appearIds: Set<string>;
};

export function MediaGalleryGrid({
  files,
  mode,
  selected,
  previewFileId,
  onOpen,
  onToggleSelect,
  appearIds,
}: Props) {
  const gridClass =
    mode === "compact"
      ? "grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7"
      : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

  const thumbSize = mode === "compact" ? "sm" : "lg";

  return (
    <div className={gridClass}>
      {files.map((f) => {
        const duration = getFileDuration(f);
        const isSelected = selected.has(f.id);
        const isPreview = previewFileId === f.id;

        return (
          <div
            key={f.id}
            className={cn(
              "group relative",
              appearIds.has(f.id) && "file-burst-appear",
            )}
          >
            <button
              type="button"
              onClick={() => onOpen(f)}
              className="block w-full text-left"
            >
              <FileThumbnail
                fileId={f.id}
                name={f.name}
                mimeType={f.mime_type}
                durationSeconds={duration}
                size={thumbSize}
                selected={isPreview}
              />
              {mode === "large" && (
                <p className="mt-1.5 truncate text-sm font-medium">{f.name}</p>
              )}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(f.id);
              }}
              className={cn(
                "absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-surface/90 shadow-sm transition-colors",
                isSelected ? "border-accent bg-accent" : "border-white/90 hover:border-accent/70",
              )}
              aria-label="Выбрать файл"
            >
              {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
            </button>

            {mode === "compact" && (
              <p className="mt-1 truncate text-[11px] text-muted">{f.name}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
