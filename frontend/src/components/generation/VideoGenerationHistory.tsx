"use client";

import { useMemo, useState } from "react";
import { Check, Play } from "lucide-react";
import type { VideoGenerationHistoryItem } from "@/lib/video-generation-data";
import { mediaUrl } from "@/lib/media-display";
import { ProtectedMediaImage } from "@/components/media/ProtectedMediaImage";
import { cn } from "@/lib/utils";

type VideoGenerationHistoryProps = {
  items: VideoGenerationHistoryItem[];
  onSelect?: (item: VideoGenerationHistoryItem) => void;
  onDelete?: (ids: string[]) => Promise<void>;
};

export function VideoGenerationHistory({
  items,
  onSelect,
  onDelete,
}: VideoGenerationHistoryProps) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const selectableItems = useMemo(
    () => items.filter((item) => !item.usedInPost),
    [items],
  );

  const selectedCount = selectedIds.size;

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setDeleteError(null);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!onDelete || selectedCount === 0 || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete([...selectedIds]);
      exitSelectMode();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Не удалось удалить выбранные видео",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted">
          История видео
        </p>
        {selectableItems.length > 0 && onDelete ? (
          <div className="flex items-center gap-2">
            {selectMode ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={selectedCount === 0 || deleting}
                  className="text-[11px] font-medium text-red-600 disabled:opacity-40"
                >
                  {deleting ? "Удаление…" : `Удалить (${selectedCount})`}
                </button>
                <button
                  type="button"
                  onClick={exitSelectMode}
                  className="text-[11px] font-medium text-muted"
                >
                  Отмена
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setSelectMode(true)}
                className="text-[11px] font-medium text-muted hover:text-text"
              >
                Выбрать
              </button>
            )}
          </div>
        ) : null}
      </div>

      {deleteError ? (
        <p className="mb-2 text-[12px] text-red-600">{deleteError}</p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-[12px] text-zinc-400">История пуста</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => {
            const selected = selectedIds.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (selectMode) {
                    toggleSelected(item.id);
                    return;
                  }
                  onSelect?.(item);
                }}
                className={cn(
                  "group relative aspect-[4/3] overflow-hidden rounded-lg border bg-zinc-100 text-left",
                  selectMode && selected
                    ? "border-blue-400 ring-2 ring-blue-200"
                    : "border-border hover:border-blue-200",
                )}
              >
                <div className="relative h-full w-full bg-zinc-900/5">
                  {item.thumbUrl ? (
                    <ProtectedMediaImage
                      url={mediaUrl(item.thumbUrl)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Play
                        size={24}
                        className="text-zinc-400 group-hover:text-accent"
                      />
                    </div>
                  )}
                  {item.thumbUrl ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/15 opacity-0 transition-opacity group-hover:opacity-100">
                      <Play size={22} className="text-white drop-shadow" />
                    </span>
                  ) : null}
                </div>
                {selectMode && selected ? (
                  <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                    <Check size={12} />
                  </span>
                ) : null}
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-6 text-[10px] text-white">
                  {item.prompt}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function videoHistoryThumbSrc(item: VideoGenerationHistoryItem): string {
  if (item.thumbUrl) return mediaUrl(item.thumbUrl);
  return mediaUrl(item.videoUrl);
}
